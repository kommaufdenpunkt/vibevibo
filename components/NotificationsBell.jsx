"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useMe } from "@/lib/useMe";
import { relTime } from "@/lib/format";
import Avatar from "./Avatar";

const TYPE_LABEL = {
  pinnwand: "schrieb auf deine Pinnwand",
  mention: "hat dich markiert",
  message: "schickte dir eine Nachricht",
  gift: "schenkte dir was",
  like: "gefällt dein Eintrag",
};

const TYPE_ICON = { pinnwand: "📌", mention: "@", message: "✉️", gift: "🎁", like: "❤️" };

function notifHref(n, meName) {
  switch (n.type) {
    case "message": return n.actorUsername ? `/messenger/${n.actorUsername}` : "/messenger";
    case "pinnwand":
    case "gift":
    case "like":
      return meName ? `/u/${meName}` : "/profile";
    case "mention":
      return n.actorUsername ? `/u/${n.actorUsername}` : "/profile";
    default:
      return "/profile";
  }
}

export default function NotificationsBell() {
  const { me } = useMe();
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!me) return;
    const load = () => api.notifications().then((d) => { setNotifs(d.notifications || []); setUnread(d.unread || 0); }).catch(() => {});
    load();
    const t = setInterval(load, 25000);
    return () => clearInterval(t);
  }, [me]);

  async function onOpen() {
    setOpen(true);
    if (unread > 0) {
      try { await api.markNotificationsRead(); setUnread(0); setNotifs((ns) => ns.map((n) => ({ ...n, read: true }))); }
      catch { /* ignore */ }
    }
  }

  if (!me) return null;

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : onOpen())}
        aria-label="Benachrichtigungen"
        style={{ position: "relative", padding: "5px 11px", background: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.35)", borderRadius: 20, cursor: "pointer", marginRight: 6, fontSize: 15 }}
      >
        🔔
        {unread > 0 && (
          <span style={{ position: "absolute", top: -4, right: -4, minWidth: 18, height: 18, padding: "0 5px", background: "#ff3e9d", color: "#fff", borderRadius: 9, fontSize: 11, fontWeight: "bold", display: "inline-flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>
      {open && (
        <>
          <div style={{
            position: "absolute", right: 0, top: "calc(100% + 8px)", zIndex: 60,
            width: "min(340px, 92vw)", maxHeight: "70vh", overflowY: "auto",
            background: "#fff", color: "#222", borderRadius: 12,
            boxShadow: "0 12px 32px rgba(0,0,0,0.28)", padding: 6, fontFamily: "Arial, sans-serif",
          }}>
            <div style={{ padding: "6px 10px 8px", borderBottom: "1px solid #eee", fontWeight: "bold" }}>🔔 Benachrichtigungen</div>
            {notifs.length === 0 ? (
              <div className="vv-muted" style={{ padding: 18, textAlign: "center", fontSize: 13 }}>Noch nichts. ✨</div>
            ) : (
              notifs.map((n) => (
                <Link
                  key={n.id}
                  href={notifHref(n, me.username)}
                  onClick={() => setOpen(false)}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, textDecoration: "none", color: "#222", background: n.read ? "transparent" : "#fff5fb" }}
                >
                  <Avatar url={n.actorAvatar} name={n.actorName} className="vv-avatar vv-avatar-sm" style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 13 }}>
                      {TYPE_ICON[n.type] || "•"} <strong>{n.actorName || "Jemand"}</strong> {TYPE_LABEL[n.type] || n.type}
                    </span>
                    {n.preview && (
                      <span style={{ display: "block", fontSize: 11, color: "#666", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>„{n.preview}"</span>
                    )}
                    <span style={{ fontSize: 10, color: "#999" }}>{relTime(n.at)}</span>
                  </span>
                </Link>
              ))
            )}
          </div>
          <div className="vv-nav2-backdrop" onClick={() => setOpen(false)} />
        </>
      )}
    </div>
  );
}
