"use client";

// 🔔 Notifications-Bell mit:
// - In-App Toast-Popup wenn neue Benachrichtigung reinkommt
// - CTA „Sperrbildschirm aktivieren" wenn Push noch nicht abonniert
// - Klick öffnet Dropdown mit allen Benachrichtigungen

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useMe } from "@/lib/useMe";
import { relTime } from "@/lib/format";
import { playPing } from "@/lib/sound";
import Avatar from "./Avatar";

const TYPE_LABEL = {
  pinnwand: "schrieb auf deine Pinnwand",
  mention: "hat dich markiert",
  message: "schickte dir eine Nachricht",
  gift: "schenkte dir was",
  like: "gefällt dein Eintrag",
  guestbook: "schrieb ins Gästebuch",
};

const TYPE_ICON = { pinnwand: "📌", mention: "@", message: "✉️", gift: "🎁", like: "❤️", guestbook: "📖" };

function notifHref(n, meName) {
  switch (n.type) {
    case "message": return n.actorUsername ? `/messenger/${n.actorUsername}` : "/messenger";
    case "pinnwand":
    case "gift":
    case "like":
    case "guestbook":
      return meName ? `/u/${meName}` : "/profile";
    case "mention":
      return n.actorUsername ? `/u/${n.actorUsername}` : "/profile";
    default:
      return "/profile";
  }
}

export default function NotificationsBell() {
  const { me } = useMe();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [unread, setUnread] = useState(0);
  const [toast, setToast] = useState(null);
  const [pushOn, setPushOn] = useState(null); // null=checking, true/false
  const prevUnreadRef = useRef(null);
  const [allReadBusy, setAllReadBusy] = useState(false);
  const [allReadFlash, setAllReadFlash] = useState("");

  useEffect(() => {
    if (!me) return;
    const load = () => api.notifications().then((d) => {
      const next = d.unread || 0;
      const list = d.notifications || [];
      setNotifs(list);
      if (prevUnreadRef.current != null && next > prevUnreadRef.current) {
        playPing();
        const fresh = list.find((n) => !n.read);
        if (fresh) {
          setToast(fresh);
          setTimeout(() => setToast(null), 6000);
        }
      }
      prevUnreadRef.current = next;
      setUnread(next);
    }).catch(() => {});
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [me]);

  // Push-Subscribe-Status checken (damit wir CTA „aktivieren" anzeigen)
  useEffect(() => {
    if (!me) return;
    let cancelled = false;
    (async () => {
      try {
        if (!("serviceWorker" in navigator) || !("PushManager" in window)) { setPushOn(false); return; }
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (!cancelled) setPushOn(!!sub);
      } catch { if (!cancelled) setPushOn(false); }
    })();
    return () => { cancelled = true; };
  }, [me]);

  // Auf vv-push-Event vom SW hören (kommt auch wenn App im Hintergrund war)
  useEffect(() => {
    if (!me) return;
    const onMsg = (e) => {
      if (e?.data?.type === "vv-push") {
        api.notifications().then((d) => {
          setNotifs(d.notifications || []);
          setUnread(d.unread || 0);
          prevUnreadRef.current = d.unread || 0;
        }).catch(() => {});
      }
    };
    navigator.serviceWorker?.addEventListener?.("message", onMsg);
    return () => navigator.serviceWorker?.removeEventListener?.("message", onMsg);
  }, [me]);

  async function handleAllRead() {
    if (allReadBusy) return;
    setAllReadBusy(true);
    try {
      const r = await api.markAllRead();
      setUnread(0);
      setNotifs((ns) => ns.map((n) => ({ ...n, read: true })));
      setAllReadFlash(`✓ ${(r.chats || 0)} Chats + ${(r.rooms || 0)} Räume + Benachrichtigungen abgeräumt`);
      setTimeout(() => setAllReadFlash(""), 3500);
    } catch (e) {
      setAllReadFlash("⚠ Konnte nicht alles als gelesen markieren");
      setTimeout(() => setAllReadFlash(""), 3500);
    } finally { setAllReadBusy(false); }
  }
  async function onOpen() {
    setOpen(true);
    setToast(null);
    if (unread > 0) {
      try { await api.markNotificationsRead(); setUnread(0); setNotifs((ns) => ns.map((n) => ({ ...n, read: true }))); }
      catch { /* ignore */ }
    }
  }

  function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const b64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(b64);
    const arr = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
    return arr;
  }
  async function enablePush() {
    try {
      if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        alert("Dein Browser unterstützt leider keine Push-Benachrichtigungen.");
        return;
      }
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        if (perm === "denied") {
          alert("Du hast Push-Benachrichtigungen blockiert. Geh in die Browser-Einstellungen → Benachrichtigungen → Vibevibo.de zulassen.");
        }
        return;
      }
      const { publicKey, enabled } = await api.pushKey();
      if (!enabled || !publicKey) {
        alert("Push-Server ist gerade nicht verfügbar. Bitte später erneut versuchen.");
        return;
      }
      // SW sicherstellen
      await navigator.serviceWorker.register("/sw.js").catch(() => {});
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }
      await api.pushSubscribe(sub.toJSON());
      setPushOn(true);
      try {
        // Permanent merken: nie wieder Banner anbieten
        localStorage.setItem("vv:push:dismissed", "1");
      } catch {}
      alert("✅ Sperrbildschirm-Benachrichtigungen aktiviert! Du bekommst jetzt Push.");
    } catch (e) {
      alert("Fehler beim Aktivieren: " + (e?.message || "unbekannt"));
    }
  }
  async function disablePush() {
    if (!confirm("Sperrbildschirm-Benachrichtigungen wirklich ausschalten?")) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await api.pushUnsubscribe(sub.endpoint).catch(() => {});
        await sub.unsubscribe().catch(() => {});
      }
      setPushOn(false);
    } catch (e) {
      alert("Fehler: " + (e?.message || "unbekannt"));
    }
  }

  function openToast() {
    if (!toast) return;
    const href = notifHref(toast, me?.username);
    setToast(null);
    router.push(href);
  }

  if (!me) return null;

  return (
    <>
      {/* Toast-Popup oben rechts */}
      {toast && !open && (
        <button type="button" onClick={openToast} className="vv-notif-toast">
          <Avatar url={toast.actorAvatar} name={toast.actorName} className="vv-avatar vv-avatar-sm" style={{ flexShrink: 0 }} />
          <span className="vv-notif-toast-body">
            <span className="vv-notif-toast-title">
              {TYPE_ICON[toast.type] || "🔔"} <b>{toast.actorName || "Jemand"}</b>
            </span>
            <span className="vv-notif-toast-line">{TYPE_LABEL[toast.type] || toast.type}</span>
            {toast.preview && <span className="vv-notif-toast-preview">„{toast.preview}"</span>}
          </span>
          <span className="vv-notif-toast-close" onClick={(e) => { e.stopPropagation(); setToast(null); }} aria-label="schließen">×</span>
        </button>
      )}

      <div style={{ position: "relative" }}>
        <button
          type="button"
          onClick={() => (open ? setOpen(false) : onOpen())}
          aria-label="Benachrichtigungen"
          className={`vv-notif-bell${unread > 0 ? " vv-notif-bell-active" : ""}`}
        >
          🔔
          {unread > 0 && (
            <span className="vv-notif-bell-badge">{unread > 99 ? "99+" : unread}</span>
          )}
        </button>
        {open && (
          <>
            <div className="vv-notif-pop">
              <div className="vv-notif-pop-header">
                <span>🔔 Benachrichtigungen</span>
                {pushOn === false && (
                  <button type="button" className="vv-notif-pop-push" onClick={enablePush}>
                    📲 1-Klick aktivieren
                  </button>
                )}
                {pushOn === true && (
                  <button type="button" className="vv-notif-pop-push-on" onClick={disablePush}
                    title="Klick um Push wieder auszuschalten" style={{ cursor: "pointer" }}>
                    ✓ Push aktiv · ✕ ausschalten
                  </button>
                )}
              </div>
              <div className="vv-notif-allread-bar">
                <button type="button" className="vv-notif-allread-btn" disabled={allReadBusy} onClick={handleAllRead}>
                  {allReadBusy ? "räumt auf…" : "✓ Alles als gelesen markieren"}
                </button>
              </div>
              {allReadFlash && <div className="vv-notif-allread-flash">{allReadFlash}</div>}
              {notifs.length === 0 ? (
                <div className="vv-notif-pop-empty">Noch nichts. ✨</div>
              ) : (
                notifs.map((n) => (
                  <Link
                    key={n.id}
                    href={notifHref(n, me.username)}
                    onClick={() => setOpen(false)}
                    className={`vv-notif-pop-row${n.read ? "" : " unread"}`}
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
    </>
  );
}
