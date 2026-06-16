"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useMe } from "@/lib/useMe";
import { api } from "@/lib/api";
import { relTime } from "@/lib/format";
import SmileyPicker from "@/components/SmileyPicker";
import VoiceRecorder from "@/components/VoiceRecorder";
import VoiceMessage from "@/components/VoiceMessage";
import Avatar from "@/components/Avatar";
import { ColoredName } from "@/components/GenderAge";
import MentionText from "@/components/MentionText";
import { useMessageStream } from "@/lib/useEventStream";

function timeShort(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}
function fileToChatImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = reject;
      img.onload = () => {
        const maxDim = 600;
        let { width, height } = img;
        const ratio = Math.min(1, maxDim / width, maxDim / height);
        width = Math.round(width * ratio); height = Math.round(height * ratio);
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function RoomChatPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = Number(params.id);
  const { me, loading } = useMe();

  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [pendingImage, setPendingImage] = useState(null);
  const [error, setError] = useState(null);
  const [muteMenu, setMuteMenu] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [typingUsers, setTypingUsers] = useState({}); // id -> ts
  const scrollRef = useRef(null);
  const imageRef = useRef(null);
  const typingTimer = useRef(0);

  const reload = useCallback(async () => {
    try {
      const [r, m] = await Promise.all([api.getRoom(roomId), api.getRoomMessages(roomId)]);
      setRoom(r.room);
      setMessages(m.messages);
      setError(null);
    } catch (e) {
      setError(e.status === 403 ? "Du bist kein Mitglied dieser Gruppe." : e.message);
    }
  }, [roomId]);

  useEffect(() => {
    if (loading) return;
    if (!me) { router.push("/login"); return; }
    reload();
  }, [me, loading, router, reload]);

  // SSE: Room-Nachrichten + Typing
  useMessageStream(!!me, {
    onRoomMessage: (data) => {
      if (data.roomId !== roomId) return;
      setMessages((arr) => [...arr, {
        id: data.id, fromUserId: data.fromUserId, text: data.text, imageUrl: data.imageUrl,
        kind: data.kind || "text", at: data.at, from: data.from,
      }]);
    },
    onTyping: (data) => {
      if (data.roomId !== roomId || data.fromUserId === me?.id) return;
      setTypingUsers((p) => ({ ...p, [data.fromUserId]: Date.now() }));
    },
  });

  // Stale typing nach 4s entfernen
  useEffect(() => {
    const t = setInterval(() => {
      const cutoff = Date.now() - 4000;
      setTypingUsers((p) => {
        const next = {};
        for (const [k, v] of Object.entries(p)) if (v > cutoff) next[k] = v;
        return next;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function onPickChatImage(e) {
    const file = e.target.files?.[0]; e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) { alert("Bitte ein Bild auswählen."); return; }
    try { setPendingImage(await fileToChatImage(file)); }
    catch { alert("Bild konnte nicht geladen werden."); }
  }

  async function submit(e) {
    e.preventDefault();
    const v = text.trim();
    if (!v && !pendingImage) return;
    try {
      const res = await api.sendRoomMessage(roomId, v, pendingImage);
      setText(""); setPendingImage(null);
      if (res?.imageNote) alert(res.imageNote);
    } catch (err) { alert(err.message); }
  }

  function onTextChange(v) {
    setText(v);
    const now = Date.now();
    if (now - typingTimer.current > 2000) {
      typingTimer.current = now;
      api.sendTyping(null, roomId).catch(() => {});
    }
  }

  async function sendVoice(audioUrl) {
    try {
      await api.sendRoomVoice(roomId, audioUrl);
    } catch (err) { alert(err.message); }
  }

  async function mute(durationMs) {
    try {
      await api.setMute("room", roomId, durationMs);
      setMuteMenu(false);
      alert(durationMs === 0 ? "Gruppe ist jetzt dauerhaft stumm." : "Gruppe stumm geschaltet.");
    } catch (err) { alert(err.message); }
  }
  async function unmute() {
    try { await api.removeMute("room", roomId); setMuteMenu(false); alert("Wieder laut."); }
    catch (err) { alert(err.message); }
  }

  async function leaveRoom() {
    if (!window.confirm("Chatraum wirklich verlassen?")) return;
    try {
      await api.leaveRoom(roomId);
      router.push("/messenger");
    } catch (err) { alert(err.message); }
  }

  if (!me) return null;
  if (error) {
    return (
      <div className="vv-card">
        <h2>👻 {error}</h2>
        <Link href="/messenger" className="vv-btn">← Zurück</Link>
      </div>
    );
  }
  if (!room) return <div className="vv-card">Lädt…</div>;

  const typingNames = Object.keys(typingUsers)
    .map((id) => room.members?.find((m) => m.id === Number(id))?.displayName)
    .filter(Boolean);

  return (
    <div className="vv-card" style={{ padding: 0, overflow: "hidden" }}>
      <div className="vv-chat-window">
        {/* MSN-Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "linear-gradient(180deg, #5fb0ff 0%, #2d7dd2 55%, #1f5fa8 100%)", color: "#fff", textShadow: "0 1px 0 rgba(0,0,0,0.25)", fontFamily: "Arial, sans-serif", borderBottom: "1px solid rgba(0,0,0,0.15)" }}>
          <Link href="/messenger" style={{ color: "#fff", fontSize: 18, textDecoration: "none" }} aria-label="Zurück">←</Link>
          <button type="button" onClick={() => setShowMembers((v) => !v)} style={{ background: "none", border: "none", color: "#fff", fontSize: 26, cursor: "pointer", padding: 0 }}>{room.emoji || "💬"}</button>
          <div style={{ flex: 1, minWidth: 0, lineHeight: 1.2 }}>
            <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}><strong>{room.name}</strong></div>
            <div style={{ fontSize: 11, opacity: 0.9 }}>
              {room.members?.length || 0} Mitglieder
              {typingNames.length > 0 && (
                <> · <em>{typingNames.slice(0, 2).join(", ")}{typingNames.length > 2 ? " u.a." : ""} schreibt…</em></>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("vv-start-call", { detail: { type: "group", roomId, withVideo: true } }))}
            title="Live starten (Video, bis 6)"
            aria-label="Live"
            style={{ background: "rgba(255,255,255,0.18)", color: "#fff", border: "none", borderRadius: 8, padding: "4px 8px", cursor: "pointer", fontSize: 14, marginRight: 4 }}
          >🎥</button>
          <div style={{ position: "relative" }}>
            <button type="button" onClick={() => setMuteMenu((v) => !v)} title="Optionen"
              style={{ background: "rgba(255,255,255,0.18)", color: "#fff", border: "none", borderRadius: 8, padding: "4px 8px", cursor: "pointer", fontSize: 16 }}>⋮</button>
            {muteMenu && (
              <>
                <div onClick={() => setMuteMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 5 }} />
                <div style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 10, background: "#fff", color: "#222", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.25)", minWidth: 220, padding: 8, fontFamily: "Arial, sans-serif", textShadow: "none" }}>
                  <div style={{ padding: "6px 8px", fontSize: 12, color: "#555", borderBottom: "1px solid #eee" }}>🔕 Gruppe stumm schalten</div>
                  {[
                    { ms: 15 * 60_000, label: "15 Minuten" },
                    { ms: 60 * 60_000, label: "1 Stunde" },
                    { ms: 8 * 3600_000, label: "8 Stunden" },
                    { ms: 24 * 3600_000, label: "24 Stunden" },
                    { ms: 7 * 24 * 3600_000, label: "7 Tage" },
                    { ms: 0, label: "Bis ich's wieder anmache" },
                  ].map((o) => (
                    <button key={o.label} type="button" onClick={() => mute(o.ms)}
                      style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 10px", background: "none", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, color: "#222", marginTop: 2 }}>
                      {o.label}
                    </button>
                  ))}
                  <button type="button" onClick={unmute}
                    style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 10px", background: "none", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, color: "#11a047", marginTop: 4, borderTop: "1px solid #eee" }}>
                    🔔 Stummschaltung beenden
                  </button>
                  <button type="button" onClick={leaveRoom}
                    style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 10px", background: "none", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, color: "#c2185b", marginTop: 4, borderTop: "1px solid #eee" }}>
                    🚪 Gruppe verlassen
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {showMembers && (
          <div style={{ background: "#f6f8fc", borderBottom: "1px solid #e2e6ee", padding: "8px 12px", display: "flex", flexWrap: "wrap", gap: 8 }}>
            {(room.members || []).map((m) => (
              <Link key={m.id} href={`/u/${m.username}`} style={{ display: "flex", alignItems: "center", gap: 6, textDecoration: "none", color: "#222", fontSize: 12, background: "#fff", padding: "4px 8px", borderRadius: 12, border: "1px solid #e2e6ee" }}>
                <Avatar url={m.avatarUrl} name={m.displayName} className="vv-avatar" style={{ width: 22, height: 22 }} />
                <ColoredName gender={m.gender} age={m.age} name={m.displayName} />
                {m.role === "owner" && <span style={{ fontSize: 10, color: "#b58900" }}>👑</span>}
              </Link>
            ))}
          </div>
        )}

        <div className="vv-chat-messages" ref={scrollRef} style={{ background: "linear-gradient(180deg, #eef3fb 0%, #f8fafc 100%)" }}>
          {messages.length === 0 && (
            <div className="vv-muted vv-center" style={{ marginTop: 30 }}>Stille. Sag „Hallo zusammen 👋"!</div>
          )}
          {messages.map((m, idx) => {
            const fromMe = m.fromUserId === me.id;
            const prev = messages[idx - 1];
            const groupStart = !prev || prev.fromUserId !== m.fromUserId || (m.at - prev.at > 5 * 60 * 1000);
            const showTime = !prev || m.at - prev.at > 5 * 60 * 1000;
            return (
              <div key={m.id} style={{ marginBottom: 2 }}>
                {showTime && <div style={{ textAlign: "center", fontSize: 10, color: "#888", margin: "10px 0 4px" }}>{timeShort(m.at)}</div>}
                <div style={{ display: "flex", justifyContent: fromMe ? "flex-end" : "flex-start", alignItems: "flex-end", gap: 6 }}>
                  {!fromMe && (
                    <span style={{ width: 26, flexShrink: 0, visibility: groupStart ? "visible" : "hidden" }}>
                      <Avatar url={m.from?.avatarUrl} name={m.from?.displayName} className="vv-avatar" style={{ width: 26, height: 26 }} />
                    </span>
                  )}
                  <div style={{ maxWidth: "72%", padding: m.kind === "voice" ? "6px 8px" : "8px 12px", borderRadius: 16,
                    background: fromMe ? "linear-gradient(135deg, #2d7dd2, #5fb0ff)" : "#fff",
                    color: fromMe ? "#fff" : "#222",
                    border: fromMe ? "none" : "1px solid #d8def0",
                    boxShadow: fromMe ? "0 2px 6px rgba(45,125,210,0.28)" : "0 1px 2px rgba(0,0,0,0.06)",
                    borderBottomRightRadius: fromMe ? 4 : 16, borderBottomLeftRadius: fromMe ? 16 : 4,
                    wordBreak: "break-word", fontFamily: "Arial, sans-serif", fontSize: 14, lineHeight: 1.35 }}>
                    {!fromMe && groupStart && (
                      <div style={{ fontSize: 11, fontWeight: "bold", color: "#1f5fa8", marginBottom: 3 }}>
                        <ColoredName gender={m.from?.gender} age={m.from?.age} name={m.from?.displayName} />
                      </div>
                    )}
                    {m.kind === "voice" ? (
                      <VoiceMessage message={m} fromMe={fromMe} onConsumed={() => {}} />
                    ) : (
                      <>
                        {m.imageUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={m.imageUrl} alt="" style={{ display: "block", maxWidth: "100%", maxHeight: 280, borderRadius: 10, marginBottom: m.text ? 6 : 0 }} />
                        )}
                        {m.text && <MentionText text={m.text} color={fromMe ? "#e6f0ff" : "#c2185b"} />}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <form className="vv-chat-input-row" onSubmit={submit} style={{ background: "#fff", borderTop: "1px solid #eee", flexDirection: "column", alignItems: "stretch", gap: 6 }}>
          {pendingImage && (
            <div style={{ position: "relative", margin: "4px 6px", display: "inline-block", maxWidth: 160 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={pendingImage} alt="" style={{ maxHeight: 110, maxWidth: "100%", borderRadius: 8 }} />
              <button type="button" onClick={() => setPendingImage(null)} aria-label="Bild entfernen" style={{ position: "absolute", top: -6, right: -6, width: 22, height: 22, borderRadius: "50%", border: "none", background: "#222", color: "#fff", cursor: "pointer", padding: 0 }}>×</button>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <SmileyPicker onPick={(s) => setText((t) => t + s)} />
            <VoiceRecorder onSend={(url) => sendVoice(url)} />
            <button type="button" className="vv-btn" onClick={() => imageRef.current?.click()} title="Foto senden" aria-label="Foto senden">📷</button>
            <input ref={imageRef} type="file" accept="image/*" hidden onChange={onPickChatImage} />
            <input className="vv-input" placeholder={`In „${room.name}" schreiben…`} value={text} onChange={(e) => onTextChange(e.target.value)} />
            <button type="submit" className="vv-btn vv-btn-pink">▶</button>
          </div>
        </form>
      </div>
    </div>
  );
}
