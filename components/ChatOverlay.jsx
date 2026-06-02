"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useMe } from "@/lib/useMe";
import { api } from "@/lib/api";
import { useMessageStream } from "@/lib/useEventStream";
import { relTime } from "@/lib/format";
import { getPresence } from "@/lib/presence";
import ActivityBars from "./ActivityBars";
import OnlineName from "./OnlineName";
import { activityLevel, isOnlineActivity, formatLastActive } from "@/lib/activity";
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
  const [vibes, setVibes] = useState(null);
  // Button-Upgrade
  const [isDesktop, setIsDesktop] = useState(false);
  const [pulse, setPulse] = useState(false);       // Puls-Animation bei neuer Nachricht
  const [toast, setToast] = useState(null);         // Vorschau-Sprechblase {partner,name,text,avatar}
  const [pressMenu, setPressMenu] = useState(false); // Long-Press-Schnellmenü
  const scrollRef = useRef(null);
  const imageRef = useRef(null);
  const typingTimer = useRef(0);
  const prevUnreadRef = useRef(-1);
  const pressTimer = useRef(0);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 900);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Body-Scroll-Lock wenn Overlay offen — Hintergrund-Page bleibt stehen
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Wann der Chat-Button versteckt wird:
  // - immer auf /login
  // - auf Mobile: überall in /messenger (dort gibt's die Vollbild-PWA)
  // - auf Desktop: nur in den Chat-Detailseiten (/messenger/<name>),
  //   aber NICHT auf /messenger?tab=vibo & Co. → Button bleibt sichtbar
  const onMessenger = !!pathname && pathname.startsWith("/messenger") && pathname !== "/messenger/manifest.webmanifest";
  const onMessengerDetail = !!pathname && /^\/messenger\/.+/.test(pathname);
  const hide = pathname === "/login"
    || (onMessenger && (!isDesktop || onMessengerDetail));

  /* ---------- Daten laden ---------- */

  const loadAll = useCallback(async () => {
    try {
      const [c, u, r, ac, v] = await Promise.all([
        api.listConversations(), api.listUsers(), api.listRooms(),
        api.activeCalls().catch(() => ({ calls: [] })),
        api.credits().catch(() => null),
      ]);
      setConversations(c.conversations || []);
      setUsers((u.users || []).filter((x) => x.username !== me?.username));
      setRooms(r.rooms || []);
      setInCall((ac.calls || []).length > 0);
      setVibes(v);
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

  // Mute-Menü schließen wenn außerhalb geklickt wird
  useEffect(() => {
    if (!muteMenu) return;
    const onClick = (e) => {
      if (!e.target.closest?.("[data-mute-menu], [data-mute-trigger]")) {
        setMuteMenu(false);
      }
    };
    setTimeout(() => document.addEventListener("click", onClick), 0);
    return () => document.removeEventListener("click", onClick);
  }, [muteMenu]);

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

  // ESC schließt das Overlay
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        if (view === "chat") backToList();
        else setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, view]);

  // Von außen öffenbar (z.B. Menü-Punkt "Nachrichten" auf Desktop).
  // Optionales detail.partner öffnet direkt einen bestimmten Chat.
  useEffect(() => {
    const onOpen = (e) => {
      setOpen(true);
      const partner = e?.detail?.partner;
      if (partner) openChat(partner);
      else setView("list");
    };
    window.addEventListener("vv-open-chat-overlay", onOpen);
    return () => window.removeEventListener("vv-open-chat-overlay", onOpen);
  }, [openChat]);

  // Neue Nachricht erkannt → Puls-Animation + Vorschau-Sprechblase
  useEffect(() => {
    const total =
      conversations.reduce((s, c) => s + (c.unread || 0), 0) +
      rooms.reduce((s, r) => s + (r.unread || 0), 0);
    const prev = prevUnreadRef.current;
    prevUnreadRef.current = total;
    if (prev < 0) return;                 // erster Lauf: nur merken, nicht pulsen
    if (total > prev && !open) {
      setPulse(true);
      setTimeout(() => setPulse(false), 1800);
      // jüngsten ungelesenen Chat als Vorschau zeigen
      const newest = conversations
        .filter((c) => c.unread > 0)
        .sort((a, b) => (b.at || 0) - (a.at || 0))[0];
      if (newest) {
        setToast({
          partner: newest.partnerUsername,
          name: newest.partnerDisplayName,
          text: (newest.fromMe ? "Du: " : "") + (newest.lastText || "📷 Bild"),
          avatar: newest.partnerAvatar,
        });
        setTimeout(() => setToast(null), 5500);
      }
    }
  }, [conversations, rooms, open]);

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
      const la = activityLevel(a.user.lastSeen);
      const lb = activityLevel(b.user.lastSeen);
      if (la !== lb) return lb - la;
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
  const onlineCount = users.filter((u) => isOnlineActivity(u.lastSeen)).length;
  const partnerPresence = partnerInfo ? getPresence({ statusText: partnerInfo.mood, presence: partnerInfo.presence, online: isOnlineActivity(partnerInfo.lastSeen) }) : null;
  const roomUnread = rooms.reduce((s, r) => s + (r.unread || 0), 0);
  const dmUnread = totalUnread - roomUnread;

  // Mini-Avatare: die letzten Schreiber mit ungelesenen Nachrichten
  const recentSenders = conversations
    .filter((c) => c.unread > 0)
    .sort((a, b) => (b.at || 0) - (a.at || 0))
    .slice(0, 3);

  // Zustands-Farbe des Buttons: ungelesen → pink, Freunde online → cyan, sonst violett
  const state = totalUnread > 0 ? "unread" : onlineCount > 0 ? "online" : "idle";
  const STATE = {
    unread: { grad: "linear-gradient(135deg, #ff5cb1 0%, #c2185b 100%)", glow: "rgba(255,62,157,0.55)", accent: "#ff3e9d" },
    online: { grad: "linear-gradient(135deg, #2d7dd2 0%, #5fb0ff 100%)", glow: "rgba(45,125,210,0.5)",  accent: "#2d7dd2" },
    idle:   { grad: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)", glow: "rgba(124,58,237,0.45)", accent: "#a855f7" },
  }[state];

  // Online-Ring: Anteil online / gesamt als Konus
  const onlineFrac = users.length ? Math.min(1, onlineCount / users.length) : 0;
  const ringDeg = Math.round(onlineFrac * 360);

  function openFirstUnread() {
    const first = conversations
      .filter((c) => c.unread > 0)
      .sort((a, b) => (b.at || 0) - (a.at || 0))[0];
    setOpen(true);
    if (first) openChat(first.partnerUsername);
    else setView("list");
    setPressMenu(false);
  }

  // Long-Press startet das Schnellmenü
  function startPress() {
    pressTimer.current = setTimeout(() => setPressMenu(true), 500);
  }
  function endPress() {
    if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = 0; }
  }

  return (
    <>
      <style>{`
        @keyframes vv-cbtn-pulse { 0%,100%{transform:scale(1)} 30%{transform:scale(1.14)} 60%{transform:scale(0.97)} }
        @keyframes vv-cbtn-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-2px)} }
        @keyframes vv-cbtn-spin  { from{transform:rotate(0)} to{transform:rotate(360deg)} }
        @keyframes vv-cbtn-toastin { from{opacity:0;transform:translateY(8px) scale(0.9)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes vv-cbtn-sheen { 0%{transform:translateX(-120%)} 60%,100%{transform:translateX(220%)} }
        @keyframes vv-overlay-in { from{opacity:0;transform:translateY(12px) scale(0.96)} to{opacity:1;transform:translateY(0) scale(1)} }
      `}</style>

      {/* Vorschau-Sprechblase über dem Button */}
      {toast && !open && (
        <button type="button"
          onClick={() => { setToast(null); setOpen(true); openChat(toast.partner); }}
          style={{
            position: "fixed", bottom: 88, right: 18, zIndex: 101,
            maxWidth: "min(300px, 80vw)", display: "flex", alignItems: "center", gap: 9,
            background: "var(--vv-card,#fff)", color: "var(--vv-text,#1c1c1e)",
            border: "1px solid var(--vv-border, rgba(0,0,0,0.1))",
            borderRadius: 14, padding: "9px 12px", cursor: "pointer",
            boxShadow: "0 10px 30px rgba(0,0,0,0.32)", textAlign: "left",
            animation: "vv-cbtn-toastin 0.3s cubic-bezier(0.18,0.89,0.32,1.28)",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif",
          }}>
          <Avatar url={toast.avatar} name={toast.name} className="vv-avatar vv-avatar-sm" style={{ width: 34, height: 34, flexShrink: 0 }} />
          <span style={{ minWidth: 0 }}>
            <span style={{ display: "block", fontSize: 12.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{toast.name}</span>
            <span style={{ display: "block", fontSize: 11.5, opacity: 0.7, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{toast.text}</span>
          </span>
        </button>
      )}

      {/* Long-Press-Schnellmenü */}
      {pressMenu && !open && (
        <>
          <div onClick={() => setPressMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 101 }} />
          <div style={{
            position: "fixed", bottom: 88, right: 18, zIndex: 102,
            background: "var(--vv-card,#fff)", color: "var(--vv-text,#1c1c1e)",
            border: "1px solid var(--vv-border, rgba(0,0,0,0.1))",
            borderRadius: 14, padding: 6, minWidth: 210,
            boxShadow: "0 14px 40px rgba(0,0,0,0.4)",
            animation: "vv-cbtn-toastin 0.22s ease",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif",
          }}>
            {[
              totalUnread > 0 && { icon: "📨", label: `${totalUnread} Ungelesene öffnen`, fn: openFirstUnread },
              { icon: "💬", label: "Alle Chats", fn: () => { setOpen(true); setView("list"); setPressMenu(false); } },
              { icon: "👯", label: "Gruppe erstellen", fn: () => { setCreatingRoom(true); setPressMenu(false); } },
              { icon: "🗺️", label: "Realitätskarte", fn: () => { router.push("/karte"); setPressMenu(false); } },
            ].filter(Boolean).map((o) => (
              <button key={o.label} type="button" onClick={o.fn}
                style={{
                  display: "flex", alignItems: "center", gap: 10, width: "100%",
                  padding: "10px 12px", background: "none", border: "none", borderRadius: 9,
                  cursor: "pointer", fontSize: 13.5, fontWeight: 600, textAlign: "left",
                  color: "var(--vv-text,#1c1c1e)", fontFamily: "inherit",
                }}>
                <span style={{ fontSize: 18 }}>{o.icon}</span>{o.label}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Mini-Avatare der letzten Schreiber, links neben dem Button */}
      {!open && recentSenders.length > 0 && (
        <div style={{
          position: "fixed", bottom: 30, right: 84, zIndex: 100,
          display: "flex", flexDirection: "row-reverse",
        }}>
          {recentSenders.map((c, i) => (
            <Avatar key={c.partnerUsername} url={c.partnerAvatar} name={c.partnerDisplayName}
              className="vv-avatar"
              style={{
                width: 30, height: 30, marginRight: i === 0 ? 0 : -10,
                border: "2px solid var(--vv-card,#fff)", boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                animation: "vv-cbtn-float 2.6s ease-in-out infinite",
                animationDelay: `${i * 0.25}s`,
              }} />
          ))}
        </div>
      )}

      {/* Der Button */}
      <div style={{ position: "fixed", bottom: "calc(18px + env(safe-area-inset-bottom, 0px))", right: 18, zIndex: 100, width: 60, height: 60 }}>
        {/* Online-Ring */}
        <div style={{
          position: "absolute", inset: -3, borderRadius: "50%",
          background: `conic-gradient(#3ddc84 ${ringDeg}deg, rgba(255,255,255,0.18) ${ringDeg}deg)`,
          padding: 3,
          WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))",
          mask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))",
          opacity: onlineCount > 0 ? 1 : 0.3,
        }} />
        <button
          type="button"
          onClick={() => { if (!pressMenu) setOpen((o) => !o); }}
          onMouseDown={startPress} onMouseUp={endPress} onMouseLeave={endPress}
          onTouchStart={startPress} onTouchEnd={endPress}
          onContextMenu={(e) => { e.preventDefault(); setPressMenu(true); }}
          aria-label="Chats öffnen (gedrückt halten für Schnellmenü)"
          style={{
            position: "absolute", inset: 0,
            width: 60, height: 60, borderRadius: "50%", border: "none",
            background: STATE.grad,
            color: "#fff", cursor: "pointer", overflow: "hidden",
            boxShadow: `0 6px 22px ${STATE.glow}, 0 2px 6px rgba(0,0,0,0.3)`,
            animation: pulse
              ? "vv-cbtn-pulse 0.6s ease 0s 3"
              : "vv-cbtn-float 3s ease-in-out infinite",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          {/* Eigenes animiertes Icon: Sprechblase mit funkelndem Vibe-Stern */}
          <svg width="30" height="30" viewBox="0 0 32 32" style={{ display: "block" }}>
            <path d="M5 7 h22 a3 3 0 0 1 3 3 v11 a3 3 0 0 1 -3 3 H13 l-6 5 v-5 H5 a3 3 0 0 1 -3 -3 V10 a3 3 0 0 1 3 -3 z"
              fill="rgba(255,255,255,0.95)" />
            <g style={{ transformOrigin: "16px 15px", animation: "vv-cbtn-spin 6s linear infinite" }}>
              <path d="M16 9 l1.6 3.6 L21 14 l-3.4 1.4 L16 19 l-1.6-3.6 L11 14 l3.4-1.4 z"
                fill={STATE.accent} />
            </g>
            <circle cx="22" cy="10.5" r="1.1" fill="#fde047" />
            <circle cx="10.5" cy="19" r="0.9" fill="#fde047" />
          </svg>
          {/* Glanz-Sheen */}
          <span style={{
            position: "absolute", top: 0, bottom: 0, left: 0, width: "45%",
            background: "linear-gradient(120deg, transparent, rgba(255,255,255,0.5), transparent)",
            animation: "vv-cbtn-sheen 5s ease-in-out infinite", pointerEvents: "none",
          }} />
        </button>

        {/* Getrennte Badges: DMs (pink) + Gruppen (gelb) */}
        {dmUnread > 0 && (
          <span style={{
            position: "absolute", top: -3, right: -3, minWidth: 22, height: 22,
            padding: "0 6px", background: "#ff3e9d", color: "#fff",
            borderRadius: 11, fontSize: 12, fontWeight: "bold",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            border: "2px solid var(--vv-card,#fff)", lineHeight: 1, zIndex: 2,
          }}>{dmUnread > 99 ? "99+" : dmUnread}</span>
        )}
        {roomUnread > 0 && (
          <span style={{
            position: "absolute", bottom: -3, right: -3, minWidth: 20, height: 20,
            padding: "0 5px", background: "#f59e0b", color: "#1c1c1e",
            borderRadius: 10, fontSize: 11, fontWeight: 800,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            border: "2px solid var(--vv-card,#fff)", lineHeight: 1, zIndex: 2,
          }}>👯{roomUnread > 9 ? "9+" : roomUnread}</span>
        )}
        {/* Vibes-Mini-Pille links unten */}
        {vibes && (
          <span style={{
            position: "absolute", bottom: -6, left: -8,
            background: "linear-gradient(135deg,#fbbf24,#f59e0b)", color: "#1c1c1e",
            borderRadius: 999, padding: "1px 6px", fontSize: 10, fontWeight: 800,
            border: "2px solid var(--vv-card,#fff)", lineHeight: 1.3, zIndex: 2,
            whiteSpace: "nowrap",
          }}>✨{vibes.balance}</span>
        )}
      </div>

      {open && (
        <div style={{
          position: "fixed",
          bottom: "calc(86px + env(safe-area-inset-bottom, 0px))",
          right: 18, zIndex: 99,
          width: "min(380px, 94vw)",
          maxHeight: "calc(100dvh - 110px - env(safe-area-inset-bottom, 0px))",
          height: view === "chat" ? "78dvh" : "min(78dvh, 620px)",
          background: "var(--vv-card, #fff)", borderRadius: 18, overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.42), 0 4px 12px rgba(0,0,0,0.12)",
          display: "flex", flexDirection: "column",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif",
          animation: "vv-overlay-in 0.25s cubic-bezier(0.18, 0.89, 0.32, 1.28)",
          transformOrigin: "bottom right",
          border: "1px solid var(--vv-border, rgba(0,0,0,0.08))",
          color: "var(--vv-text, #1c1c1e)",
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
                {vibes && (
                  <span title={`Du hast ${vibes.balance} Vibes`}
                    style={{ background: "rgba(255,255,255,0.18)", padding: "3px 8px", borderRadius: 999, fontSize: 12, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 3 }}>
                    ✨ {vibes.balance}
                  </span>
                )}
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
                    {partnerInfo
                      ? <ColoredName gender={partnerInfo.gender} age={partnerInfo.age} name={partnerInfo.displayName || activePartner} />
                      : activePartner}
                  </div>
                  <div style={{ fontSize: 10, opacity: 0.95, display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                    <ActivityBars lastSeen={partnerInfo?.lastSeen} size="sm" />
                    {isOnlineActivity(partnerInfo?.lastSeen)
                      ? <span style={{ fontWeight: "bold" }}>online</span>
                      : <span>{formatLastActive(partnerInfo?.lastSeen)}</span>}
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
                  <button type="button" data-mute-trigger="1" onClick={() => setMuteMenu((v) => !v)} title="Optionen"
                    style={{ color: "#fff", background: "rgba(255,255,255,0.18)", border: "none", borderRadius: 6, padding: "2px 6px", cursor: "pointer", fontSize: 13 }}>⋮</button>
                  {muteMenu && (
                    <>
                      <div data-mute-menu="1" style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 10, background: "var(--vv-card,#fff)", color: "var(--vv-text,#222)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.25)", minWidth: 200, padding: 8, textShadow: "none", border: "1px solid var(--vv-border, rgba(0,0,0,0.08))" }}>
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
              <div style={{ padding: 8, borderBottom: "1px solid var(--vv-border,#f0f0f5)", background: "var(--vv-surface,#fafafd)" }}>
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
                    <div style={{ padding: "6px 12px", fontSize: 11, color: "var(--vv-muted,#555)", background: "var(--vv-surface,#f6f8fc)", fontWeight: "bold" }}>👯 Gruppen</div>
                    {filteredRooms.map((r) => (
                      <Link key={r.id} href={`/messenger/rooms/${r.id}`} onClick={() => setOpen(false)}
                        style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderBottom: "1px solid var(--vv-border,#f0f0f5)", textDecoration: "none", color: "var(--vv-text,#222)", background: r.unread > 0 ? "var(--vv-unread,#fff5fb)" : "var(--vv-card,#fff)" }}>
                        <div style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg,#f7e0b0,#ffd9ec)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, position: "relative", flexShrink: 0 }}>
                          <span>{r.emoji || "💬"}</span>
                          {r.unread > 0 && (
                            <span style={{ position: "absolute", top: -4, right: -4, minWidth: 18, height: 18, padding: "0 5px", background: "#ff3e9d", color: "#fff", borderRadius: 9, fontSize: 11, fontWeight: "bold", display: "inline-flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>{r.unread > 99 ? "99+" : r.unread}</span>
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: "bold", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--vv-text,#222)" }}>{r.name}</div>
                          <div style={{ fontSize: 11, color: "var(--vv-muted,#666)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: r.unread > 0 ? "bold" : "normal" }}>
                            {r.lastText || <span style={{ color: "var(--vv-muted,#aaa)" }}>noch nichts geschrieben</span>}
                          </div>
                        </div>
                        {r.lastAt && <span style={{ fontSize: 10, color: "var(--vv-muted,#aaa)", flexShrink: 0 }}>{relTime(r.lastAt)}</span>}
                      </Link>
                    ))}
                  </>
                )}

                {filteredUsers.length > 0 && (
                  <div style={{ padding: "6px 12px", fontSize: 11, color: "var(--vv-muted,#555)", background: "var(--vv-surface,#f6f8fc)", fontWeight: "bold" }}>💬 Freunde</div>
                )}
                {filteredUsers.map(({ user: u, convo }) => {
                  const onlineNow = isOnlineActivity(u.lastSeen);
                  const presenceInfo = getPresence({ statusText: u.mood, presence: u.presence, online: onlineNow });
                  return (
                    <button
                      key={u.username}
                      type="button"
                      onClick={() => openChat(u.username)}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
                        background: convo?.unread > 0 ? "var(--vv-unread,#fff5fb)" : "var(--vv-card,#fff)", border: "none",
                        borderBottom: "1px solid var(--vv-border,#f0f0f5)", cursor: "pointer", textAlign: "left",
                      }}
                    >
                      <PresenceAvatar url={u.avatarUrl} name={u.displayName} presenceInfo={presenceInfo} size={34} className="vv-avatar vv-avatar-sm" />
                      <span style={{ flex: 1, minWidth: 0, color: "var(--vv-text,#222)" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          <OnlineName lastSeen={u.lastSeen}>
                            <ColoredName gender={u.gender} age={u.age} name={u.displayName} />
                          </OnlineName>
                          <ActivityBars lastSeen={u.lastSeen} size="xs" />
                        </span>
                        {convo ? (
                          <span style={{ display: "block", marginTop: 6, fontSize: 11, color: "var(--vv-muted,#666)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: convo.unread > 0 ? "bold" : "normal" }}>
                            {convo.fromMe ? "Du: " : ""}{convo.lastText}
                          </span>
                        ) : (
                          <span style={{ display: "block", marginTop: 6, fontSize: 11, color: "var(--vv-muted,#888)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {onlineNow ? (u.mood || "online") : `zuletzt ${formatLastActive(u.lastSeen)}`}
                          </span>
                        )}
                      </span>
                      {convo?.unread > 0 && (
                        <span style={{ minWidth: 18, height: 18, padding: "0 5px", background: "#ff3e9d", color: "#fff", borderRadius: 9, fontSize: 11, fontWeight: "bold", display: "inline-flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>{convo.unread > 99 ? "99+" : convo.unread}</span>
                      )}
                      <span style={{ fontSize: 10, color: "var(--vv-muted,#aaa)", flexShrink: 0 }}>{convo ? relTime(convo.at) : ""}</span>
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
              <div ref={scrollRef} style={{ overflowY: "auto", flex: 1, padding: "10px 8px", background: "var(--vv-chat-bg, linear-gradient(180deg, #eef3fb 0%, #f8fafc 100%))" }}>
                {messages.length === 0 && (
                  <div className="vv-muted vv-center" style={{ marginTop: 30 }}>Sag „Hi 👋"!</div>
                )}
                {messages.map((m) => (
                  <div key={m.id} style={{ display: "flex", justifyContent: m.fromMe ? "flex-end" : "flex-start", alignItems: "flex-end", gap: 4, marginBottom: 4 }}>
                    <div style={{
                      maxWidth: "78%", padding: m.imageUrl ? "4px" : "6px 10px", borderRadius: 14,
                      background: m.fromMe ? "linear-gradient(135deg, #2d7dd2, #5fb0ff)" : "var(--vv-card,#fff)",
                      color: m.fromMe ? "#fff" : "var(--vv-text,#222)",
                      border: m.fromMe ? "none" : "1px solid var(--vv-border,#d8def0)",
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
                <div style={{ fontSize: 11, color: "#1f5fa8", padding: "2px 12px", fontStyle: "italic", background: "var(--vv-surface,#fafafd)" }}>
                  {partnerInfo?.displayName || activePartner} schreibt…
                </div>
              )}
              <form onSubmit={send} style={{ borderTop: "1px solid var(--vv-border,#eee)", background: "var(--vv-card,#fff)", padding: 6, paddingBottom: "calc(6px + env(safe-area-inset-bottom, 0px))" }}>
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
              <div style={{ padding: "6px 10px", borderTop: "1px solid var(--vv-border,#eee)", background: "var(--vv-surface,#fafafd)", fontSize: 11, textAlign: "right" }}>
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
