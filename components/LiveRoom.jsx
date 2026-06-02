"use client";

// Live-Room: Video-Grid + Chat + Emotes + Moderation (Owner/Mod kann kicken/muten/bannen).
// WebRTC-Mesh via useLiveStream, Echtzeit-Events via SSE.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useLiveStream } from "@/lib/useLiveStream";
import { useNsfwGuard } from "@/lib/useNsfwGuard";
import { EMOTES } from "@/lib/live";
import { ColoredName } from "./GenderAge";
import OnlineName from "./OnlineName";

const SIZE_PX = { sm: 28, md: 44, lg: 60, xl: 88 };
const MUTE_DURATIONS = [1, 5, 15, 60];

function fmtDuration(ms) {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h}h ${m - h * 60}min`;
}

function VideoTile({ stream, label, muted, mirror, onTap }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream;
      ref.current.play().catch(() => {});
    }
  }, [stream]);
  return (
    <div onClick={onTap} style={{
      position: "relative", background: "#000", borderRadius: 10, overflow: "hidden",
      aspectRatio: "16/9", cursor: onTap ? "pointer" : "default",
    }}>
      <video ref={ref} autoPlay playsInline muted={!!muted}
        style={{ width: "100%", height: "100%", objectFit: "cover",
          transform: mirror ? "scaleX(-1)" : "none" }} />
      {!stream && (
        <div style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center",
          justifyContent: "center", color: "#fff", fontSize: 12,
        }}>🎤 Audio / verbinde…</div>
      )}
      <div style={{
        position: "absolute", bottom: 6, left: 6,
        background: "rgba(0,0,0,0.55)", color: "#fff",
        padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700,
      }}>{label}</div>
    </div>
  );
}

export default function LiveRoom({ streamId, meId }) {
  const router = useRouter();
  const [stream, setStream] = useState(null);
  const [hosts, setHosts] = useState([]);
  const [chat, setChat] = useState([]);
  const [viewers, setViewers] = useState([]);
  const [viewerCount, setViewerCount] = useState(0);
  const [mods, setMods] = useState([]);
  const [requests, setRequests] = useState([]);
  const [iAmMod, setIAmMod] = useState(false);
  const [iAmMutedUntil, setIAmMutedUntil] = useState(null);
  const [emoteShop, setEmoteShop] = useState(false);
  const [flyingEmotes, setFlyingEmotes] = useState([]);
  const [busy, setBusy] = useState(false);
  const [chatText, setChatText] = useState("");
  const [flash, setFlash] = useState("");
  const [endStats, setEndStats] = useState(null);
  const [showViewers, setShowViewers] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [modTarget, setModTarget] = useState(null); // {userId, displayName} → öffnet Mod-Aktionen-Sheet
  const [reportTarget, setReportTarget] = useState(null); // {userId, displayName} → Report-Sheet
  const [nsfwBlackout, setNsfwBlackout] = useState(false);
  const [nsfwWarning, setNsfwWarning] = useState("");
  const sseRef = useRef(null);
  const videoZoneRef = useRef(null);

  const isOwner = stream?.ownerId === meId;
  const iAmHost = useMemo(() => hosts.some((h) => h.userId === meId), [hosts, meId]);
  const hostIds = useMemo(() => hosts.map((h) => h.userId), [hosts]);

  const {
    localStream, localReady, remoteStreams, remoteVersion, connectTo, error: rtcError,
    micOn, camOn, toggleMic, toggleCam,
  } = useLiveStream({
    streamId, isHost: iAmHost, meId, hostIds,
    hasVideo: !!stream?.hasVideo, hasAudio: !!stream?.hasAudio,
    sseRef,
  });

  // NSFW-Guard: läuft im Browser bei Hosts mit Video. Bei Treffer: Blackout + Auto-Report + Auto-End.
  useNsfwGuard({
    stream: iAmHost && stream?.hasVideo ? localStream : null,
    enabled: !!iAmHost && !!stream?.hasVideo && localReady,
    onHardHit: async ({ hard }) => {
      setNsfwBlackout(true);
      try {
        // Selbst-Report → Server vergibt Strike + ggf. Sperre
        await api.liveReport(streamId, meId, "nudity", `Score ${hard.toFixed(2)}`, "nsfw");
      } catch {}
      // Stream sofort beenden, wenn ich Owner bin
      if (isOwner) {
        try { const r = await api.liveEnd(streamId); if (r?.stats) setEndStats(r.stats); } catch {}
      }
    },
    onSoftHit: () => {
      setNsfwWarning("⚠ Bitte angemessen anziehen — der Stream droht beendet zu werden.");
      setTimeout(() => setNsfwWarning(""), 6000);
    },
  });

  // Race-Fix: wenn ich Host bin + lokal ready, connecte explizit zu allen aktuellen Hosts +
  // Viewers, falls SSE-„joined"-Events verpasst wurden.
  useEffect(() => {
    if (!iAmHost || !localReady) return;
    for (const h of hosts) if (h.userId !== meId) connectTo(h.userId);
    for (const v of viewers) if (v.userId !== meId) connectTo(v.userId);
  }, [iAmHost, localReady, hosts, viewers, meId, connectTo]);

  const load = useCallback(async () => {
    try {
      const r = await api.liveGet(streamId);
      setStream(r.stream);
      setHosts(r.hosts || []);
      setChat(r.chat || []);
      setViewers(r.viewers || []);
      setViewerCount(r.viewers?.length || 0);
      setMods(r.mods || []);
      setRequests(r.requests || []);
      setIAmMod(!!r.iAmMod);
      setIAmMutedUntil(r.iAmMuted || null);
      if (!r.iAmHost && r.stream.status === "live") await api.liveJoin(streamId).catch(() => {});
    } catch (e) { setFlash(`⚠ ${e.message}`); }
  }, [streamId]);
  useEffect(() => { load(); }, [load]);

  // SSE
  useEffect(() => {
    const handlers = new Set();
    const es = new EventSource(`/api/live/${streamId}/stream`);
    es.onmessage = (e) => {
      let env; try { env = JSON.parse(e.data); } catch { return; }
      if (env.type === "chat") {
        setChat((c) => [...c.slice(-79), env.data]);
      } else if (env.type === "emote") {
        spawnFlyingEmote(env.data);
      } else if (env.type === "viewer") {
        if (typeof env.data?.count === "number") setViewerCount(env.data.count);
        if (env.data?.joined && env.data.userId !== meId && iAmHost) {
          connectTo(env.data.userId);
        }
      } else if (env.type === "host") {
        api.liveGet(streamId).then((r) => setHosts(r.hosts || [])).catch(() => {});
      } else if (env.type === "cohost_request") {
        if (isOwner) {
          setRequests((rs) => [...rs.filter((r) => r.id !== env.data.requestId),
            { id: env.data.requestId, ...env.data.from, requestedAt: Date.now() }]);
        }
      } else if (env.type === "cohost_decided") {
        setRequests((rs) => rs.filter((r) => r.id !== env.data.requestId));
        if (!isOwner && env.data.userId === meId && env.data.approved) {
          setFlash("✅ Auf die Couch! Du bist Cohost.");
          setTimeout(() => setFlash(""), 3000);
        }
      } else if (env.type === "mod") {
        if (env.data.userId === meId) setIAmMod(env.data.promoted);
        api.liveGet(streamId).then((r) => setMods(r.mods || [])).catch(() => {});
      } else if (env.type === "mute") {
        if (env.data.userId === meId) setIAmMutedUntil(env.data.untilAt || null);
      } else if (env.type === "ban") {
        if (env.data.userId === meId && env.data.banned) {
          setFlash("🚫 Du wurdest aus dem Stream rausgeworfen.");
          setTimeout(() => router.push("/live"), 2500);
        }
      } else if (env.type === "ended") {
        setEndStats(env.data?.stats || null);
        if (!isOwner) setTimeout(() => router.push("/live"), 12_000);
      }
      for (const h of handlers) try { h(env); } catch {}
    };
    sseRef.current = {
      addHandler: (h) => handlers.add(h),
      removeHandler: (h) => handlers.delete(h),
    };
    return () => { es.close(); sseRef.current = null; };
  }, [streamId, iAmHost, isOwner, meId, connectTo, router]);

  function spawnFlyingEmote(data) {
    const lane = Math.floor(Math.random() * 6);
    const id = `${data.emoteId}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
    setFlyingEmotes((arr) => [...arr.slice(-30), { ...data, id, lane }]);
    setTimeout(() => setFlyingEmotes((arr) => arr.filter((e) => e.id !== id)), data.duration || 4000);
  }

  async function sendChat() {
    const t = chatText.trim();
    if (!t) return;
    setBusy(true);
    try { await api.liveMessage(streamId, t); setChatText(""); }
    catch (e) { setFlash(`⚠ ${e.message}`); setTimeout(() => setFlash(""), 2500); }
    finally { setBusy(false); }
  }

  async function sendEmote(emote) {
    setBusy(true);
    try { await api.liveEmote(streamId, emote.id); setEmoteShop(false); }
    catch (e) { setFlash(`⚠ ${e.message}`); setTimeout(() => setFlash(""), 3000); }
    finally { setBusy(false); }
  }

  async function becomeCohost() {
    setBusy(true);
    try {
      const r = await api.liveCohost(streamId);
      if (r.pendingRequest) {
        setFlash("📨 Anfrage gestellt — warte auf den Owner.");
        setTimeout(() => setFlash(""), 3500);
      }
    } catch (e) { setFlash(`⚠ ${e.message}`); setTimeout(() => setFlash(""), 3000); }
    finally { setBusy(false); }
  }

  async function endStream() {
    if (!confirm("Stream wirklich beenden?")) return;
    try {
      const r = await api.liveEnd(streamId);
      if (r.stats) setEndStats(r.stats);
    } catch (e) { setFlash(`⚠ ${e.message}`); }
  }

  async function leaveStream() {
    try { await api.liveLeave(streamId); } catch {}
    router.push("/live");
  }

  // Mod-Aktionen
  async function modAction(fn, label) {
    setBusy(true);
    try { await fn(); setFlash(`✓ ${label}`); setTimeout(() => setFlash(""), 2000); load(); }
    catch (e) { setFlash(`⚠ ${e.message}`); setTimeout(() => setFlash(""), 3000); }
    finally { setBusy(false); setModTarget(null); }
  }

  async function reportLive(reason, detail) {
    try {
      const target = reportTarget?.userId || stream.ownerId;
      await api.liveReport(streamId, target, reason, detail || "", "manual");
      setFlash("🚩 Danke — Admin schaut sich's an.");
      setTimeout(() => setFlash(""), 2500);
    } catch (e) { setFlash(`⚠ ${e.message}`); setTimeout(() => setFlash(""), 3000); }
    finally { setReportTarget(null); }
  }

  async function decideRequest(reqId, approve) {
    setBusy(true);
    try {
      if (approve) await api.liveApproveRequest(streamId, reqId);
      else await api.liveRejectRequest(streamId, reqId);
      setRequests((rs) => rs.filter((r) => r.id !== reqId));
    } catch (e) { setFlash(`⚠ ${e.message}`); setTimeout(() => setFlash(""), 3000); }
    finally { setBusy(false); }
  }

  function toggleFullscreen() {
    const el = videoZoneRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else el.requestFullscreen().catch(() => {});
  }

  if (!stream) return <div className="vv-card" style={{ textAlign: "center", padding: 30 }}>Lade…</div>;

  const tiles = [];
  for (const h of hosts) {
    if (h.userId === meId && iAmHost) {
      tiles.push({ key: `me-${h.userId}`, host: h, label: `${h.displayName} (du)`, stream: localStream, muted: true, mirror: true });
    } else {
      tiles.push({ key: `r-${h.userId}`, host: h, label: h.displayName, stream: remoteStreams.get(h.userId), muted: false, mirror: false });
    }
  }
  const tileCols = tiles.length <= 1 ? "1fr" : tiles.length <= 4 ? "1fr 1fr" : tiles.length <= 9 ? "1fr 1fr 1fr" : "1fr 1fr 1fr 1fr";

  const canSell = isOwner; // Owner darf alle Aktionen
  const canModerate = isOwner || iAmMod;

  return (
    <div style={{ position: "relative" }}>
      {/* Header */}
      <div className="vv-card" style={{ padding: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            background: "#ef4444", color: "#fff",
            padding: "3px 9px", borderRadius: 4,
            fontSize: 11, fontWeight: 800, letterSpacing: 0.5,
          }}>🔴 LIVE</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 14 }}>{stream.title}</div>
            <div style={{ fontSize: 11, color: "var(--vv-muted,#666)" }}>
              👁 <button type="button" onClick={() => setShowViewers(true)}
                style={{ background:"none", border:"none", color:"inherit", cursor:"pointer", padding:0, fontFamily:"inherit", textDecoration: "underline" }}>{viewerCount}</button>
              {" · "}{stream.mode === "multi" ? `🛋 ${hosts.length}/${stream.maxHosts}` : "🎙 Solo"}
              {!stream.hasVideo && " · 🎧 Audio"}
              {iAmMod && !isOwner && " · 🛡 Mod"}
            </div>
          </div>
          {canModerate && requests.length > 0 && (
            <button type="button" onClick={() => setShowRequests(true)} className="vv-btn"
              style={{ background: "#f59e0b", color: "#fff", border: "none", fontSize: 12, padding: "6px 10px" }}>
              📨 {requests.length}
            </button>
          )}
          {!isOwner && (
            <button type="button" onClick={() => setReportTarget({ userId: stream.ownerId, displayName: stream.owner.displayName })}
              className="vv-btn" title="Stream melden"
              style={{ background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca", fontSize: 12, padding: "6px 8px" }}>
              🚩
            </button>
          )}
          {isOwner ? (
            <button type="button" onClick={endStream} className="vv-btn"
              style={{ background: "#ef4444", color: "#fff", border: "none", fontSize: 12, padding: "6px 10px" }}>⏹ Beenden</button>
          ) : (
            <button type="button" onClick={leaveStream} className="vv-btn" style={{ fontSize: 12, padding: "6px 10px" }}>✕ Raus</button>
          )}
        </div>
        {stream.mode === "multi" && !iAmHost && hosts.length < stream.maxHosts && (
          <button type="button" onClick={becomeCohost} disabled={busy || iAmMutedUntil}
            className="vv-btn-big vv-btn-big-pink"
            style={{ marginTop: 8, width: "100%", padding: 8, fontSize: 13 }}>
            🛋 {stream.hostPolicy === "request" ? "Anfrage stellen" : "Auf die Couch!"} ({hosts.length}/{stream.maxHosts})
          </button>
        )}
        {iAmMutedUntil && (
          <div style={{ marginTop: 8, padding: 8, background: "#fef2f2", color: "#7f1d1d",
            borderRadius: 8, fontSize: 12, textAlign: "center" }}>
            🔇 Du bist gemutet bis {new Date(iAmMutedUntil).toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* NSFW-Warnung */}
      {nsfwWarning && (
        <div style={{
          margin: "8px 0", padding: 10, background: "#fef3c7", color: "#92400e",
          borderRadius: 8, fontWeight: 700, textAlign: "center", fontSize: 13,
          border: "2px solid #f59e0b",
        }}>{nsfwWarning}</div>
      )}

      {/* Video-Grid */}
      <div ref={videoZoneRef} className="vv-card" style={{ position: "relative", padding: 8, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: tileCols, gap: 6 }}>
          {tiles.map((t) => (
            <VideoTile key={t.key} stream={t.stream} label={t.label} muted={t.muted} mirror={t.mirror}
              onTap={isOwner && t.host.userId !== meId ? () => setModTarget(t.host) : undefined} />
          ))}
        </div>
        {tiles.length === 0 && <div style={{ textAlign: "center", padding: 20, color: "var(--vv-muted,#666)" }}>Kein Host aktiv</div>}

        {/* Fliegende Emotes */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
          {flyingEmotes.map((e) => (
            <span key={e.id} style={{
              position: "absolute", right: `${5 + e.lane * 14}%`, bottom: 0,
              fontSize: SIZE_PX[e.size] || 44,
              animation: `vv-emote-fly ${e.duration}ms ease-out forwards`,
              filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.4))",
            }}>{e.emoji}</span>
          ))}
        </div>
        <style>{`@keyframes vv-emote-fly {
          0% { transform: translateY(20px) scale(0.5); opacity: 0; }
          15% { transform: translateY(0) scale(1); opacity: 1; }
          85% { opacity: 1; }
          100% { transform: translateY(-90vh) scale(1.2) rotate(20deg); opacity: 0; }
        }`}</style>

        {/* Host-Controls + Fullscreen */}
        <div style={{
          position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)",
          display: "flex", gap: 8, zIndex: 1000,
        }}>
          {iAmHost && localReady && stream.hasAudio && (
            <button type="button" onClick={toggleMic} title={micOn ? "Mikro aus" : "Mikro an"}
              style={{ width: 42, height: 42, borderRadius: "50%", border: "none", cursor: "pointer",
                background: micOn ? "rgba(255,255,255,0.92)" : "#ef4444",
                color: micOn ? "#1c1c1e" : "#fff", fontSize: 18, boxShadow: "0 3px 10px rgba(0,0,0,0.4)" }}>
              {micOn ? "🎤" : "🔇"}</button>
          )}
          {iAmHost && localReady && stream.hasVideo && (
            <button type="button" onClick={toggleCam} title={camOn ? "Kamera aus" : "Kamera an"}
              style={{ width: 42, height: 42, borderRadius: "50%", border: "none", cursor: "pointer",
                background: camOn ? "rgba(255,255,255,0.92)" : "#ef4444",
                color: camOn ? "#1c1c1e" : "#fff", fontSize: 18, boxShadow: "0 3px 10px rgba(0,0,0,0.4)" }}>
              {camOn ? "📹" : "📴"}</button>
          )}
          <button type="button" onClick={toggleFullscreen} title="Vollbild"
            style={{ width: 42, height: 42, borderRadius: "50%", border: "none", cursor: "pointer",
              background: "rgba(255,255,255,0.92)", color: "#1c1c1e", fontSize: 18,
              boxShadow: "0 3px 10px rgba(0,0,0,0.4)" }}>⛶</button>
        </div>

        {/* NSFW-Blackout-Overlay */}
        {nsfwBlackout && (
          <div style={{
            position: "absolute", inset: 0, background: "#000",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            color: "#fff", padding: 20, zIndex: 1100, textAlign: "center",
          }}>
            <div style={{ fontSize: 60 }}>🚫</div>
            <div style={{ fontWeight: 800, fontSize: 18, marginTop: 8 }}>Stream gesperrt</div>
            <div style={{ fontSize: 13, marginTop: 6, opacity: 0.85 }}>
              KI hat unangemessenen Inhalt erkannt. Strike erfasst.<br/>
              Bei mehrmals: 24h / 7d / permanent Live-Sperre.
            </div>
          </div>
        )}
      </div>

      {flash && (
        <div style={{
          margin: "8px 0", padding: 8,
          background: flash.startsWith("⚠") ? "#fef3c7" : "#dcfce7",
          color: flash.startsWith("⚠") ? "#92400e" : "#166534",
          borderRadius: 8, fontWeight: 700, textAlign: "center", fontSize: 13,
        }}>{flash}</div>
      )}
      {rtcError && <div className="vv-card" style={{ background: "#fef2f2", color: "#7f1d1d", fontSize: 12 }}>⚠ {rtcError}</div>}

      {/* Chat */}
      <div className="vv-card" style={{ padding: 10 }}>
        <h3 style={{ margin: "0 0 8px", fontSize: 14 }}>💬 Chat</h3>
        <div style={{ maxHeight: 260, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
          {chat.length === 0 && <div className="vv-muted" style={{ fontSize: 12 }}>Schreib was Nettes …</div>}
          {chat.map((m) => (
            <div key={m.id} style={{ fontSize: 13, lineHeight: 1.4 }}>
              {canModerate && m.user.id !== meId && stream.ownerId !== m.user.id && (
                <button type="button" onClick={() => setModTarget({ ...m.user, userId: m.user.id })}
                  style={{ background:"none", border:"none", cursor:"pointer", color:"#ef4444",
                    fontSize: 10, padding: "0 4px 0 0", fontFamily:"inherit" }}>🛡</button>
              )}
              {!canModerate && m.user.id !== meId && (
                <button type="button" onClick={() => setReportTarget({ userId: m.user.id, displayName: m.user.displayName })}
                  title="Nachricht melden"
                  style={{ background:"none", border:"none", cursor:"pointer", color:"#ef4444",
                    fontSize: 10, padding: "0 4px 0 0", fontFamily:"inherit" }}>🚩</button>
              )}
              <OnlineName lastSeen={m.user.lastSeen}>
                <ColoredName gender={m.user.gender} age={m.user.age} name={m.user.displayName} />
              </OnlineName>
              <span style={{ marginLeft: 6, color: "var(--vv-text,#1c1c1e)" }}>{m.text}</span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <input className="vv-input" placeholder={iAmMutedUntil ? "🔇 Du bist gemutet" : "Sag was …"}
            value={chatText} onChange={(e) => setChatText(e.target.value)}
            disabled={!!iAmMutedUntil}
            onKeyDown={(e) => { if (e.key === "Enter") sendChat(); }}
            maxLength={240} style={{ flex: 1 }} />
          <button type="button" disabled={busy || !chatText.trim() || !!iAmMutedUntil}
            onClick={sendChat} className="vv-btn vv-btn-pink" style={{ fontSize: 13 }}>Senden</button>
        </div>
        <button type="button" onClick={() => setEmoteShop(true)}
          disabled={!!iAmMutedUntil}
          style={{
            marginTop: 8, width: "100%", padding: 10,
            background: "linear-gradient(135deg, #fbbf24, #ec4899)",
            border: "none", borderRadius: 10, color: "#fff",
            fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
            opacity: iAmMutedUntil ? 0.5 : 1,
          }}>✨ Emote senden</button>
      </div>

      {/* Emote-Shop */}
      {emoteShop && (
        <div onClick={() => setEmoteShop(false)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
          zIndex: 3000, display: "flex", alignItems: "flex-end",
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            width: "100%", maxHeight: "70vh", overflowY: "auto",
            background: "var(--vv-card,#fff)", color: "var(--vv-text,#1c1c1e)",
            borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 14,
          }}>
            <div style={{ width: 44, height: 4, background: "#d4d4d8", borderRadius: 2, margin: "0 auto 12px" }} />
            <h3 style={{ margin: "0 0 6px", fontSize: 16 }}>✨ Emote senden</h3>
            <div className="vv-muted" style={{ fontSize: 11, marginBottom: 10 }}>
              70% an die Hosts, 30% Sink — Anti-Inflation.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))", gap: 8 }}>
              {EMOTES.map((e) => (
                <button key={e.id} type="button" disabled={busy} onClick={() => sendEmote(e)}
                  style={{
                    padding: "10px 4px", borderRadius: 10, cursor: "pointer",
                    border: "1px solid var(--vv-border,#e5e7eb)",
                    background: "var(--vv-surface,#f5f5f7)", color: "var(--vv-text,#1c1c1e)",
                    fontFamily: "inherit", textAlign: "center",
                  }}>
                  <div style={{ fontSize: 26 }}>{e.emoji}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, marginTop: 2 }}>{e.label}</div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#ec4899" }}>{e.cost} ✨</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Viewer-Liste */}
      {showViewers && (
        <BottomSheet onClose={() => setShowViewers(false)} title={`👁 Viewer (${viewers.length})`}>
          {viewers.length === 0 && <div className="vv-muted" style={{ fontSize: 13 }}>Noch keine Zuschauer.</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {viewers.map((v) => (
              <div key={v.userId} style={{
                display: "flex", alignItems: "center", gap: 8, padding: 6,
                background: "var(--vv-surface,#f5f5f7)", borderRadius: 8, fontSize: 13,
              }}>
                <span style={{ flex: 1 }}>
                  <OnlineName lastSeen={v.lastSeen}>
                    <ColoredName gender={v.gender} age={v.age} name={v.displayName} />
                  </OnlineName>
                </span>
                {canModerate && v.userId !== meId && v.userId !== stream.ownerId && (
                  <button type="button" onClick={() => setModTarget(v)}
                    style={{ background: "#ef4444", color: "#fff", border: "none",
                      borderRadius: 6, padding: "3px 8px", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                    🛡 Mod
                  </button>
                )}
              </div>
            ))}
          </div>
        </BottomSheet>
      )}

      {/* Cohost-Anfragen */}
      {showRequests && (
        <BottomSheet onClose={() => setShowRequests(false)} title={`📨 Cohost-Anfragen (${requests.length})`}>
          {requests.length === 0 && <div className="vv-muted" style={{ fontSize: 13 }}>Keine offenen Anfragen.</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {requests.map((r) => (
              <div key={r.id} style={{
                display: "flex", alignItems: "center", gap: 8, padding: 8,
                background: "var(--vv-surface,#f5f5f7)", borderRadius: 8,
              }}>
                <span style={{ flex: 1, fontSize: 13 }}>
                  <ColoredName gender={r.gender} age={r.age} name={r.displayName} />
                </span>
                <button type="button" disabled={busy} onClick={() => decideRequest(r.id, true)}
                  style={{ background: "#22c55e", color: "#fff", border: "none",
                    borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                  ✓ Zulassen
                </button>
                <button type="button" disabled={busy} onClick={() => decideRequest(r.id, false)}
                  style={{ background: "#6b7280", color: "#fff", border: "none",
                    borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                  ✕ Nein
                </button>
              </div>
            ))}
          </div>
        </BottomSheet>
      )}

      {/* Report-Sheet */}
      {reportTarget && (
        <BottomSheet onClose={() => setReportTarget(null)} title={`🚩 ${reportTarget.displayName} melden`}>
          <div style={{ fontSize: 12, color: "var(--vv-muted,#666)", marginBottom: 10 }}>
            Wähle einen Grund — Admin prüft manuell. Falschmeldungen können selbst zu Sanktionen führen.
          </div>
          {[
            { v: "nudity",     label: "🚫 Nackte Tatsachen / Sex" },
            { v: "minor",      label: "👶 Minderjährige unangemessen" },
            { v: "harassment", label: "💢 Beleidigung / Hass" },
            { v: "violence",   label: "⚔️ Gewalt / Drogen" },
            { v: "spam",       label: "🥫 Spam / Werbung" },
            { v: "other",      label: "❓ Sonstiges" },
          ].map((o) => (
            <button key={o.v} type="button" onClick={() => reportLive(o.v)}
              style={{ width: "100%", padding: 10, marginBottom: 6, borderRadius: 10,
                border: "1px solid var(--vv-border,#e5e7eb)",
                background: "var(--vv-surface,#f5f5f7)", color: "var(--vv-text,#1c1c1e)",
                fontFamily: "inherit", textAlign: "left", fontSize: 13, cursor: "pointer" }}>
              {o.label}
            </button>
          ))}
        </BottomSheet>
      )}

      {/* Mod-Aktionen-Sheet */}
      {modTarget && (
        <BottomSheet onClose={() => setModTarget(null)} title={`🛡 ${modTarget.displayName}`}>
          {modTarget.role === "cohost" && isOwner && (
            <button type="button" disabled={busy} className="vv-btn-big vv-btn-big-ghost"
              style={{ width: "100%", marginBottom: 6 }}
              onClick={() => modAction(() => api.liveDemote(streamId, modTarget.userId), "Cohost runtergesetzt")}>
              ⬇️ Vom Couch nehmen
            </button>
          )}
          {isOwner && (
            mods.some((m) => m.userId === modTarget.userId) ? (
              <button type="button" disabled={busy} className="vv-btn-big vv-btn-big-ghost"
                style={{ width: "100%", marginBottom: 6 }}
                onClick={() => modAction(() => api.liveUnmod(streamId, modTarget.userId), "Mod-Rolle entzogen")}>
                🛡 Mod entfernen
              </button>
            ) : (
              <button type="button" disabled={busy} className="vv-btn-big vv-btn-big-ghost"
                style={{ width: "100%", marginBottom: 6 }}
                onClick={() => modAction(() => api.liveMod(streamId, modTarget.userId), "Zum Mod gemacht")}>
                🛡 Zum Mod machen
              </button>
            )
          )}
          <div style={{ fontSize: 11, color: "var(--vv-muted,#666)", marginTop: 6, marginBottom: 4 }}>🔇 Muten für:</div>
          <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
            {MUTE_DURATIONS.map((m) => (
              <button key={m} type="button" disabled={busy} className="vv-btn"
                style={{ flex: 1, fontSize: 12 }}
                onClick={() => modAction(() => api.liveMute(streamId, modTarget.userId, m), `Gemutet für ${m} min`)}>
                {m} min
              </button>
            ))}
          </div>
          <button type="button" disabled={busy} className="vv-btn-big vv-btn-big-pink"
            style={{ width: "100%", marginBottom: 6, background: "#dc2626" }}
            onClick={() => modAction(() => api.liveBan(streamId, modTarget.userId), "Rausgeworfen + Ban")}>
            🚫 Aus Stream rauswerfen
          </button>
        </BottomSheet>
      )}

      {/* Stream-End-Stats */}
      {endStats && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
          zIndex: 4000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        }}>
          <div style={{
            width: "100%", maxWidth: 380, background: "var(--vv-card,#fff)",
            color: "var(--vv-text,#1c1c1e)", borderRadius: 16, padding: 20, textAlign: "center",
            boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          }}>
            <div style={{ fontSize: 50, marginBottom: 6 }}>🎬</div>
            <h2 style={{ margin: "0 0 4px" }}>Stream beendet!</h2>
            <div style={{ color: "var(--vv-muted,#666)", fontSize: 13, marginBottom: 14 }}>
              Lief {fmtDuration(endStats.durationMs || 0)}
            </div>
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14,
            }}>
              <Stat icon="👁" label="Zuschauer-Peak" value={endStats.viewerPeak || 0} />
              <Stat icon="👥" label="Insgesamt dabei" value={endStats.totalViewers || 0} />
              <Stat icon="✨" label="Vibes verdient" value={Math.floor((endStats.totalVibes || 0) * 0.7)} accent="#ec4899" />
              <Stat icon="🎁" label="Emotes erhalten" value={endStats.emoteCount || 0} />
              <Stat icon="💬" label="Chat-Nachrichten" value={endStats.chatCount || 0} />
            </div>
            <button type="button" onClick={() => { setEndStats(null); router.push("/live"); }}
              className="vv-btn-big vv-btn-big-pink" style={{ width: "100%", padding: 12 }}>
              Auf Wiedersehen 👋
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ icon, label, value, accent }) {
  return (
    <div style={{ background: "var(--vv-surface,#f5f5f7)", borderRadius: 10, padding: 8 }}>
      <div style={{ fontSize: 22 }}>{icon}</div>
      <div style={{ fontSize: 16, fontWeight: 800, color: accent || "var(--vv-text,#1c1c1e)" }}>{value}</div>
      <div style={{ fontSize: 10, color: "var(--vv-muted,#666)" }}>{label}</div>
    </div>
  );
}

function BottomSheet({ onClose, title, children }) {
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
      zIndex: 3000, display: "flex", alignItems: "flex-end",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "100%", maxHeight: "75vh", overflowY: "auto",
        background: "var(--vv-card,#fff)", color: "var(--vv-text,#1c1c1e)",
        borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 14,
      }}>
        <div style={{ width: 44, height: 4, background: "#d4d4d8", borderRadius: 2, margin: "0 auto 12px" }} />
        <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
          <h3 style={{ margin: 0, fontSize: 15 }}>{title}</h3>
          <button type="button" onClick={onClose}
            style={{ marginLeft: "auto", background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "inherit" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
