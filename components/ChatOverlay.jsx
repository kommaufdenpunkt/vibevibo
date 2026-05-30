"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useMe } from "@/lib/useMe";
import { api } from "@/lib/api";
import { useMessageStream } from "@/lib/useEventStream";
import { relTime } from "@/lib/format";
import { getPresence } from "@/lib/presence";
import Avatar from "./Avatar";
import PresenceAvatar from "./PresenceAvatar";
import { ColoredName } from "./GenderAge";
import SmileyPicker from "./SmileyPicker";
import VoiceRecorder from "./VoiceRecorder";
import VoiceMessage from "./VoiceMessage";
import CreateRoomDialog from "./CreateRoomDialog";
import MentionText from "./MentionText";

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
  const router = useRouter();
  const { me } = useMe();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState("list"); // "list" | "chat"
  const [activePartner, setActivePartner] = useState(null);
  const [partnerInfo, setPartnerInfo] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [pendingImage, setPendingImage] = useState(null);
  const [query, setQuery] = useState("");
  const [muteMenu, setMuteMenu] = useState(false);
  const [muteUntil, setMuteUntil] = useState(null);
  const [partnerTyping, setPartnerTyping] = useState(0);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [inCall, setInCall] = useState(false);
  const scrollRef = useRef(null);
  const imageRef = useRef(null);
  const typingTimer = useRef(0);

  const hide = !!pathname && (pathname.startsWith("/messenger") || pathname === "/login");

  /* ---------- Daten laden ---------- */

  const loadAll = useCallback(async () => {
    try {
      const [c, u, r, ac] = await Promise.all([
        api.listConversations(), api.listUsers(), api.listRooms(),
        api.activeCalls().catch(() => ({ calls: [] })),
      ]);
      setConversations(c.conversations || []);
      setUsers((u.users || []).filter((x) => x.username !== me?.username));
      setRooms(r.rooms || []);
      setInCall((ac.calls || []).length > 0);
    } catch {}
  }, [me]);

  useEffect(() => {
    if (!me || hide) return;
    loadAll();
    const t = setInterval(loadAll, 25000);
    return () => clearInterval(t);
  }, [me, hide, loadAll]);

  /* ---------- SSE ---------- */

  useMessageStream(!!me && !hide, {
    onMessage: (ev) => {
      if (!ev || ev.fromMe !== false) { loadAll(); return; }
      if (view === "chat" && ev.from?.username === activePartner) {
        api.getConversation(activePartner).then((d) => setMessages(d.messages || [])).catch(() => {});
      }
      loadAll();
    },
    onRoomMessage: () => loadAll(),
    onTyping: (data) => {
      if (view === "chat" && partnerInfo?.id === data.fromUserId && !data.roomId) {
        setPartnerTyping(Date.now());
      }
    },
  });

  useEffect(() => {
    if (!partnerTyping) return;
    const t = setTimeout(() => setPartnerTyping(0), 4000);
    return () => clearTimeout(t);
  }, [partnerTyping]);

  /* ---------- Aktionen ---------- */

  const openChat = useCallback(async (partnerUsername) => {
    if (!partnerUsername) return;
    setActivePartner(partnerUsername);
    setView("chat");
    setText(""); setPendingImage(null); setMuteMenu(false);
    try {
      const d = await api.getConversation(partnerUsername);
      setMessages(d.messages || []);
      setPartnerInfo(d.partner || null);
    } catch {}
  }, []);

  // Mute-Status laden, wenn Partner sich ändert
  useEffect(() => {
    if (!me || !partnerInfo?.id) { setMuteUntil(null); return; }
    api.listMutes().then((d) => {
      const m = (d.mutes || []).find((x) => x.targetType === "user" && x.targetId === partnerInfo.id);
      setMuteUntil(m ? m.untilAt : null);
    }).catch(() => {});
  }, [me, partnerInfo?.id]);

  function backToList() {
    setView("list"); setActivePartner(null); setPartnerInfo(null);
    setMessages([]); setText(""); setPendingImage(null);
    loadAll();
  }

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
    } catch (err) { alert(err.message); }
  }

  function onTextChange(v) {
    setText(v);
    const now = Date.now();
    if (now - typingTimer.current > 2000 && activePartner) {
      typingTimer.current = now;
      api.sendTyping(activePartner, null).catch(() => {});
    }
  }

  async function onPickImage(e) {
    const file = e.target.files?.[0]; e.target.value = "";
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
    } catch (err) { alert(err.message); }
  }

  async function reportMessage(id) {
    const reason = window.prompt("Warum meldest du diese Nachricht? (Optional)") ?? null;
    if (reason === null) return;
    try { await api.reportMessage(id, reason); alert("Danke! Die Nachricht wurde gemeldet."); }
    catch (err) { alert(err.message); }
  }

  async function nudgePartner() {
    try {
      await api.sendNudge(activePartner);
      document.body?.animate?.([{ transform: "translate(0,0)" }, { transform: "translate(-4px,1px)" }, { transform: "translate(4px,-1px)" }, { transform: "translate(0,0)" }], { duration: 240, iterations: 1 });
    } catch (err) { alert(err.message); }
  }
  function startCall(withVideo) {
    window.dispatchEvent(new CustomEvent("vv-start-call", { detail: { type: "1on1", partnerUsername: activePartner, withVideo } }));
  }
  async function muteFor(ms) {
    if (!partnerInfo?.id) return;
    try { const r = await api.setMute("user", partnerInfo.id, ms); setMuteUntil(r.untilAt ?? 0); setMuteMenu(false); }
    catch (err) { alert(err.message); }
  }
  async function unmute() {
    if (!partnerInfo?.id) return;
    try { await api.removeMute("user", partnerInfo.id); setMuteUntil(null); setMuteMenu(false); }
    catch (err) { alert(err.message); }
  }

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, view]);

  /* ---------- Filterung + Sortierung (alle Hooks VOR dem early return) ---------- */

  const q = query.trim().toLowerCase();
  const convoMap = useMemo(() => {
    const m = {};
    for (const c of conversations) m[c.partnerUsername] = c;
    return m;
  }, [conversations]);

  const filteredUsers = useMemo(() => {
    const merged = users.map((u) => ({ user: u, convo: convoMap[u.username] || null }));
    const filtered = q
      ? merged.filter(({ user: u }) =>
          (u.displayName || "").toLowerCase().includes(q) ||
          (u.username || "").toLowerCase().includes(q) ||
          (u.mood || "").toLowerCase().includes(q))
      : merged;
    return filtered.sort((a, b) => {
      if (a.user.online !== b.user.online) return a.user.online ? -1 : 1;
      const aT = a.convo?.at || a.user.lastSeen || 0;
      const bT = b.convo?.at || b.user.lastSeen || 0;
      return bT - aT;
    });
  }, [users, convoMap, q]);

  const filteredRooms = useMemo(() => {
    if (!q) return rooms;
    return rooms.filter((r) => (r.name || "").toLowerCase().includes(q));
  }, [rooms, q]);

  if (!me || hide) return null;

  const totalUnread =
    conversations.reduce((s, c) => s + (c.unread || 0), 0) +
    rooms.reduce((s, r) => s + (r.unread || 0), 0);
  const onlineCount = users.filter((u) => u.online).length;
  const partnerPresence = partnerInfo ? getPresence({ statusText: partnerInfo.mood, presence: partnerInfo.presence, online: partnerInfo.online }) : null;

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
          width: "min(380px, 94vw)", height: view === "chat" ? "78vh" : "min(78vh, 620px)",
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
              <>
                <div style={{ flex: 1, fontWeight: "bold", fontSize: 14, minWidth: 0 }}>
                  💬 Chats · <span style={{ color: "#bff5cc" }}>{onlineCount} online</span>
                  {totalUnread > 0 && <> · {totalUnread} ungelesen</>}
                </div>
                <button type="button" onClick={() => setCreatingRoom(true)} title="Gruppe erstellen"
                  style={{ color: "#fff", background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 8, padding: "4px 8px", cursor: "pointer", fontSize: 12, fontWeight: "bold" }}>
                  + Gruppe
                </button>
              </>
            ) : (
              <>
                <PresenceAvatar
                  url={partnerInfo?.avatarUrl}
                  name={partnerInfo?.displayName || activePartner}
                  presenceInfo={partnerPresence}
                  size={36}
                  className="vv-avatar vv-avatar-sm"
                />
                <div style={{ flex: 1, minWidth: 0, lineHeight: 1.2 }}>
                  <div style={{ fontWeight: "bold", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13 }}>
                    {partnerInfo?.gender ? `${partnerInfo.gender}${partnerInfo.age != null ? ` ${partnerInfo.age}` : ""} ` : ""}
                    {partnerInfo?.displayName || activePartner}
                  </div>
                  <div style={{ fontSize: 10, opacity: 0.95, display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {partnerPresence && <span style={{ color: "#fff" }}>● {partnerPresence.label}</span>}
                    {muteUntil !== null && <span title="Stumm">🔕</span>}
                    {partnerInfo?.mood && <em style={{ opacity: 0.95 }}>· {partnerInfo.mood}</em>}
                  </div>
                </div>
                <button type="button" onClick={() => startCall(false)} title="Anrufen" aria-label="Anrufen"
                  style={{ color: "#fff", background: "rgba(255,255,255,0.18)", border: "none", borderRadius: 6, padding: "2px 6px", cursor: "pointer", fontSize: 13 }}>📞</button>
                <button type="button" onClick={() => startCall(true)} title="Video-Anruf" aria-label="Video"
                  style={{ color: "#fff", background: "rgba(255,255,255,0.18)", border: "none", borderRadius: 6, padding: "2px 6px", cursor: "pointer", fontSize: 13 }}>📹</button>
                <button type="button" onClick={nudgePartner} title="Anklopfen" aria-label="Anklopfen"
                  style={{ color: "#fff", background: "rgba(255,255,255,0.18)", border: "none", borderRadius: 6, padding: "2px 6px", cursor: "pointer", fontSize: 13 }}>👋</button>
                <div style={{ position: "relative" }}>
                  <button type="button" onClick={() => setMuteMenu((v) => !v)} title="Optionen"
                    style={{ color: "#fff", background: "rgba(255,255,255,0.18)", border: "none", borderRadius: 6, padding: "2px 6px", cursor: "pointer", fontSize: 13 }}>⋮</button>
                  {muteMenu && (
                    <>
                      <div onClick={() => setMuteMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 9 }} />
                      <div style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 10, background: "#fff", color: "#222", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.25)", minWidth: 200, padding: 8, textShadow: "none" }}>
                        <div style={{ padding: "6px 8px", fontSize: 12, color: "#555", borderBottom: "1px solid #eee" }}>🔕 Stumm schalten</div>
                        {[
                          { ms: 15 * 60_000, label: "15 Minuten" },
                          { ms: 60 * 60_000, label: "1 Stunde" },
                          { ms: 8 * 3600_000, label: "8 Stunden" },
                          { ms: 24 * 3600_000, label: "24 Stunden" },
                          { ms: 0, label: "Bis ich's wieder anmache" },
                        ].map((o) => (
                          <button key={o.label} type="button" onClick={() => muteFor(o.ms)}
                            style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 10px", background: "none", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, color: "#222" }}>
                            {o.label}
                          </button>
                        ))}
                        {muteUntil !== null && (
                          <button type="button" onClick={unmute}
                            style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 10px", background: "none", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, color: "#11a047", marginTop: 4, borderTop: "1px solid #eee" }}>
                            🔔 Wieder anmachen
                          </button>
                        )}
                        <button type="button" onClick={() => { setMuteMenu(false); router.push(`/messenger/${activePartner}`); setOpen(false); }}
                          style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 10px", background: "none", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, color: "#1f5fa8", marginTop: 4, borderTop: "1px solid #eee" }}>
                          ↗ Großer Messenger
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
            <button type="button" onClick={() => setOpen(false)} aria-label="Schließen"
              style={{ color: "#fff", background: "none", border: "none", fontSize: 18, cursor: "pointer", padding: 0 }}>×</button>
          </div>

          {view === "list" ? (
            <>
              {inCall && (
                <div style={{ background: "#0d8a3f", color: "#fff", padding: "6px 12px", fontSize: 12, display: "flex", alignItems: "center", gap: 8 }}>
                  <span>📞 Du bist in einem Live-Anruf.</span>
                </div>
              )}
              {/* Suchleiste */}
              <div style={{ padding: 8, borderBottom: "1px solid #f0f0f5", background: "#fafafd" }}>
                <input
                  type="search" value={query} onChange={(e) => setQuery(e.target.value)}
                  placeholder="🔍 Personen, Gruppen, Status…"
                  className="vv-input"
                  style={{ width: "100%", margin: 0, fontSize: 13, padding: "6px 10px" }}
                />
              </div>

              <div style={{ overflowY: "auto", flex: 1 }}>
                {filteredRooms.length > 0 && (
                  <>
                    <div style={{ padding: "6px 12px", fontSize: 11, color: "#555", background: "#f6f8fc", fontWeight: "bold" }}>👯 Gruppen</div>
                    {filteredRooms.map((r) => (
                      <Link key={r.id} href={`/messenger/rooms/${r.id}`} onClick={() => setOpen(false)}
                        style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderBottom: "1px solid #f0f0f5", textDecoration: "none", color: "#222", background: r.unread > 0 ? "#fff5fb" : "#fff" }}>
                        <div style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg,#f7e0b0,#ffd9ec)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, position: "relative", flexShrink: 0 }}>
                          <span>{r.emoji || "💬"}</span>
                          {r.unread > 0 && (
                            <span style={{ position: "absolute", top: -4, right: -4, minWidth: 18, height: 18, padding: "0 5px", background: "#ff3e9d", color: "#fff", borderRadius: 9, fontSize: 11, fontWeight: "bold", display: "inline-flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>{r.unread > 99 ? "99+" : r.unread}</span>
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: "bold", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</div>
                          <div style={{ fontSize: 11, color: "#666", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: r.unread > 0 ? "bold" : "normal" }}>
                            {r.lastText || <span style={{ color: "#aaa" }}>noch nichts geschrieben</span>}
                          </div>
                        </div>
                        {r.lastAt && <span style={{ fontSize: 10, color: "#aaa", flexShrink: 0 }}>{relTime(r.lastAt)}</span>}
                      </Link>
                    ))}
                  </>
                )}

                {filteredUsers.length > 0 && (
                  <div style={{ padding: "6px 12px", fontSize: 11, color: "#555", background: "#f6f8fc", fontWeight: "bold" }}>💬 Freunde</div>
                )}
                {filteredUsers.map(({ user: u, convo }) => {
                  const presenceInfo = getPresence({ statusText: u.mood, presence: u.presence, online: u.online });
                  return (
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
                      <PresenceAvatar url={u.avatarUrl} name={u.displayName} presenceInfo={presenceInfo} size={34} className="vv-avatar vv-avatar-sm" />
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
                      {convo?.unread > 0 && (
                        <span style={{ minWidth: 18, height: 18, padding: "0 5px", background: "#ff3e9d", color: "#fff", borderRadius: 9, fontSize: 11, fontWeight: "bold", display: "inline-flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>{convo.unread > 99 ? "99+" : convo.unread}</span>
                      )}
                      <span style={{ fontSize: 10, color: "#aaa", flexShrink: 0 }}>{convo ? relTime(convo.at) : ""}</span>
                    </button>
                  );
                })}

                {filteredUsers.length === 0 && filteredRooms.length === 0 && (
                  <div className="vv-muted" style={{ padding: 16, textAlign: "center", fontSize: 13 }}>
                    {q ? "Nichts gefunden." : "Noch keine Mitglieder."}
                  </div>
                )}
              </div>
            </>
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
                        ? <VoiceMessage message={m} fromMe={m.fromMe} onConsumed={() => activePartner && api.getConversation(activePartner).then((d) => setMessages(d.messages || [])).catch(() => {})} />
                        : (m.text ? <MentionText text={m.text} color={m.fromMe ? "#e6f0ff" : "#c2185b"} /> : null)}
                    </div>
                    {!m.fromMe && (
                      <button type="button" onClick={() => reportMessage(m.id)} title="Melden" aria-label="Melden"
                        style={{ background: "none", border: "none", color: "#bbb", cursor: "pointer", fontSize: 11, padding: 0 }}>🚩</button>
                    )}
                  </div>
                ))}
              </div>
              {partnerTyping > 0 && (
                <div style={{ fontSize: 11, color: "#1f5fa8", padding: "2px 12px", fontStyle: "italic", background: "#fafafd" }}>
                  {partnerInfo?.displayName || activePartner} schreibt…
                </div>
              )}
              <form onSubmit={send} style={{ borderTop: "1px solid #eee", background: "#fff", padding: 6 }}>
                {pendingImage && (
                  <div style={{ position: "relative", display: "inline-block", margin: "0 4px 4px", maxWidth: 140 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={pendingImage} alt="" style={{ maxHeight: 80, maxWidth: "100%", borderRadius: 8 }} />
                    <button type="button" onClick={() => setPendingImage(null)} aria-label="Entfernen"
                      style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", border: "none", background: "#222", color: "#fff", cursor: "pointer", padding: 0, fontSize: 12 }}>×</button>
                  </div>
                )}
                {/* Zeile 1: Aktions-Buttons */}
                <div style={{ display: "flex", gap: 4, alignItems: "center", marginBottom: 6 }}>
                  <SmileyPicker onPick={(s) => setText((t) => t + s)} />
                  <VoiceRecorder onSend={sendVoice} />
                  <button type="button" className="vv-btn" onClick={() => imageRef.current?.click()} title="Foto" aria-label="Foto">📷</button>
                  <input ref={imageRef} type="file" accept="image/*" hidden onChange={onPickImage} />
                </div>
                {/* Zeile 2: Eingabefeld + Senden */}
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  <input
                    value={text}
                    onChange={(e) => onTextChange(e.target.value)}
                    className="vv-input"
                    style={{ flex: 1, margin: 0, fontSize: 14, minWidth: 0 }}
                    placeholder={`An ${partnerInfo?.displayName || activePartner}…`}
                  />
                  <button type="submit" className="vv-btn vv-btn-pink" disabled={!text.trim() && !pendingImage} style={{ flexShrink: 0 }}>▶</button>
                </div>
              </form>
              <div style={{ padding: "6px 10px", borderTop: "1px solid #eee", background: "#fafafd", fontSize: 11, textAlign: "right" }}>
                <Link href={`/messenger/${activePartner}`} onClick={() => setOpen(false)}>↗ Im großen Messenger öffnen</Link>
              </div>
            </>
          )}
        </div>
      )}

      {creatingRoom && (
        <CreateRoomDialog
          users={users}
          onClose={() => setCreatingRoom(false)}
          onCreated={(room) => {
            setCreatingRoom(false);
            loadAll();
            router.push(`/messenger/rooms/${room.id}`);
            setOpen(false);
          }}
        />
      )}
    </>
  );
}
