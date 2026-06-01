"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useMe } from "@/lib/useMe";
import { api } from "@/lib/api";
import NotificationsBell from "./NotificationsBell";
import VibesNavBadge from "./VibesNavBadge";

// Eigenen Status für 50 ✨ posten — Premium-Feature
function CustomStatusBox({ onSet }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function buy() {
    if (!text.trim()) return;
    setBusy(true); setErr("");
    try {
      await api.premiumBuy("custom_status", { text: text.trim() });
      setText("");
      onSet?.(text.trim());
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }
  return (
    <div style={{
      background: "linear-gradient(135deg, #fef3c7, #fde68a)",
      border: "2px dashed #f59e0b", borderRadius: 10, padding: 10, marginBottom: 10,
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#92400e", marginBottom: 6 }}>
        ✏️ Eigenen Status schreiben <span style={{ float: "right" }}>50 ✨</span>
      </div>
      <input
        type="text" value={text} maxLength={80}
        onChange={(e) => setText(e.target.value)}
        placeholder="z.B. 🚀 voll im Flow"
        style={{
          width: "100%", padding: "8px 10px", border: "1px solid #d97706",
          borderRadius: 6, fontSize: 14, background: "#fffbeb",
          boxSizing: "border-box",
        }}
      />
      <button type="button" disabled={busy || !text.trim()} onClick={buy}
        style={{
          marginTop: 6, width: "100%", padding: "8px 10px", border: "none",
          borderRadius: 6, background: text.trim() ? "linear-gradient(135deg, #f59e0b, #b45309)" : "#fcd34d",
          color: text.trim() ? "#fff" : "#92400e", fontWeight: 700, cursor: text.trim() ? "pointer" : "default",
          fontSize: 13, opacity: busy ? 0.6 : 1,
        }}>
        {busy ? "wird gesetzt…" : "Für 50 ✨ posten"}
      </button>
      {err && <div style={{ color: "#b91c1c", fontSize: 11, marginTop: 5 }}>⚠ {err}</div>}
    </div>
  );
}

const LINKS = [
  { href: "/", icon: "🏠", label: "Start" },
  { href: "/profile", icon: "👤", label: "Mein Profil" },
  { href: "/messenger?tab=vibo", icon: "🥚", label: "Mein VIBO" },
  { href: "/karte", icon: "🗺️", label: "Realitätskarte" },
  { href: "/freunde", icon: "👯", label: "Freunde" },
  { href: "/messenger", icon: "✉️", label: "Nachrichten" },
  { href: "/fotos", icon: "📸", label: "Fotos" },
  { href: "/gruppen", icon: "🏘️", label: "Gruppen" },
  { href: "/geschenke", icon: "🎁", label: "Geschenke" },
  { href: "/shop", icon: "🛍️", label: "Shop" },
];

// Vorgefertigte Status nach Kategorien (Jappy-Stil)
const STATUS_CATS = [
  { title: "📍 Wo bin ich?", items: [
    ["🏠", "zu Hause"], ["🚗", "unterwegs"], ["🏢", "auf der Arbeit"], ["🎓", "Schule/Uni"],
    ["🛏️", "im Bett"], ["🏖️", "im Urlaub"], ["🌳", "draußen"], ["👯", "bei Freunden"],
    ["🛒", "einkaufen"], ["☕", "im Café"], ["🏙️", "in der Stadt"], ["🚆", "im Zug"],
  ] },
  { title: "🎯 Was mache ich?", items: [
    ["😎", "chillen"], ["🎮", "zocken"], ["📚", "lernen"], ["💼", "arbeiten"], ["😴", "schlafen"],
    ["🎧", "Musik hören"], ["📺", "Serie gucken"], ["🍕", "essen"], ["🎉", "feiern"], ["📱", "am Handy"],
    ["📖", "lesen"], ["🍳", "kochen"], ["🏃", "Sport"], ["🚶", "spazieren"], ["☎️", "telefonieren"],
  ] },
  { title: "💭 Wie geht's mir?", items: [
    ["🤩", "super drauf"], ["😊", "glücklich"], ["😍", "verliebt"], ["😫", "gestresst"], ["🥱", "müde"],
    ["😢", "traurig"], ["😐", "gelangweilt"], ["😡", "wütend"], ["😌", "entspannt"], ["🤔", "verträumt"],
    ["🤒", "krank"], ["💪", "motiviert"], ["🥳", "gut gelaunt"], ["😅", "verpeilt"],
  ] },
];

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { me, logout, refresh } = useMe();
  const [open, setOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState(null); // ausgewählter Status, wartet auf "posten/setzen"
  const [saving, setSaving] = useState(false);
  // Aktuelle Query-Params (z.B. ?tab=vibo) reaktiv mitführen, ohne
  // useSearchParams (das würde statische Seiten zu dynamic zwingen).
  const [search, setSearch] = useState("");
  useEffect(() => {
    if (typeof window !== "undefined") setSearch(window.location.search);
  }, [pathname]);

  // Aktiv-Logik: exakter Pfad-Match, plus Tab-Unterscheidung bei /messenger
  function isActive(href) {
    const [hp, hq] = href.split("?");
    if (pathname !== hp) return false;
    if (!hq) {
      // Link ohne Query: nur aktiv wenn aktuell auch kein relevanter Tab gesetzt
      if (hp === "/messenger") return !search.includes("tab=");
      return true;
    }
    // Link mit ?tab=xyz: aktiv wenn der Tab in der URL steht
    return search.includes(hq);
  }

  useEffect(() => { setOpen(false); closeStatus(); }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  function closeStatus() { setStatusOpen(false); setQuery(""); setPending(null); }

  async function handleLogout() {
    setOpen(false);
    await logout();
    router.push("/login");
    router.refresh();
  }

  async function applyStatus(text, isPublic) {
    setSaving(true);
    try {
      await api.setStatus(text, isPublic);
      await refresh();
      closeStatus();
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  // Suche: flache, gefilterte Liste über alle Kategorien
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    const out = [];
    for (const cat of STATUS_CATS) {
      for (const [em, lbl] of cat.items) {
        if (lbl.toLowerCase().includes(q)) out.push([em, lbl]);
      }
    }
    return out;
  }, [query]);

  const chipStyle = (active) => ({
    fontSize: 14, padding: "9px 12px", borderRadius: 16, cursor: "pointer",
    border: active ? "2px solid #ff3e9d" : "1px solid #ddd",
    background: active ? "#ffe6f2" : "#f6f6f6", whiteSpace: "nowrap",
  });

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
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <VibesNavBadge />
            <NotificationsBell />
          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => (statusOpen ? closeStatus() : setStatusOpen(true))}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6, maxWidth: "55vw",
                background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.35)",
                color: "#fff", borderRadius: 20, padding: "6px 12px", cursor: "pointer",
                fontFamily: "Arial, sans-serif", fontSize: 13, whiteSpace: "nowrap", overflow: "hidden",
              }}
              title="Status ändern"
            >
              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                {me.mood ? me.mood : "Status setzen"}
              </span>
              <span style={{ opacity: 0.8 }}>▾</span>
            </button>

            {statusOpen && (
              <div
                style={{
                  position: "absolute", right: 0, top: "calc(100% + 8px)", zIndex: 60,
                  width: "min(380px, 94vw)", maxHeight: "72vh", overflowY: "auto",
                  background: "#fff", color: "#222", borderRadius: 14,
                  boxShadow: "0 12px 34px rgba(0,0,0,0.28)", padding: 14,
                  fontFamily: "Arial, sans-serif",
                }}
              >
                {pending ? (
                  // Schritt 2: posten oder nur setzen?
                  <div>
                    <div style={{ fontSize: 13, color: "#666" }}>Dein Status:</div>
                    <div style={{ fontSize: 22, fontWeight: "bold", margin: "6px 0 14px" }}>{pending}</div>
                    <button type="button" disabled={saving} onClick={() => applyStatus(pending, true)}
                      style={{ width: "100%", padding: "12px", borderRadius: 12, border: "none", background: "#ff3e9d", color: "#fff", fontWeight: "bold", fontSize: 15, cursor: "pointer", marginBottom: 8 }}>
                      📢 Öffentlich posten
                    </button>
                    <button type="button" disabled={saving} onClick={() => applyStatus(pending, false)}
                      style={{ width: "100%", padding: "12px", borderRadius: 12, border: "1px solid #ccc", background: "#f6f6f6", fontWeight: "bold", fontSize: 15, cursor: "pointer", marginBottom: 8 }}>
                      🔒 Nur für mich setzen
                    </button>
                    <button type="button" disabled={saving} onClick={() => setPending(null)}
                      style={{ width: "100%", padding: "8px", borderRadius: 12, border: "none", background: "none", color: "#888", cursor: "pointer" }}>
                      ← zurück
                    </button>
                  </div>
                ) : (
                  // Schritt 1: Suche + Auswahl + Custom-Status (Premium)
                  <div>
                    <CustomStatusBox onSet={(text) => { setStatusOpen(false); refresh(); }} />
                    <input
                      className="vv-input"
                      style={{ margin: "0 0 10px", fontSize: 15, padding: "10px" }}
                      placeholder="🔍 Status suchen… (z.B. zocken)"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                    {filtered ? (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {filtered.length === 0 && <div className="vv-muted" style={{ fontSize: 13 }}>Nichts gefunden.</div>}
                        {filtered.map(([em, lbl]) => {
                          const val = `${em} ${lbl}`;
                          return (
                            <button key={lbl} type="button" onClick={() => setPending(val)} style={chipStyle(me.mood === val)}>{em} {lbl}</button>
                          );
                        })}
                      </div>
                    ) : (
                      STATUS_CATS.map((cat) => (
                        <div key={cat.title} style={{ marginBottom: 10 }}>
                          <div style={{ fontSize: 13, fontWeight: "bold", color: "#c2185b", margin: "4px 0 6px" }}>{cat.title}</div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {cat.items.map(([em, lbl]) => {
                              const val = `${em} ${lbl}`;
                              return (
                                <button key={lbl} type="button" onClick={() => setPending(val)} style={chipStyle(me.mood === val)}>{em} {lbl}</button>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    )}
                    {me.mood && (
                      <button type="button" disabled={saving} onClick={() => applyStatus("", false)}
                        style={{ marginTop: 6, width: "100%", padding: "9px", borderRadius: 12, border: "1px solid #f3c", background: "#fff", color: "#a00", cursor: "pointer" }}>
                        ✖ Status entfernen
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          </div>
        ) : (
          <Link href="/login" className="vv-nav2-loginbtn">🔑 Login</Link>
        )}
      </div>

      <div className={`vv-nav2-panel${open ? " vv-open" : ""}`}>
        <div className="vv-nav2-panel-inner">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`vv-nav2-item${isActive(l.href) ? " vv-active" : ""}`}
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

      {open && <div className="vv-nav2-backdrop" onClick={() => setOpen(false)} />}
      {statusOpen && <div className="vv-nav2-backdrop" onClick={closeStatus} />}
    </nav>
  );
}
