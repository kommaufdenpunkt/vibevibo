"use client";

// Live-Room: Video-Grid + Chat + Emotes für einen Stream.
// WebRTC-Mesh via useLiveStream, Echtzeit-Events via SSE.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useLiveStream } from "@/lib/useLiveStream";
import { EMOTES } from "@/lib/live";
import { ColoredName } from "./GenderAge";
import OnlineName from "./OnlineName";

const SIZE_PX = { sm: 28, md: 44, lg: 60, xl: 88 };

function VideoTile({ stream, label, muted, mirror }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream;
      ref.current.play().catch(() => {});
    }
  }, [stream]);
  return (
    <div style={{ position: "relative", background: "#000", borderRadius: 10, overflow: "hidden", aspectRatio: "16/9" }}>
      <video ref={ref} autoPlay playsInline muted={!!muted}
        style={{ width: "100%", height: "100%", objectFit: "cover",
          transform: mirror ? "scaleX(-1)" : "none" }} />
      {!stream && (
        <div style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center",
          justifyContent: "center", color: "#fff", fontSize: 12,
        }}>🎤 Audio only / Verbinde…</div>
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
  const [viewerCount, setViewerCount] = useState(0);
  const [emoteShop, setEmoteShop] = useState(false);
  const [flyingEmotes, setFlyingEmotes] = useState([]); // {id, emoji, size, duration, lane}
  const [busy, setBusy] = useState(false);
  const [chatText, setChatText] = useState("");
  const [flash, setFlash] = useState("");
  const sseRef = useRef(null);

  const isOwner = stream?.ownerId === meId;
  const iAmHost = useMemo(() => hosts.some((h) => h.userId === meId), [hosts, meId]);

  const hostIds = useMemo(() => hosts.map((h) => h.userId), [hosts]);

  const { localStream, localReady, remoteStreams, remoteVersion, connectTo, error: rtcError } = useLiveStream({
    streamId, isHost: iAmHost, meId, hostIds,
    hasVideo: !!stream?.hasVideo, hasAudio: !!stream?.hasAudio,
    sseRef,
  });

  // Initial laden
  const load = useCallback(async () => {
    try {
      const r = await api.liveGet(streamId);
      setStream(r.stream);
      setHosts(r.hosts || []);
      setChat(r.chat || []);
      setViewerCount(r.viewers?.length || 0);
      // Als Viewer eintreten
      if (!r.iAmHost) await api.liveJoin(streamId).catch(() => {});
    } catch (e) { setFlash(`⚠ ${e.message}`); }
  }, [streamId]);
  useEffect(() => { load(); }, [load]);

  // SSE-Wrapper mit Mehrfach-Handlers
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
        // Hosts neu laden bei Veränderung
        api.liveGet(streamId).then((r) => setHosts(r.hosts || [])).catch(() => {});
        if (env.data?.joined && env.data.userId !== meId && iAmHost) {
          connectTo(env.data.userId);
        }
      } else if (env.type === "ended") {
        setFlash("🛑 Stream beendet.");
        setTimeout(() => router.push("/live"), 2500);
      }
      for (const h of handlers) try { h(env); } catch {}
    };
    sseRef.current = {
      addHandler: (h) => handlers.add(h),
      removeHandler: (h) => handlers.delete(h),
    };
    return () => { es.close(); sseRef.current = null; };
  }, [streamId, iAmHost, meId, connectTo, router]);

  // Wenn ich neuer Host werde: zu allen schon verbundenen Viewers/Hosts connecten
  useEffect(() => {
    if (!iAmHost || !localReady) return;
    // Diese sind im Stream — wir bauen P2P zu allen anderen Hosts auf
    for (const h of hosts) if (h.userId !== meId) connectTo(h.userId);
  }, [iAmHost, localReady, hosts, meId, connectTo]);

  function spawnFlyingEmote(data) {
    const lane = Math.floor(Math.random() * 6); // 6 Bahnen
    const id = `${data.emoteId}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
    setFlyingEmotes((arr) => [...arr.slice(-30), { ...data, id, lane }]);
    setTimeout(() => setFlyingEmotes((arr) => arr.filter((e) => e.id !== id)), data.duration || 4000);
  }

  async function sendChat() {
    const t = chatText.trim();
    if (!t) return;
    setBusy(true);
    try {
      await api.liveMessage(streamId, t);
      setChatText("");
    } catch (e) { setFlash(`⚠ ${e.message}`); setTimeout(() => setFlash(""), 2500); }
    finally { setBusy(false); }
  }

  async function sendEmote(emote) {
    setBusy(true);
    try {
      await api.liveEmote(streamId, emote.id);
      setEmoteShop(false);
    } catch (e) { setFlash(`⚠ ${e.message}`); setTimeout(() => setFlash(""), 3000); }
    finally { setBusy(false); }
  }

  async function becomeCohost() {
    setBusy(true);
    try { await api.liveCohost(streamId); }
    catch (e) { setFlash(`⚠ ${e.message}`); setTimeout(() => setFlash(""), 3000); }
    finally { setBusy(false); }
  }

  async function endStream() {
    if (!confirm("Stream wirklich beenden?")) return;
    try { await api.liveEnd(streamId); }
    catch (e) { setFlash(`⚠ ${e.message}`); }
  }

  async function leaveStream() {
    try { await api.liveLeave(streamId); } catch {}
    router.push("/live");
  }

  if (!stream) {
    return <div className="vv-card" style={{ textAlign: "center", padding: 30 }}>Lade…</div>;
  }

  // Video-Tiles bestimmen
  const tiles = [];
  for (const h of hosts) {
    if (h.userId === meId && iAmHost) {
      tiles.push({ key: `me-${h.userId}`, label: `${h.displayName} (du)`, stream: localStream, muted: true, mirror: true });
    } else {
      tiles.push({ key: `r-${h.userId}`, label: h.displayName, stream: remoteStreams.get(h.userId), muted: false, mirror: false });
    }
  }

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
              👁 {viewerCount} · {stream.mode === "multi" ? `🛋 ${hosts.length}/${stream.maxHosts}` : "🎙 Solo"}
              {!stream.hasVideo && " · 🎧 Audio"}
            </div>
          </div>
          {isOwner ? (
            <button type="button" onClick={endStream} className="vv-btn"
              style={{ background: "#ef4444", color: "#fff", border: "none", fontSize: 12, padding: "6px 10px" }}>
              ⏹ Beenden
            </button>
          ) : (
            <button type="button" onClick={leaveStream} className="vv-btn" style={{ fontSize: 12, padding: "6px 10px" }}>
              ✕ Raus
            </button>
          )}
        </div>
        {stream.mode === "multi" && !iAmHost && hosts.length < stream.maxHosts && (
          <button type="button" onClick={becomeCohost} disabled={busy}
            className="vv-btn-big vv-btn-big-pink"
            style={{ marginTop: 8, width: "100%", padding: 8, fontSize: 13 }}>
            🛋 Auf die Couch! ({hosts.length}/{stream.maxHosts} besetzt)
          </button>
        )}
      </div>

      {/* Video-Grid + fliegende Emotes */}
      <div className="vv-card" style={{ position: "relative", padding: 8, overflow: "hidden" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: tiles.length <= 1 ? "1fr" : tiles.length === 2 ? "1fr 1fr" : "1fr 1fr",
          gap: 6,
        }}>
          {tiles.map((t) => (
            <VideoTile key={t.key} stream={t.stream} label={t.label} muted={t.muted} mirror={t.mirror} />
          ))}
        </div>
        {tiles.length === 0 && (
          <div style={{ textAlign: "center", padding: 20, color: "var(--vv-muted,#666)" }}>Kein Host aktiv</div>
        )}

        {/* Fliegende Emotes */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
          {flyingEmotes.map((e) => (
            <span key={e.id} style={{
              position: "absolute",
              right: `${5 + e.lane * 14}%`, bottom: 0,
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
      </div>

      {flash && (
        <div style={{
          margin: "8px 0", padding: 8,
          background: flash.startsWith("⚠") ? "#fef3c7" : "#dcfce7",
          color: flash.startsWith("⚠") ? "#92400e" : "#166534",
          borderRadius: 8, fontWeight: 700, textAlign: "center", fontSize: 13,
        }}>{flash}</div>
      )}
      {rtcError && (
        <div className="vv-card" style={{ background: "#fef2f2", color: "#7f1d1d", fontSize: 12 }}>
          ⚠ {rtcError}
        </div>
      )}

      {/* Chat */}
      <div className="vv-card" style={{ padding: 10 }}>
        <h3 style={{ margin: "0 0 8px", fontSize: 14 }}>💬 Chat</h3>
        <div style={{ maxHeight: 260, overflowY: "auto",
          display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
          {chat.length === 0 && <div className="vv-muted" style={{ fontSize: 12 }}>Schreib was Nettes …</div>}
          {chat.map((m) => (
            <div key={m.id} style={{ fontSize: 13, lineHeight: 1.4 }}>
              <OnlineName lastSeen={m.user.lastSeen}>
                <ColoredName gender={m.user.gender} age={m.user.age} name={m.user.displayName} />
              </OnlineName>
              <span style={{ marginLeft: 6, color: "var(--vv-text,#1c1c1e)" }}>{m.text}</span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <input className="vv-input" placeholder="Sag was …"
            value={chatText} onChange={(e) => setChatText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") sendChat(); }}
            maxLength={240} style={{ flex: 1 }} />
          <button type="button" disabled={busy || !chatText.trim()}
            onClick={sendChat} className="vv-btn vv-btn-pink" style={{ fontSize: 13 }}>Senden</button>
        </div>
        <button type="button" onClick={() => setEmoteShop(true)}
          style={{
            marginTop: 8, width: "100%", padding: 10,
            background: "linear-gradient(135deg, #fbbf24, #ec4899)",
            border: "none", borderRadius: 10, color: "#fff",
            fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
          }}>
          ✨ Emote senden (Vibes ausgeben)
        </button>
      </div>

      {/* Emote-Shop Bottom-Sheet */}
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
              70% der Vibes gehen an die Hosts, 30% fließen aus dem Markt (Anti-Inflation).
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))",
              gap: 8,
            }}>
              {EMOTES.map((e) => (
                <button key={e.id} type="button" disabled={busy}
                  onClick={() => sendEmote(e)}
                  style={{
                    padding: "10px 4px", borderRadius: 10, cursor: "pointer",
                    border: "1px solid var(--vv-border,#e5e7eb)",
                    background: "var(--vv-surface,#f5f5f7)",
                    color: "var(--vv-text,#1c1c1e)",
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
    </div>
  );
}
