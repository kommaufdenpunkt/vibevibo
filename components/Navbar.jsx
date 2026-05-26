"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useMe } from "@/lib/useMe";
import { api } from "@/lib/api";

const LINKS = [
  { href: "/", icon: "🏠", label: "Start" },
  { href: "/profile", icon: "👤", label: "Mein Profil" },
  { href: "/freunde", icon: "👯", label: "Freunde" },
  { href: "/messenger", icon: "✉️", label: "Nachrichten" },
  { href: "/fotos", icon: "📸", label: "Fotos" },
  { href: "/gruppen", icon: "🏘️", label: "Gruppen" },
  { href: "/geschenke", icon: "🎁", label: "Geschenke" },
];

// Jappy-Status nach Kategorien
const STATUS_CATS = [
  { title: "📍 Wo bin ich?", items: [
    ["🏠", "zu Hause"], ["🚗", "unterwegs"], ["🏢", "auf der Arbeit"], ["🎓", "Schule/Uni"],
    ["🛏️", "im Bett"], ["🏖️", "im Urlaub"], ["🌳", "draußen"], ["👯", "bei Freunden"], ["🛒", "einkaufen"],
  ] },
  { title: "🎯 Was mache ich?", items: [
    ["😎", "chillen"], ["🎮", "zocken"], ["📚", "lernen"], ["💼", "arbeiten"], ["😴", "schlafen"],
    ["🎧", "Musik hören"], ["📺", "Serie gucken"], ["🍕", "essen"], ["🎉", "feiern"], ["📱", "am Handy"],
  ] },
  { title: "💭 Wie geht's mir?", items: [
    ["🤩", "super drauf"], ["😊", "glücklich"], ["😍", "verliebt"], ["😫", "gestresst"], ["🥱", "müde"],
    ["😢", "traurig"], ["😐", "gelangweilt"], ["😡", "wütend"], ["😌", "entspannt"], ["🤔", "verträumt"],
  ] },
];

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { me, logout, refresh } = useMe();
  const [open, setOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [custom, setCustom] = useState("");

  useEffect(() => { setOpen(false); setStatusOpen(false); }, [pathname]);

  async function handleLogout() {
    setOpen(false);
    await logout();
    router.push("/login");
    router.refresh();
  }

  async function setStatus(text) {
    setSaving(true);
    try {
      await api.updateMe(me.username, { mood: text.slice(0, 60) });
      await refresh();
      setStatusOpen(false);
      setCustom("");
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <nav className="vv-nav2">
      <div className="vv-nav2-bar">
        <button
          type="button"
          className={`vv-burger${open ? " vv-burger-open" : ""}`}
          onClick={() => setOpen((o) => !o)}
          aria-label="Menü"
        >
          <span /><span /><span />
        </button>

        <Link href="/" className="vv-nav2-logo" onClick={() => setOpen(false)}>
          Vibe<span className="vv-logo-dot">★</span>Vibo
        </Link>

        <div className="vv-spacer" />

        {me ? (
          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setStatusOpen((o) => !o)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6, maxWidth: "55vw",
                background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.35)",
                color: "#fff", borderRadius: 20, padding: "5px 12px", cursor: "pointer",
                fontFamily: "Arial, sans-serif", fontSize: 13, whiteSpace: "nowrap", overflow: "hidden",
              }}
              title="Status ändern"
            >
              <span className="vv-online-dot" />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                {me.mood ? me.mood : "Status setzen"}
              </span>
              <span style={{ opacity: 0.8 }}>▾</span>
            </button>

            {statusOpen && (
              <div
                style={{
                  position: "absolute", right: 0, top: "calc(100% + 8px)", zIndex: 60,
                  width: 300, maxWidth: "90vw", maxHeight: "70vh", overflowY: "auto",
                  background: "#fff", color: "#222", borderRadius: 12,
                  boxShadow: "0 10px 30px rgba(0,0,0,0.25)", padding: 12,
                  fontFamily: "Arial, sans-serif",
                }}
              >
                <div style={{ fontWeight: "bold", marginBottom: 6 }}>Status wählen</div>
                {STATUS_CATS.map((cat) => (
                  <div key={cat.title} style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: "bold", color: "#c2185b", margin: "4px 0" }}>{cat.title}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                      {cat.items.map(([em, lbl]) => {
                        const val = `${em} ${lbl}`;
                        const active = me.mood === val;
                        return (
                          <button
                            key={lbl}
                            type="button"
                            disabled={saving}
                            onClick={() => setStatus(val)}
                            style={{
                              fontSize: 12, padding: "4px 8px", borderRadius: 14, cursor: "pointer",
                              border: active ? "2px solid #ff3e9d" : "1px solid #ddd",
                              background: active ? "#ffe6f2" : "#f6f6f6", whiteSpace: "nowrap",
                            }}
                          >{em} {lbl}</button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <div style={{ borderTop: "1px solid #eee", paddingTop: 8, marginTop: 4 }}>
                  <div style={{ fontSize: 12, fontWeight: "bold", margin: "0 0 4px" }}>✏️ Eigener Status</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input
                      className="vv-input"
                      style={{ flex: 1, margin: 0, fontSize: 13 }}
                      placeholder="z.B. verträumt 🌙"
                      value={custom}
                      maxLength={60}
                      onChange={(e) => setCustom(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && custom.trim()) setStatus(custom.trim()); }}
                    />
                    <button type="button" className="vv-btn vv-btn-pink" disabled={saving || !custom.trim()} onClick={() => setStatus(custom.trim())}>OK</button>
                  </div>
                  {me.mood && (
                    <button type="button" className="vv-btn" style={{ marginTop: 8, color: "#a00" }} disabled={saving} onClick={() => setStatus("")}>
                      ✖ Status entfernen
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <Link href="/login" className="vv-nav2-loginbtn">🔑 Login</Link>
        )}
      </div>

      {/* Aufklappendes Menü - wie damals das Startmenü */}
      <div className={`vv-nav2-panel${open ? " vv-open" : ""}`}>
        <div className="vv-nav2-panel-inner">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`vv-nav2-item${pathname === l.href ? " vv-active" : ""}`}
              onClick={() => setOpen(false)}
            >
              <span className="vv-nav2-icon">{l.icon}</span>
              <span className="vv-nav2-label">{l.label}</span>
            </Link>
          ))}
          {me && (
            <a
              href="#"
              className="vv-nav2-item vv-nav2-logout"
              onClick={(e) => { e.preventDefault(); handleLogout(); }}
            >
              <span className="vv-nav2-icon">↩</span>
              <span className="vv-nav2-label">Logout</span>
            </a>
          )}
        </div>
      </div>

      {/* Klick-Fänger zum Schließen */}
      {open && <div className="vv-nav2-backdrop" onClick={() => setOpen(false)} />}
      {statusOpen && <div className="vv-nav2-backdrop" onClick={() => setStatusOpen(false)} />}
    </nav>
  );
}
