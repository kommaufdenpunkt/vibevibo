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
import SmileyPicker from "./SmileyPicker";
import VoiceRecorder from "./VoiceRecorder";

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

export default function ChatOverlay() {
  const pathname = usePathname();
  const { me } = useMe();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState("list"); // "list" | "chat"
  const [activePartner, setActivePartner] = useState(null);
  const [partnerInfo, setPartnerInfo] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [pendingImage, setPendingImage] = useState(null);
  const scrollRef = useRef(null);
  const imageRef = useRef(null);

  const hide = !!pathname && pathname.startsWith("/messenger");

  useEffect(() => {
    if (!me || hide) return;
    const load = async () => {
      try {
        const [c, u] = await Promise.all([api.listConversations(), api.listUsers()]);
        setConversations(c.conversations || []);
        setUsers((u.users || []).filter((x) => x.username !== me.username));
      } catch { /* ignore */ }
    };
    load();
    const t = setInterval(load, 25000);
    return () => clearInterval(t);
  }, [me, hide]);

  async function openChat(partnerUsername) {
    if (!partnerUsername) return;
    setActivePartner(partnerUsername);
    setView("chat");
    setText(""); setPendingImage(null);
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
    setText(""); setPendingImage(null);
    api.listConversations().then((d) => setConversations(d.conversations || [])).catch(() => {});
  }

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
    if ((!v && !pendingImage) || !activePartner) return;
    try {
      const res = await api.sendMessage(activePartner, v, pendingImage);
      setText(""); setPendingImage(null);
      if (res?.imageNote) alert(res.imageNote);
      const d = await api.getConversation(activePartner);
      setMessages(d.messages || []);
    } catch (err) {
      alert(err.message);
    }
  }

  async function onPickImage(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) { alert("Bitte ein Bild auswählen."); return; }
    try { setPendingImage(await fileToChatImage(file)); }
    catch { alert("Bild konnte nicht geladen werden."); }
  }

  async function sendVoice(audioUrl, onceOnly) {
    if (!activePartner) return;
    try {
      await api.sendVoice(activePartner, audioUrl, onceOnly);
      const d = await api.getConversation(activePartner);
      setMessages(d.messages || []);
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

  if (!me || hide) return null;

  // Konversations-Map fuer schnellen Lookup
  const convoMap = {};
  for (const c of conversations) convoMap[c.partnerUsername] = c;

  // Merge: jeder User mit optionalem Convo-Info; sortieren: online > recency
  const merged = users.map((u) => ({ user: u, convo: convoMap[u.username] || null }))
    .sort((a, b) => {
      if (a.user.online !== b.user.online) return a.user.online ? -1 : 1;
      const aT = a.convo?.at || a.user.lastSeen || 0;
      const bT = b.convo?.at || b.user.lastSeen || 0;
      return bT - aT;
    });

  const totalUnread = conversations.reduce((s, c) => s + (c.unread || 0), 0);
  const onlineCount = users.filter((u) => u.online).length;

  return (
    <>
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
          width: "min(360px, 92vw)", height: view === "chat" ? "75vh" : "min(72vh, 560px)",
          background: "#fff", borderRadius: 14, overflow: "hidden",
          boxShadow: "0 16px 50px rgba(0,0,0,0.34)",
          display: "flex", flexDirection: "column",
          fontFamily: "Arial, sans-serif",
        }}>
          {/* Kopfleiste (MSN-blau) */}
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
                💬 Freunde · <span style={{ color: "#bff5cc" }}>{onlineCount} online</span>
                {totalUnread > 0 && <> · {totalUnread} ungelesen</>}
              </div>
            ) : (
              <>
                <Avatar url={partnerInfo?.avatarUrl} name={partnerInfo?.displayName || activePartner} className="vv-avatar vv-avatar-sm" />
                <div style={{ flex: 1, minWidth: 0, lineHeight: 1.2 }}>
                  <div style={{ fontWeight: "bold", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13 }}>
                    {partnerInfo?.gender ? `${partnerInfo.gender}${partnerInfo.age != null ? ` ${partnerInfo.age}` : ""} ` : ""}
                    {partnerInfo?.displayName || activePartner}
                  </div>
                  <div style={{ fontSize: 10, opacity: 0.95 }}>{partnerInfo?.online ? "🟢 online" : "offline"}</div>
                </div>
              </>
            )}
            <button type="button" onClick={() => setOpen(false)} aria-label="Schließen"
              style={{ color: "#fff", background: "none", border: "none", fontSize: 18, cursor: "pointer", padding: 0 }}>×</button>
          </div>

          {view === "list" ? (
            <div style={{ overflowY: "auto", flex: 1 }}>
              {merged.length === 0 ? (
                <div className="vv-muted" style={{ padding: 16, textAlign: "center", fontSize: 13 }}>
                  Noch keine Mitglieder.
                </div>
              ) : (
                merged.map(({ user: u, convo }) => (
                  <button
                    key={u.username}
                    type="button"
                    onClick={() => openChat(u.username)}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
                      background: convo?.unread > 0 ? "#fff5fb" : "#fff", border: "none",
                      borderBottom: "1px solid #f0f0f5", cursor: "pointer", textAlign: "left",
                    }}
                  >
                    {/* Gruener Punkt VOR dem Mini-Avatar, wenn online */}
                    <span style={{
                      width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                      background: u.online ? "#0aff44" : "transparent",
                      boxShadow: u.online ? "0 0 5px rgba(10,255,68,0.7)" : "none",
                      visibility: u.online ? "visible" : "hidden",
                    }} />
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      <Avatar url={u.avatarUrl} name={u.displayName} className="vv-avatar vv-avatar-sm" />
                      {convo?.unread > 0 && (
                        <span style={{ position: "absolute", top: -4, right: -4, minWidth: 18, height: 18, padding: "0 5px", background: "#ff3e9d", color: "#fff", borderRadius: 9, fontSize: 11, fontWeight: "bold", display: "inline-flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>
                          {convo.unread > 99 ? "99+" : convo.unread}
                        </span>
                      )}
                    </div>
                    <span style={{ flex: 1, minWidth: 0, color: "#222" }}>
                      <span style={{ display: "block", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        <ColoredName gender={u.gender} age={u.age} name={u.displayName} />
                      </span>
                      {convo ? (
                        <span style={{ display: "block", fontSize: 11, color: "#666", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: convo.unread > 0 ? "bold" : "normal" }}>
                          {convo.fromMe ? "Du: " : ""}{convo.lastText}
                        </span>
                      ) : (
                        u.mood && <span style={{ display: "block", fontSize: 11, color: "#888", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.mood}</span>
                      )}
                    </span>
                    <span style={{ fontSize: 10, color: "#aaa", flexShrink: 0 }}>{convo ? relTime(convo.at) : ""}</span>
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
                  <div key={m.id} style={{ display: "flex", justifyContent: m.fromMe ? "flex-end" : "flex-start", alignItems: "flex-end", gap: 4, marginBottom: 4 }}>
                    <div style={{
                      maxWidth: "78%", padding: m.imageUrl ? "4px" : "6px 10px", borderRadius: 14,
                      background: m.fromMe ? "linear-gradient(135deg, #2d7dd2, #5fb0ff)" : "#fff",
                      color: m.fromMe ? "#fff" : "#222",
                      border: m.fromMe ? "none" : "1px solid #d8def0",
                      boxShadow: m.fromMe ? "0 2px 6px rgba(45,125,210,0.25)" : "0 1px 2px rgba(0,0,0,0.06)",
                      borderBottomRightRadius: m.fromMe ? 4 : 14,
                      borderBottomLeftRadius: m.fromMe ? 14 : 4,
                      fontSize: 13, lineHeight: 1.3, wordBreak: "break-word",
                    }}>
                      {m.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.imageUrl} alt="" style={{ display: "block", maxWidth: "100%", maxHeight: 220, borderRadius: 10, marginBottom: m.text ? 4 : 0 }} />
                      )}
                      {m.kind === "voice"
                        ? "🎤 Sprachnachricht (im großen Messenger anhören)"
                        : (m.text || null)}
                    </div>
                    {!m.fromMe && (
                      <button type="button" onClick={() => reportMessage(m.id)} title="Melden" aria-label="Melden"
                        style={{ background: "none", border: "none", color: "#bbb", cursor: "pointer", fontSize: 11, padding: 0 }}>🚩</button>
                    )}
                  </div>
                ))}
              </div>
              <form onSubmit={send} style={{ borderTop: "1px solid #eee", background: "#fff", padding: 6 }}>
                {pendingImage && (
                  <div style={{ position: "relative", display: "inline-block", margin: "0 4px 4px", maxWidth: 140 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={pendingImage} alt="" style={{ maxHeight: 80, maxWidth: "100%", borderRadius: 8 }} />
                    <button type="button" onClick={() => setPendingImage(null)} aria-label="Entfernen"
                      style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", border: "none", background: "#222", color: "#fff", cursor: "pointer", padding: 0, fontSize: 12 }}>×</button>
                  </div>
                )}
                <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
                  <SmileyPicker onPick={(s) => setText((t) => t + s)} />
                  <VoiceRecorder onSend={sendVoice} />
                  <button type="button" className="vv-btn" onClick={() => imageRef.current?.click()} title="Foto" aria-label="Foto">📷</button>
                  <input ref={imageRef} type="file" accept="image/*" hidden onChange={onPickImage} />
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="vv-input"
                    style={{ flex: "1 1 100px", margin: 0, fontSize: 13, minWidth: 80 }}
                    placeholder={`An ${partnerInfo?.displayName || activePartner}…`}
                  />
                  <button type="submit" className="vv-btn vv-btn-pink" disabled={!text.trim() && !pendingImage}>▶</button>
                </div>
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
