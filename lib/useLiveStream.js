"use client";

// WebRTC-Mesh-Hook für Live-Streams.
// Host:    Publisht lokales Video/Audio an alle Peers (Viewers + Cohosts).
// Viewer:  Empfängt vom Host (Solo) bzw. allen Hosts (Multi).
// Signaling läuft per SSE-„rtc"-Events (siehe /api/live/[id]/signal + /stream).

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export function useLiveStream({ streamId, isHost, meId, hostIds, hasVideo, hasAudio, sseRef }) {
  const localStreamRef = useRef(null);
  const peerConns = useRef(new Map());      // remoteUserId -> RTCPeerConnection
  const remoteStreamsRef = useRef(new Map()); // remoteUserId -> MediaStream
  const [remoteVersion, setRemoteVersion] = useState(0); // forceUpdate
  const [localReady, setLocalReady] = useState(false);
  const [error, setError] = useState("");

  // Lokales Media holen (nur Hosts)
  useEffect(() => {
    if (!isHost) return;
    let cancelled = false;
    (async () => {
      try {
        const constraints = {
          video: hasVideo ? { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24 } } : false,
          audio: hasAudio,
        };
        const ms = await navigator.mediaDevices.getUserMedia(constraints);
        if (cancelled) { ms.getTracks().forEach((t) => t.stop()); return; }
        localStreamRef.current = ms;
        setLocalReady(true);
      } catch (e) {
        setError(`Kamera/Mikro nicht verfügbar: ${e.message}`);
      }
    })();
    return () => {
      cancelled = true;
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
    };
  }, [isHost, hasVideo, hasAudio]);

  const createPeer = useCallback((remoteId, asInitiator) => {
    if (peerConns.current.has(remoteId)) return peerConns.current.get(remoteId);
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    peerConns.current.set(remoteId, pc);

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        api.liveSignal(streamId, remoteId, "ice", e.candidate.toJSON()).catch(() => {});
      }
    };
    pc.ontrack = (e) => {
      let ms = remoteStreamsRef.current.get(remoteId);
      if (!ms) { ms = new MediaStream(); remoteStreamsRef.current.set(remoteId, ms); }
      // Track ergänzen, vermeide Duplikate
      if (!ms.getTracks().includes(e.track)) ms.addTrack(e.track);
      setRemoteVersion((v) => v + 1);
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "closed") {
        peerConns.current.delete(remoteId);
        remoteStreamsRef.current.delete(remoteId);
        setRemoteVersion((v) => v + 1);
      }
    };

    // Lokale Tracks ranhängen (nur Hosts haben Local Stream)
    if (localStreamRef.current) {
      for (const t of localStreamRef.current.getTracks()) {
        pc.addTrack(t, localStreamRef.current);
      }
    }
    return pc;
  }, [streamId]);

  // Wenn Host: bei jedem neuen Host- oder Viewer-Event eine Verbindung zu denen aufbauen.
  // Das macht der Aufrufer durch Aufruf von connectTo(remoteId).
  const connectTo = useCallback(async (remoteId) => {
    if (remoteId === meId) return;
    const pc = createPeer(remoteId, true);
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await api.liveSignal(streamId, remoteId, "offer", { sdp: offer.sdp, type: offer.type });
    } catch (e) { console.warn("offer failed", e); }
  }, [createPeer, meId, streamId]);

  // SSE rtc-Events verarbeiten
  useEffect(() => {
    if (!sseRef?.current) return;
    const handler = async (env) => {
      if (env.type !== "rtc") return;
      const { fromUserId, kind, payload } = env.data;
      if (fromUserId === meId) return;
      const pc = createPeer(fromUserId, false);
      try {
        if (kind === "offer") {
          await pc.setRemoteDescription(new RTCSessionDescription(payload));
          const ans = await pc.createAnswer();
          await pc.setLocalDescription(ans);
          await api.liveSignal(streamId, fromUserId, "answer", { sdp: ans.sdp, type: ans.type });
        } else if (kind === "answer") {
          await pc.setRemoteDescription(new RTCSessionDescription(payload));
        } else if (kind === "ice") {
          await pc.addIceCandidate(new RTCIceCandidate(payload));
        } else if (kind === "bye") {
          pc.close();
          peerConns.current.delete(fromUserId);
          remoteStreamsRef.current.delete(fromUserId);
          setRemoteVersion((v) => v + 1);
        }
      } catch (e) { console.warn("rtc handle failed", kind, e); }
    };
    sseRef.current.addHandler(handler);
    return () => { sseRef.current?.removeHandler?.(handler); };
  }, [sseRef, meId, streamId, createPeer]);

  // Bye senden an alle bei Unmount
  useEffect(() => () => {
    for (const [rid, pc] of peerConns.current.entries()) {
      try { api.liveSignal(streamId, rid, "bye", {}); } catch {}
      try { pc.close(); } catch {}
    }
    peerConns.current.clear();
    remoteStreamsRef.current.clear();
  }, [streamId]);

  return {
    localStream: localStreamRef.current,
    localReady,
    error,
    remoteStreams: remoteStreamsRef.current,
    remoteVersion,
    connectTo,
  };
}
