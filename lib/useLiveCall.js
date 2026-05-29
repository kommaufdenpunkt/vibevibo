"use client";

// useLiveCall: zentrale WebRTC-Logik (Mesh, bis 6 Teilnehmer).
// Verwaltet getUserMedia, RTCPeerConnections pro Peer, Signaling über /api/rtc/signal.
// Stellt {state, controls, ringIncoming, accept, reject, startCall, leaveCall} bereit.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useMessageStream } from "@/lib/useEventStream";

const DEFAULT_ICE = [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }];

export function useLiveCall(me) {
  // Eingehender Anruf, der noch nicht angenommen wurde
  const [ringing, setRinging] = useState(null); // {callId, type, withVideo, initiator, roomId}
  // Aktiver Call
  const [activeCall, setActiveCall] = useState(null); // {id, type, withVideo, participants[], iceServers[]}
  // Remote Streams pro userId
  const [remoteStreams, setRemoteStreams] = useState({}); // {userId: MediaStream}
  // Eigene Tracks
  const [localStream, setLocalStream] = useState(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [error, setError] = useState("");

  const peerConns = useRef({});           // userId -> RTCPeerConnection
  const pendingCandidates = useRef({});   // userId -> [candidates]
  const localStreamRef = useRef(null);
  const activeCallRef = useRef(null);
  const meRef = useRef(me);
  meRef.current = me;

  const ICE_SERVERS = activeCall?.iceServers || DEFAULT_ICE;

  /* ---------- Helfer ---------- */

  const closePeer = useCallback((userId) => {
    const pc = peerConns.current[userId];
    if (pc) {
      try { pc.close(); } catch {}
      delete peerConns.current[userId];
    }
    delete pendingCandidates.current[userId];
    setRemoteStreams((prev) => { const n = { ...prev }; delete n[userId]; return n; });
  }, []);

  const cleanupAll = useCallback(() => {
    Object.keys(peerConns.current).forEach((uid) => closePeer(Number(uid)));
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }
    activeCallRef.current = null;
    setActiveCall(null);
    setRemoteStreams({});
    setError("");
  }, [closePeer]);

  const createPeerConnection = useCallback((remoteUserId, iceServers) => {
    if (peerConns.current[remoteUserId]) return peerConns.current[remoteUserId];
    const pc = new RTCPeerConnection({ iceServers });
    peerConns.current[remoteUserId] = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate && activeCallRef.current) {
        api.rtcSignal(activeCallRef.current.id, remoteUserId, "ice", e.candidate.toJSON()).catch(() => {});
      }
    };
    pc.ontrack = (e) => {
      const [stream] = e.streams;
      if (!stream) return;
      setRemoteStreams((prev) => ({ ...prev, [remoteUserId]: stream }));
    };
    pc.onconnectionstatechange = () => {
      if (["failed", "closed", "disconnected"].includes(pc.connectionState)) {
        // optional: aufräumen, aber nicht zu aggressiv (kurze disconnects bei NAT-Flap)
        if (pc.connectionState === "failed" || pc.connectionState === "closed") closePeer(remoteUserId);
      }
    };

    // Eigene Tracks anhängen
    if (localStreamRef.current) {
      for (const t of localStreamRef.current.getTracks()) pc.addTrack(t, localStreamRef.current);
    }
    return pc;
  }, [closePeer]);

  const offerTo = useCallback(async (remoteUserId, iceServers) => {
    const pc = createPeerConnection(remoteUserId, iceServers);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await api.rtcSignal(activeCallRef.current.id, remoteUserId, "offer", { sdp: offer.sdp, type: offer.type });
  }, [createPeerConnection]);

  /* ---------- Media holen ---------- */

  const acquireMedia = useCallback(async (withVideo) => {
    const constraints = withVideo
      ? { audio: true, video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" } }
      : { audio: true, video: false };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    localStreamRef.current = stream;
    setLocalStream(stream);
    setMicOn(true); setCamOn(withVideo);
    return stream;
  }, []);

  /* ---------- Public: Anruf starten ---------- */

  const startCall = useCallback(async ({ type, partnerUsername, roomId, withVideo = true }) => {
    setError("");
    if (activeCallRef.current) throw new Error("Du bist bereits in einem Anruf.");
    try {
      await acquireMedia(withVideo);
    } catch (e) {
      setError("Mikrofon/Kamera-Zugriff verweigert.");
      cleanupAll();
      throw e;
    }
    try {
      const { call } = await api.startCall({ type, partnerUsername, roomId, withVideo });
      // Direkt selbst joinen → bekommt die ICE-Server vom Server
      const { call: joined, iceServers } = await api.joinCall(call.id);
      const next = { ...joined, iceServers: iceServers || DEFAULT_ICE };
      activeCallRef.current = next;
      setActiveCall(next);
      // Initiator wartet, dass andere joinen – Peers werden bei "call-peer-joined" angelegt
    } catch (e) {
      cleanupAll();
      throw e;
    }
  }, [acquireMedia, cleanupAll]);

  /* ---------- Public: Eingehenden Anruf annehmen / ablehnen ---------- */

  const accept = useCallback(async () => {
    if (!ringing) return;
    const ring = ringing;
    setRinging(null);
    try {
      await acquireMedia(ring.withVideo);
    } catch (e) {
      setError("Mikrofon/Kamera-Zugriff verweigert.");
      cleanupAll();
      // Anruf ablehnen
      try { await api.leaveCall(ring.callId); } catch {}
      return;
    }
    try {
      const { call: joined, iceServers } = await api.joinCall(ring.callId);
      const next = { ...joined, iceServers: iceServers || DEFAULT_ICE };
      activeCallRef.current = next;
      setActiveCall(next);
      // Existierende Peers initiieren das Offer (wir warten)
      // Da Polite-Peer-Logik: alle existierenden (außer ich) → die mit kleinerer ID schickt Offer.
      // Server-seitig hat der Initiator (kleinere joined_at) das Offer-Recht.
      // Hier reicht: wir warten auf SSE "rtc"-Offer.
    } catch (e) {
      setError(e.message || "Beitritt fehlgeschlagen.");
      cleanupAll();
    }
  }, [ringing, acquireMedia, cleanupAll]);

  const reject = useCallback(async () => {
    if (!ringing) return;
    const cid = ringing.callId;
    setRinging(null);
    try { await api.leaveCall(cid); } catch {}
  }, [ringing]);

  /* ---------- Public: Aktiven Call verlassen ---------- */

  const leaveCall = useCallback(async () => {
    const c = activeCallRef.current;
    if (!c) return;
    try { await api.leaveCall(c.id); } catch {}
    cleanupAll();
  }, [cleanupAll]);

  /* ---------- Controls ---------- */

  const toggleMic = useCallback(() => {
    const s = localStreamRef.current; if (!s) return;
    for (const t of s.getAudioTracks()) t.enabled = !t.enabled;
    setMicOn((v) => !v);
  }, []);
  const toggleCam = useCallback(() => {
    const s = localStreamRef.current; if (!s) return;
    for (const t of s.getVideoTracks()) t.enabled = !t.enabled;
    setCamOn((v) => !v);
  }, []);

  /* ---------- SSE-Handler ---------- */

  const onCallIncoming = useCallback((data) => {
    // Wenn man selbst initiator ist, NICHT klingeln. Sonst dialog setzen.
    if (activeCallRef.current) return;
    if (data.initiator?.id === meRef.current?.id) return;
    setRinging(data);
    // Klingeln-Sound (separat in MessageNotifier umgesetzt? Hier reicht Browser-Mute)
  }, []);

  const onCallPeerJoined = useCallback(async (data) => {
    const c = activeCallRef.current;
    if (!c || c.id !== data.callId) return;
    const peer = data.peer;
    if (!peer || peer.id === meRef.current?.id) return;
    // Polite-Peer: Wer früher dabei war (also "ich", weil event bedeutet "neuer Peer"),
    // initiiert das Offer.
    try {
      await offerTo(peer.id, c.iceServers);
    } catch (e) { console.warn("Offer fehlgeschlagen", e); }
    // Teilnehmerliste aktualisieren
    setActiveCall((cur) => cur ? { ...cur, participants: [...cur.participants, peer] } : cur);
  }, [offerTo]);

  const onCallPeerLeft = useCallback((data) => {
    const c = activeCallRef.current;
    if (!c || c.id !== data.callId) return;
    closePeer(data.userId);
    setActiveCall((cur) => cur ? { ...cur, participants: cur.participants.filter((p) => p.id !== data.userId) } : cur);
  }, [closePeer]);

  const onCallEnded = useCallback((data) => {
    if (ringing?.callId === data.callId) setRinging(null);
    const c = activeCallRef.current;
    if (!c || c.id !== data.callId) return;
    if (data?.reason === "fidolin") setError(`Anruf beendet: Fidolin hat einen Verstoß erkannt (${data.detail || "Inhalt"}).`);
    cleanupAll();
  }, [cleanupAll, ringing]);

  const onRtc = useCallback(async (envelope) => {
    const c = activeCallRef.current;
    if (!c || c.id !== envelope.callId) return;
    const from = envelope.fromUserId;
    const pc = createPeerConnection(from, c.iceServers);
    try {
      if (envelope.type === "offer") {
        await pc.setRemoteDescription(envelope.payload);
        // gepufferte Kandidaten anwenden
        for (const cand of (pendingCandidates.current[from] || [])) {
          try { await pc.addIceCandidate(cand); } catch {}
        }
        pendingCandidates.current[from] = [];
        const ans = await pc.createAnswer();
        await pc.setLocalDescription(ans);
        await api.rtcSignal(c.id, from, "answer", { sdp: ans.sdp, type: ans.type });
      } else if (envelope.type === "answer") {
        await pc.setRemoteDescription(envelope.payload);
      } else if (envelope.type === "ice") {
        if (pc.remoteDescription) {
          try { await pc.addIceCandidate(envelope.payload); } catch {}
        } else {
          pendingCandidates.current[from] = pendingCandidates.current[from] || [];
          pendingCandidates.current[from].push(envelope.payload);
        }
      } else if (envelope.type === "bye") {
        closePeer(from);
      }
    } catch (e) {
      console.warn("RTC-Signal Fehler", envelope.type, e);
    }
  }, [createPeerConnection, closePeer]);

  useMessageStream(!!me, {
    onCallIncoming, onCallPeerJoined, onCallPeerLeft, onCallEnded, onRtc,
  });

  /* ---------- Fidolin-Stichproben alle 30s ---------- */

  useEffect(() => {
    if (!activeCall || !activeCall.withVideo) return;
    const tick = async () => {
      const s = localStreamRef.current;
      if (!s) return;
      const v = s.getVideoTracks()[0];
      if (!v || !v.enabled) return;
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 320; canvas.height = 240;
        // Live-Frame zeichnen via Video-Element-Snapshot
        const tmpVideo = document.createElement("video");
        tmpVideo.srcObject = s;
        tmpVideo.muted = true;
        await tmpVideo.play().catch(() => {});
        canvas.getContext("2d").drawImage(tmpVideo, 0, 0, canvas.width, canvas.height);
        const url = canvas.toDataURL("image/jpeg", 0.6);
        tmpVideo.pause(); tmpVideo.srcObject = null;
        const res = await api.moderateCallFrame(activeCall.id, url);
        if (res?.block) {
          setError(`Anruf beendet: ${res.reason || "Verstoß"}`);
          cleanupAll();
        }
      } catch (e) { /* ignore */ }
    };
    // Erste Prüfung erst nach 15s (Kalibrierung), dann alle 30s
    const t1 = setTimeout(tick, 15_000);
    const t2 = setInterval(tick, 30_000);
    return () => { clearTimeout(t1); clearInterval(t2); };
  }, [activeCall, cleanupAll]);

  /* ---------- Beim Unmount aufräumen ---------- */

  useEffect(() => () => cleanupAll(), [cleanupAll]);

  return useMemo(() => ({
    ringing, activeCall, remoteStreams, localStream,
    micOn, camOn, error,
    accept, reject, startCall, leaveCall, toggleMic, toggleCam,
    dismissError: () => setError(""),
  }), [ringing, activeCall, remoteStreams, localStream, micOn, camOn, error, accept, reject, startCall, leaveCall, toggleMic, toggleCam]);
}
