"use client";

// Globaler Mount für Live-Calls:
// - Lauscht auf eingehende Anrufe
// - Zeigt Klingel-Dialog
// - Zeigt Anruf-Fenster (MSN-Webcam-Look)
// - Stellt window.dispatchEvent("vv-start-call", {detail: {...}}) bereit, damit
//   Buttons in anderen Komponenten Anrufe starten können.

import { useCallback, useEffect, useRef } from "react";
import { useMe } from "@/lib/useMe";
import { useLiveCall } from "@/lib/useLiveCall";
import Avatar from "./Avatar";

function VideoTile({ stream, name, avatarUrl, isLocal, muted = false, big = false, label }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream;
      ref.current.muted = isLocal || muted;
      ref.current.play().catch(() => {});
    }
  }, [stream, isLocal, muted]);

  const hasVideo = !!stream?.getVideoTracks?.()?.some((t) => t.readyState === "live" && t.enabled);

  return (
    <div style={{
      position: "relative",
      background: "#0a1432",
      borderRadius: 10,
      overflow: "hidden",
      border: "3px solid #ff3e9d",
      boxShadow: big
        ? "0 0 0 1px #fff, 0 12px 30px rgba(255,62,157,0.35)"
        : "0 0 0 1px #fff, 0 4px 10px rgba(0,0,0,0.4)",
      aspectRatio: "4 / 3",
      width: "100%",
    }}>
      <video ref={ref} playsInline autoPlay style={{
        width: "100%", height: "100%", objectFit: "cover",
        transform: isLocal ? "scaleX(-1)" : "none",
        display: hasVideo ? "block" : "none",
      }} />
      {!hasVideo && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
          <div style={{ textAlign: "center" }}>
            <Avatar url={avatarUrl} name={name} className="vv-avatar" style={{ width: 64, height: 64, margin: "0 auto 6px" }} />
            <div style={{ fontSize: 12, opacity: 0.9 }}>{name || "—"}</div>
            <div style={{ fontSize: 10, opacity: 0.7 }}>🎙️ nur Audio</div>
          </div>
        </div>
      )}
      <div style={{
        position: "absolute", left: 6, bottom: 6, background: "rgba(0,0,0,0.55)", color: "#fff",
        padding: "2px 7px", fontSize: 11, borderRadius: 6, fontFamily: "Arial, sans-serif",
      }}>
        {isLocal ? "📷 Du" : (label || name || "")}
      </div>
    </div>
  );
}

function IncomingDialog({ ring, onAccept, onReject }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 14 }}>
      <div style={{ background: "linear-gradient(180deg, #5fb0ff 0%, #2d7dd2 70%, #1f5fa8 100%)", color: "#fff", borderRadius: 16, padding: 22, maxWidth: 360, width: "100%", fontFamily: "Arial, sans-serif", textShadow: "0 1px 0 rgba(0,0,0,0.25)", boxShadow: "0 24px 50px rgba(0,0,0,0.45)", animation: "vv-ring 1.4s ease-in-out infinite" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 56 }}>{ring.withVideo ? "📹" : "📞"}</div>
          <div style={{ fontSize: 14, opacity: 0.95, marginTop: 6 }}>Eingehender {ring.withVideo ? "Video-Anruf" : "Anruf"}</div>
          <Avatar url={ring.initiator?.avatarUrl} name={ring.initiator?.displayName} className="vv-avatar" style={{ width: 84, height: 84, margin: "12px auto", border: "3px solid #fff" }} />
          <div style={{ fontSize: 18, fontWeight: "bold" }}>{ring.initiator?.displayName || ring.initiator?.username}</div>
          {ring.type === "group" && <div style={{ fontSize: 12, opacity: 0.9, marginTop: 4 }}>in einer Gruppe</div>}
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "center" }}>
          <button type="button" onClick={onReject}
            style={{ background: "#c2185b", color: "#fff", border: "none", borderRadius: 999, width: 56, height: 56, fontSize: 22, cursor: "pointer", boxShadow: "0 4px 10px rgba(0,0,0,0.4)" }}>
            ✕
          </button>
          <button type="button" onClick={onAccept}
            style={{ background: "#10b981", color: "#fff", border: "none", borderRadius: 999, width: 56, height: 56, fontSize: 22, cursor: "pointer", boxShadow: "0 4px 10px rgba(0,0,0,0.4)" }}>
            {ring.withVideo ? "📹" : "📞"}
          </button>
        </div>
      </div>
      <style>{`@keyframes vv-ring { 0%,100% { transform: scale(1); } 50% { transform: scale(1.025); } }`}</style>
    </div>
  );
}

function CallWindow({ call, me, localStream, remoteStreams, micOn, camOn, onToggleMic, onToggleCam, onLeave, error, dismissError }) {
  const peers = call.participants.filter((p) => p.id !== me?.id);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(8,12,32,0.92)", zIndex: 250,
      display: "flex", flexDirection: "column", padding: 14, fontFamily: "Arial, sans-serif",
    }}>
      <div style={{ display: "flex", alignItems: "center", color: "#fff", marginBottom: 10 }}>
        <div style={{ fontSize: 16, fontWeight: "bold" }}>
          {call.type === "group" ? "👯 Gruppen-Live" : "📞 Live-Anruf"} · {peers.length + 1} dabei
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 11, opacity: 0.7 }}>🛡️ Fidolin prüft regelmäßig</div>
      </div>

      {error && (
        <div style={{ background: "#c2185b", color: "#fff", padding: 8, borderRadius: 8, marginBottom: 8, fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ flex: 1 }}>{error}</span>
          <button onClick={dismissError} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", borderRadius: 6, padding: "2px 8px", cursor: "pointer" }}>OK</button>
        </div>
      )}

      <div style={{
        flex: 1, overflow: "auto",
        display: "grid",
        gridTemplateColumns: peers.length <= 1 ? "1fr" : peers.length <= 3 ? "repeat(2, 1fr)" : "repeat(3, 1fr)",
        gap: 10, alignContent: "center",
      }}>
        {peers.map((p) => (
          <VideoTile key={p.id}
            stream={remoteStreams[p.id]}
            name={p.displayName}
            avatarUrl={p.avatarUrl}
            isLocal={false}
            big={peers.length === 1}
            label={p.displayName}
          />
        ))}
        {peers.length === 0 && (
          <div style={{ color: "#fff", textAlign: "center", padding: 20, opacity: 0.8 }}>
            <div style={{ fontSize: 48 }}>📡</div>
            <div>Es klingelt drüben…</div>
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>Wenn niemand abhebt, kannst du den Anruf wieder beenden.</div>
          </div>
        )}
      </div>

      {/* Lokales Preview – immer klein oben links wie MSN */}
      <div style={{
        position: "absolute", left: 18, top: 70, width: 160,
      }}>
        <VideoTile
          stream={localStream}
          name={me?.displayName || "Du"}
          avatarUrl={me?.avatarUrl}
          isLocal={true}
          muted={true}
        />
      </div>

      <div style={{ display: "flex", gap: 14, justifyContent: "center", marginTop: 10 }}>
        <button onClick={onToggleMic} title={micOn ? "Mikro aus" : "Mikro an"} style={{
          width: 54, height: 54, borderRadius: "50%", border: "none", cursor: "pointer", fontSize: 22,
          background: micOn ? "#fff" : "#ef4444", color: micOn ? "#1f5fa8" : "#fff",
        }}>{micOn ? "🎙️" : "🔇"}</button>
        {call.withVideo && (
          <button onClick={onToggleCam} title={camOn ? "Kamera aus" : "Kamera an"} style={{
            width: 54, height: 54, borderRadius: "50%", border: "none", cursor: "pointer", fontSize: 22,
            background: camOn ? "#fff" : "#ef4444", color: camOn ? "#1f5fa8" : "#fff",
          }}>{camOn ? "📹" : "🚫"}</button>
        )}
        <button onClick={onLeave} title="Auflegen" style={{
          width: 54, height: 54, borderRadius: "50%", border: "none", cursor: "pointer", fontSize: 22,
          background: "#c2185b", color: "#fff", boxShadow: "0 4px 10px rgba(0,0,0,0.4)",
        }}>📴</button>
      </div>
    </div>
  );
}

export default function LiveCallShell() {
  const { me } = useMe();
  const call = useLiveCall(me);

  // Globale Trigger: window.dispatchEvent(new CustomEvent("vv-start-call", { detail: {...} }))
  const startFromEvent = useCallback((ev) => {
    if (!ev?.detail) return;
    call.startCall(ev.detail).catch((e) => { /* Fehler wird im Hook gesetzt */ });
  }, [call]);
  useEffect(() => {
    window.addEventListener("vv-start-call", startFromEvent);
    return () => window.removeEventListener("vv-start-call", startFromEvent);
  }, [startFromEvent]);

  if (!me) return null;

  return (
    <>
      {call.ringing && !call.activeCall && (
        <IncomingDialog ring={call.ringing} onAccept={call.accept} onReject={call.reject} />
      )}
      {call.activeCall && (
        <CallWindow
          call={call.activeCall}
          me={me}
          localStream={call.localStream}
          remoteStreams={call.remoteStreams}
          micOn={call.micOn}
          camOn={call.camOn}
          onToggleMic={call.toggleMic}
          onToggleCam={call.toggleCam}
          onLeave={call.leaveCall}
          error={call.error}
          dismissError={call.dismissError}
        />
      )}
      {!call.activeCall && call.error && (
        <div style={{ position: "fixed", left: 12, right: 12, bottom: 12, maxWidth: 420, margin: "0 auto", background: "#c2185b", color: "#fff", padding: 10, borderRadius: 10, fontSize: 13, zIndex: 110, fontFamily: "Arial, sans-serif", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ flex: 1 }}>📵 {call.error}</span>
          <button onClick={call.dismissError} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", borderRadius: 6, padding: "2px 8px", cursor: "pointer" }}>OK</button>
        </div>
      )}
    </>
  );
}
