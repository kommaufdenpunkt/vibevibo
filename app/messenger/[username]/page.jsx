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
  const d = new Date(ts);
  return d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

// Bild im Browser auf 600px verkleinern (mittig beschnitten) -> kleines JPEG
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
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
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
function presenceLabel(lastSeen) {
  const diff = Date.now() - (lastSeen || 0);
  if (diff < 90 * 1000) return "online";
  return "zuletzt " + relTime(lastSeen);
}

export default function ChatPage() {
  const params = useParams();
  const partnerName = decodeURIComponent(params.username || "");
  const router = useRouter();
  const { me, loading } = useMe();

  const [partner, setPartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [text, setText] = useState("");
  const [pendingImage, setPendingImage] = useState(null);
  const [error, setError] = useState(null);
  const [retention, setRetention] = useState({ retentionDays: 0, setBy: 0 });
  const [showRetentionMenu, setShowRetentionMenu] = useState(false);

  const scrollRef = useRef(null);
  const imageRef = useRef(null);

  async function onPickChatImage(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) { alert("Bitte ein Bild auswählen."); return; }
    try { setPendingImage(await fileToChatImage(file)); }
    catch { alert("Bild konnte nicht geladen werden."); }
  }

  const reload = useCallback(async () => {
    if (!me) return;
    try {
      const [chat, list] = await Promise.all([
        api.getConversation(partnerName),
        api.listConversations(),
      ]);
      setPartner(chat.partner);
      setMessages(chat.messages);
      setRetention(chat.retention || { retentionDays: 0, setBy: 0 });
      setConversations(list.conversations);
      setError(null);
    } catch (e) {
      if (e.status === 404) setError("User nicht gefunden.");
      else setError(e.message);
    }
  }, [me, partnerName]);

  useEffect(() => {
    if (loading) return;
    if (!me) { router.push("/login"); return; }
    reload();
  }, [me, loading, router, reload]);

  // Beim SSE-Event in diesem Chat -> neu laden (markiert auch als gelesen)
  useMessageStream(!!me, (ev) => {
    const inThisChat =
      (ev.from?.username === partnerName && ev.to?.username === me?.username) ||
      (ev.from?.username === me?.username && ev.to?.username === partnerName);
    if (inThisChat) reload();
    else api.listConversations().then((d) => setConversations(d.conversations)).catch(() => {});
  });

  async function sendVoice(audioUrl, onceOnly) {
    await api.sendVoice(partnerName, audioUrl, onceOnly);
    await reload();
  }

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function submit(e) {
    e.preventDefault();
    const v = text.trim();
    if (!v && !pendingImage) return;
    try {
      const res = await api.sendMessage(partnerName, v, pendingImage);
      setText("");
      setPendingImage(null);
      if (res?.imageNote) alert(res.imageNote);
    } catch (err) {
      alert(err.message);
    }
  }

  async function updateRetention(days) {
    if (days > 0) {
      const label = days === 1 ? "24 Stunden" : days === 7 ? "7 Tagen" : "30 Tagen";
      const ok = window.confirm(
        `Chat-Verlauf nach ${label} automatisch löschen? Das gilt für beide Seiten und löscht auch ältere Nachrichten sofort.`
      );
      if (!ok) return;
    }
    try {
      const res = await api.setChatRetention(partnerName, days);
      setRetention(res.retention || { retentionDays: days, setBy: me?.id });
      setShowRetentionMenu(false);
      await reload();
    } catch (err) {
      alert(err.message);
    }
  }

  async function reportMessage(id) {
    const reason = window.prompt("Warum meldest du diese Nachricht? (Optional)") ?? null;
    if (reason === null) return;
    try {
      await api.reportMessage(id, reason);
      alert("Danke! Die Nachricht wurde gemeldet und wird vom Team geprüft.");
    } catch (err) {
      alert(err.message);
    }
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
  if (!partner) return <div className="vv-card">Lädt…</div>;

  // Zeitstempel nur anzeigen, wenn Gruppe wechselt (>5 Min Pause oder Wechsel des Sprechers)
  function showTimeBetween(prev, cur) {
    if (!prev) return true;
    if (prev.fromMe !== cur.fromMe) return true;
    return cur.at - prev.at > 5 * 60 * 1000;
  }

  return (
    <div className="vv-card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr)", gap: 0 }}>
        <div className="vv-msg-list" style={{ gridTemplateColumns: "230px minmax(0,1fr)" }}>
          {/* Sidebar: Gespraeche */}
          <div className="vv-conversation-list">
            <div style={{ padding: "8px 10px", fontWeight: "bold", borderBottom: "1px solid #eee" }}>✉️ Chats</div>
            {conversations.length === 0 && <div className="vv-muted" style={{ padding: 10 }}>Keine Gespräche.</div>}
            {conversations.map((c) => {
              const isActive = c.partnerUsername === partnerName;
              return (
                <Link
                  key={c.partnerUsername}
                  href={`/messenger/${c.partnerUsername}`}
                  className={`vv-conv-entry${isActive ? " active" : ""}`}
                  style={{ alignItems: "center" }}
                >
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <Avatar url={c.partnerAvatar} name={c.partnerDisplayName} className="vv-avatar vv-avatar-sm" />
                    {c.unread > 0 && (
                      <span style={{ position: "absolute", top: -4, right: -4, minWidth: 18, height: 18, padding: "0 5px", background: "#ff3e9d", color: "#fff", borderRadius: 9, fontSize: 11, fontWeight: "bold", display: "inline-flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>
                        {c.unread > 99 ? "99+" : c.unread}
                      </span>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="vv-conv-name" style={{ display: "flex", justifyContent: "space-between", gap: 4 }}>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        <ColoredName gender={c.partnerGender} age={c.partnerAge} name={c.partnerDisplayName} />
                      </span>
                      <span className="vv-muted" style={{ fontSize: 10, flexShrink: 0 }}>{relTime(c.at)}</span>
                    </div>
                    <div className="vv-conv-preview" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: c.unread > 0 ? "bold" : "normal" }}>
                      {c.fromMe ? "Du: " : ""}{c.lastText}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Chat-Fenster */}
          <div className="vv-chat-window">
            {/* Header (sticky-fühlend) */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "linear-gradient(180deg, #5fb0ff 0%, #2d7dd2 55%, #1f5fa8 100%)", color: "#fff", textShadow: "0 1px 0 rgba(0,0,0,0.25)", fontFamily: "Arial, sans-serif", borderBottom: "1px solid rgba(0,0,0,0.15)" }}>
              <Link href="/messenger" style={{ color: "#fff", fontSize: 18, textDecoration: "none" }} aria-label="Zurück">←</Link>
              <Link href={`/u/${partner.username}`} style={{ flexShrink: 0 }}>
                <Avatar url={partner.avatarUrl} name={partner.displayName} className="vv-avatar vv-avatar-sm" />
              </Link>
              <div style={{ flex: 1, minWidth: 0, lineHeight: 1.2 }}>
                <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "Arial, sans-serif" }}>
                  <strong>
                    {(partner.gender === "m" || partner.gender === "w") && (
                      <span style={{ marginRight: 4 }}>{partner.gender}{partner.age != null ? ` ${partner.age}` : ""}</span>
                    )}
                    {partner.displayName}
                  </strong>
                </div>
                <div style={{ fontSize: 11, opacity: 0.9, display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: partner.online ? "#0aff44" : "#bbb", boxShadow: partner.online ? "0 0 5px #0aff44" : "none" }} />
                  {partner.online ? "online" : presenceLabel(partner.lastSeen)}
                  {partner.mood ? <> · <em style={{ opacity: 0.9 }}>{partner.mood}</em></> : null}
                  {retention.retentionDays > 0 && (
                    <span title="Nachrichten werden in diesem Chat automatisch gelöscht" style={{ marginLeft: 4, background: "rgba(255,255,255,0.18)", padding: "1px 6px", borderRadius: 8 }}>
                      ⏳ {retention.retentionDays === 1 ? "24h" : `${retention.retentionDays} Tage`}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={() => setShowRetentionMenu((v) => !v)}
                  title="Chat-Einstellungen"
                  aria-label="Chat-Einstellungen"
                  style={{ background: "rgba(255,255,255,0.18)", color: "#fff", border: "none", borderRadius: 8, padding: "4px 8px", cursor: "pointer", fontSize: 16 }}
                >⋮</button>
                {showRetentionMenu && (
                  <>
                    <div onClick={() => setShowRetentionMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 5 }} />
                    <div style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 10, background: "#fff", color: "#222", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.25)", minWidth: 230, padding: 8, fontFamily: "Arial, sans-serif", textShadow: "none" }}>
                      <div style={{ padding: "6px 8px", fontSize: 12, color: "#555", borderBottom: "1px solid #eee" }}>
                        ⏳ Chat-Verlauf automatisch löschen
                      </div>
                      {[
                        { d: 0, label: "Aus (manuell)" },
                        { d: 1, label: "Nach 24 Stunden" },
                        { d: 7, label: "Nach 7 Tagen" },
                        { d: 30, label: "Nach 30 Tagen" },
                      ].map((opt) => {
                        const active = retention.retentionDays === opt.d;
                        return (
                          <button
                            key={opt.d}
                            type="button"
                            onClick={() => updateRetention(opt.d)}
                            style={{
                              display: "block", width: "100%", textAlign: "left",
                              padding: "8px 10px", background: active ? "#eef3fb" : "none",
                              border: "none", borderRadius: 6, cursor: "pointer",
                              fontSize: 13, color: "#222", marginTop: 2,
                            }}
                          >
                            {active ? "✓ " : ""}{opt.label}
                          </button>
                        );
                      })}
                      <div style={{ padding: "6px 8px", fontSize: 11, color: "#888", borderTop: "1px solid #eee", marginTop: 4 }}>
                        Gilt für beide Seiten dieses Chats. Sprachnachrichten mit „nur einmal anhören" verschwinden sofort nach dem Abspielen.
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Nachrichten – heller ICQ/MSN-Hintergrund */}
            <div className="vv-chat-messages" ref={scrollRef} style={{ background: "linear-gradient(180deg, #eef3fb 0%, #f8fafc 100%)" }}>
              {messages.length === 0 && (
                <div className="vv-muted vv-center" style={{ marginTop: 30 }}>Sag „Hi 👋"!</div>
              )}
              {messages.map((m, idx) => {
                const prev = messages[idx - 1];
                const showTime = showTimeBetween(prev, m);
                const groupStart = !prev || prev.fromMe !== m.fromMe;
                return (
                  <div key={m.id} style={{ marginBottom: 2 }}>
                    {showTime && (
                      <div style={{ textAlign: "center", fontSize: 10, color: "#888", margin: "10px 0 4px" }}>{timeShort(m.at)}</div>
                    )}
                    <div style={{ display: "flex", justifyContent: m.fromMe ? "flex-end" : "flex-start", alignItems: "flex-end", gap: 6 }}>
                      {!m.fromMe && (
                        <span style={{ width: 26, flexShrink: 0, visibility: groupStart ? "visible" : "hidden" }}>
                          <Avatar url={partner.avatarUrl} name={partner.displayName} className="vv-avatar" style={{ width: 26, height: 26 }} />
                        </span>
                      )}
                      <div style={{
                        maxWidth: "72%", padding: m.kind === "voice" ? "6px 8px" : "8px 12px", borderRadius: 16,
                        background: m.fromMe ? "linear-gradient(135deg, #2d7dd2, #5fb0ff)" : "#fff",
                        color: m.fromMe ? "#fff" : "#222",
                        border: m.fromMe ? "none" : "1px solid #d8def0",
                        boxShadow: m.fromMe ? "0 2px 6px rgba(45,125,210,0.28)" : "0 1px 2px rgba(0,0,0,0.06)",
                        borderBottomRightRadius: m.fromMe ? 4 : 16,
                        borderBottomLeftRadius: m.fromMe ? 16 : 4,
                        wordBreak: "break-word", fontFamily: "Arial, sans-serif", fontSize: 14, lineHeight: 1.35,
                      }}>
                        {m.kind === "voice" ? (
                          <VoiceMessage message={m} fromMe={m.fromMe} onConsumed={reload} />
                        ) : (
                          <>
                            {m.imageUrl && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={m.imageUrl} alt="" style={{ display: "block", maxWidth: "100%", maxHeight: 280, borderRadius: 10, marginBottom: m.text ? 6 : 0 }} />
                            )}
                            {m.text && <MentionText text={m.text} color={m.fromMe ? "#e6f0ff" : "#c2185b"} />}
                          </>
                        )}
                      </div>
                      {m.fromMe && (
                        <span style={{ fontSize: 10, color: m.readAt ? "#2a7fff" : "#bbb", marginBottom: 2 }}>
                          {m.readAt ? "✓✓" : "✓"}
                        </span>
                      )}
                      {!m.fromMe && (
                        <button
                          type="button"
                          onClick={() => reportMessage(m.id)}
                          title="Diese Nachricht melden"
                          aria-label="Melden"
                          style={{ background: "none", border: "none", color: "#bbb", cursor: "pointer", fontSize: 11, padding: 0, alignSelf: "center" }}
                        >🚩</button>
                      )}
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
                  <button type="button" onClick={() => setPendingImage(null)} aria-label="Bild entfernen"
                    style={{ position: "absolute", top: -6, right: -6, width: 22, height: 22, borderRadius: "50%", border: "none", background: "#222", color: "#fff", cursor: "pointer", padding: 0 }}>×</button>
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <SmileyPicker onPick={(s) => setText((t) => t + s)} />
                <VoiceRecorder onSend={sendVoice} />
                <button type="button" className="vv-btn" onClick={() => imageRef.current?.click()} title="Foto senden" aria-label="Foto senden">📷</button>
                <input ref={imageRef} type="file" accept="image/*" hidden onChange={onPickChatImage} />
                <input
                  className="vv-input"
                  placeholder={`Schreib an ${partner.displayName}…`}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
                <button type="submit" className="vv-btn vv-btn-pink">▶</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
