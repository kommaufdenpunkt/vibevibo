"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMe } from "@/lib/useMe";
import { api } from "@/lib/api";
import { useMessageStream } from "@/lib/useEventStream";
import { relTime } from "@/lib/format";
import Avatar from "./Avatar";
import { ColoredName } from "./GenderAge";

export default function ChatOverlay() {
  const pathname = usePathname();
  const { me } = useMe();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState("list"); // "list" | "chat"
  const [activePartner, setActivePartner] = useState(null);
  const [partnerInfo, setPartnerInfo] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const scrollRef = useRef(null);

  // Auf den eigentlichen Messenger-Seiten verstecken (sonst doppelt)
  const hide = !!pathname && pathname.startsWith("/messenger");

  // Konversationsliste laden + alle 25s aktualisieren
  useEffect(() => {
    if (!me || hide) return;
    const load = () => api.listConversations().then((d) => setConversations(d.conversations || [])).catch(() => {});
    load();
    const t = setInterval(load, 25000);
    return () => clearInterval(t);
  }, [me, hide]);

  async function openChat(partnerUsername) {
    if (!partnerUsername) return;
    setActivePartner(partnerUsername);
    setView("chat");
    try {
      const d = await api.getConversation(partnerUsername);
      setMessages(d.messages || []);
      setPartnerInfo(d.partner || null);
    } catch { /* ignore */ }
  }

  function backToList() {
    setView("list");
    setActivePartner(null);
    setMessages([]);
    setPartnerInfo(null);
    api.listConversations().then((d) => setConversations(d.conversations || [])).catch(() => {});
  }

  // SSE: neue eingehende Nachricht -> Overlay aufploppen + den Chat aufmachen
  useMessageStream(!!me && !hide, (ev) => {
    if (!ev || ev.fromMe !== false) return;
    if (view === "chat" && ev.from?.username === activePartner) {
      api.getConversation(activePartner).then((d) => setMessages(d.messages || [])).catch(() => {});
    } else if (ev.from?.username) {
      setOpen(true);
      openChat(ev.from.username);
    }
    api.listConversations().then((d) => setConversations(d.conversations || [])).catch(() => {});
  });

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, view]);

  async function send(e) {
    e.preventDefault();
    const v = text.trim();
    if (!v || !activePartner) return;
    try {
      await api.sendMessage(activePartner, v);
      setText("");
      const d = await api.getConversation(activePartner);
      setMessages(d.messages || []);
    } catch (err) {
      alert(err.message);
    }
  }

  if (!me || hide) return null;

  const totalUnread = conversations.reduce((s, c) => s + (c.unread || 0), 0);

  return (
    <>
      {/* Floating Chat-Button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Chats öffnen"
        style={{
          position: "fixed", bottom: 18, right: 18, zIndex: 100,
          width: 58, height: 58, borderRadius: "50%", border: "none",
          background: "linear-gradient(135deg, #2d7dd2, #5fb0ff)",
          color: "#fff", fontSize: 26, cursor: "pointer",
          boxShadow: "0 6px 20px rgba(0,0,0,0.32)",
        }}
      >
        💬
        {totalUnread > 0 && (
          <span style={{
            position: "absolute", top: -2, right: -2, minWidth: 22, height: 22,
            padding: "0 6px", background: "#ff3e9d", color: "#fff",
            borderRadius: 11, fontSize: 12, fontWeight: "bold",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            border: "2px solid #fff", lineHeight: 1,
          }}>{totalUnread > 99 ? "99+" : totalUnread}</span>
        )}
      </button>

      {open && (
        <div style={{
          position: "fixed", bottom: 86, right: 18, zIndex: 99,
          width: "min(360px, 92vw)", maxHeight: "75vh", height: view === "chat" ? "75vh" : "auto",
          background: "#fff", borderRadius: 14, overflow: "hidden",
          boxShadow: "0 16px 50px rgba(0,0,0,0.34)",
          display: "flex", flexDirection: "column",
          fontFamily: "Arial, sans-serif",
        }}>
          {/* Kopfleiste */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8, padding: "10px 12px",
            background: "linear-gradient(180deg, #5fb0ff 0%, #2d7dd2 55%, #1f5fa8 100%)",
            color: "#fff", textShadow: "0 1px 0 rgba(0,0,0,0.25)",
          }}>
            {view === "chat" && (
              <button type="button" onClick={backToList} aria-label="Zurück"
                style={{ color: "#fff", background: "none", border: "none", fontSize: 18, cursor: "pointer", padding: 0 }}>←</button>
            )}
            {view === "list" ? (
              <div style={{ flex: 1, fontWeight: "bold", fontSize: 14 }}>
                💬 Chats{totalUnread > 0 ? ` · ${totalUnread} ungelesen` : ""}
              </div>
            ) : (
              <>
                <Avatar url={partnerInfo?.avatarUrl} name={partnerInfo?.displayName || activePartner} className="vv-avatar vv-avatar-sm" />
                <div style={{ flex: 1, minWidth: 0, lineHeight: 1.2 }}>
                  <div style={{ fontWeight: "bold", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13 }}>
                    {partnerInfo?.gender ? `${partnerInfo.gender}${partnerInfo.age != null ? ` ${partnerInfo.age}` : ""} ` : ""}
                    {partnerInfo?.displayName || activePartner}
                  </div>
                  <div style={{ fontSize: 10, opacity: 0.95 }}>
                    {partnerInfo?.online ? "🟢 online" : "offline"}
                  </div>
                </div>
              </>
            )}
            <button type="button" onClick={() => setOpen(false)} aria-label="Schließen"
              style={{ color: "#fff", background: "none", border: "none", fontSize: 18, cursor: "pointer", padding: 0 }}>×</button>
          </div>

          {view === "list" ? (
            <div style={{ overflowY: "auto", maxHeight: "60vh" }}>
              {conversations.length === 0 ? (
                <div className="vv-muted" style={{ padding: 16, textAlign: "center", fontSize: 13 }}>
                  Noch keine Chats. <Link href="/messenger" onClick={() => setOpen(false)}>jemandem schreiben</Link>
                </div>
              ) : (
                conversations.slice(0, 20).map((c) => (
                  <button
                    key={c.partnerUsername}
                    type="button"
                    onClick={() => openChat(c.partnerUsername)}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
                      background: c.unread > 0 ? "#fff5fb" : "#fff", border: "none",
                      borderBottom: "1px solid #f0f0f5", cursor: "pointer", textAlign: "left",
                    }}
                  >
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      <Avatar url={c.partnerAvatar} name={c.partnerDisplayName} className="vv-avatar vv-avatar-sm" />
                      {c.unread > 0 && (
                        <span style={{ position: "absolute", top: -4, right: -4, minWidth: 18, height: 18, padding: "0 5px", background: "#ff3e9d", color: "#fff", borderRadius: 9, fontSize: 11, fontWeight: "bold", display: "inline-flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>
                          {c.unread > 99 ? "99+" : c.unread}
                        </span>
                      )}
                    </div>
                    <span style={{ flex: 1, minWidth: 0, color: "#222" }}>
                      <span style={{ display: "block", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        <ColoredName gender={c.partnerGender} age={c.partnerAge} name={c.partnerDisplayName} />
                      </span>
                      <span style={{ display: "block", fontSize: 11, color: "#666", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: c.unread > 0 ? "bold" : "normal" }}>
                        {c.fromMe ? "Du: " : ""}{c.lastText}
                      </span>
                    </span>
                    <span style={{ fontSize: 10, color: "#aaa", flexShrink: 0 }}>{relTime(c.at)}</span>
                  </button>
                ))
              )}
            </div>
          ) : (
            <>
              <div ref={scrollRef} style={{ overflowY: "auto", flex: 1, padding: "10px 8px", background: "linear-gradient(180deg, #eef3fb 0%, #f8fafc 100%)" }}>
                {messages.length === 0 && (
                  <div className="vv-muted vv-center" style={{ marginTop: 30 }}>Sag „Hi 👋"!</div>
                )}
                {messages.map((m) => (
                  <div key={m.id} style={{ display: "flex", justifyContent: m.fromMe ? "flex-end" : "flex-start", marginBottom: 4 }}>
                    <div style={{
                      maxWidth: "78%", padding: "6px 10px", borderRadius: 14,
                      background: m.fromMe ? "linear-gradient(135deg, #2d7dd2, #5fb0ff)" : "#fff",
                      color: m.fromMe ? "#fff" : "#222",
                      border: m.fromMe ? "none" : "1px solid #d8def0",
                      boxShadow: m.fromMe ? "0 2px 6px rgba(45,125,210,0.25)" : "0 1px 2px rgba(0,0,0,0.06)",
                      borderBottomRightRadius: m.fromMe ? 4 : 14,
                      borderBottomLeftRadius: m.fromMe ? 14 : 4,
                      fontSize: 13, lineHeight: 1.3, wordBreak: "break-word",
                    }}>
                      {m.kind === "voice" ? "🎤 Sprachnachricht (im großen Messenger anhören)" : m.text}
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={send} style={{ display: "flex", gap: 4, padding: 8, borderTop: "1px solid #eee", background: "#fff" }}>
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="vv-input"
                  style={{ flex: 1, margin: 0, fontSize: 13 }}
                  placeholder={`An ${partnerInfo?.displayName || activePartner}…`}
                />
                <button type="submit" className="vv-btn vv-btn-pink" disabled={!text.trim()}>▶</button>
              </form>
              <div style={{ padding: "6px 10px", borderTop: "1px solid #eee", background: "#fafafd", fontSize: 11, textAlign: "right" }}>
                <Link href={`/messenger/${activePartner}`} onClick={() => setOpen(false)}>↗ Im großen Messenger öffnen</Link>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
