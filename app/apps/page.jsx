"use client";

// 📲 Apps-Launcher — Smartphone-Home-Screen-Style.
// Alle Features als Kacheln gruppiert nach Zweck.
// Für jede Aufgabe gibt es mehrere "Apps" zur Auswahl.

import { useState, useMemo } from "react";
import Link from "next/link";
import { useMe } from "@/lib/useMe";

const APPS = [
  // 🏠 Start
  { id: "heute",       cat: "start",   icon: "🏠", name: "Heute",          desc: "Tages-Übersicht", href: "/heute" },
  { id: "profile",     cat: "start",   icon: "🪪", name: "Mein Profil",    desc: "Deine Seite",     href: "/profile" },
  { id: "edit",        cat: "start",   icon: "✏️", name: "Bearbeiten",     desc: "Profil pflegen",  href: "/profile/edit" },
  { id: "skin",        cat: "start",   icon: "🎨", name: "Skin / Theme",   desc: "Look anpassen",   href: "/profile/skin" },
  { id: "privacy",     cat: "start",   icon: "🛡", name: "Schutz",         desc: "Privatsphäre",    href: "/profile/privacy" },
  { id: "achievements", cat: "start",  icon: "🏆", name: "Auszeichnungen", desc: "Deine Sammlung",  href: "/profile/achievements" },

  // 💬 Reden
  { id: "messenger",   cat: "talk",    icon: "💬", name: "Messenger",      desc: "1-zu-1 Chat",     href: "/messenger" },
  { id: "buschfunk",   cat: "talk",    icon: "📣", name: "Buschfunk",      desc: "Status & Posts",  href: "/buschfunk" },
  { id: "gruppen",     cat: "talk",    icon: "🏘️", name: "Gruppen",        desc: "Themen-Räume",    href: "/gruppen" },
  { id: "live",        cat: "talk",    icon: "📺", name: "Live",           desc: "Video-Streams",   href: "/live" },

  // 👯 Freundschaft
  { id: "friends",     cat: "social",  icon: "👯", name: "Freunde",        desc: "Deine Crew",      href: "/freunde" },
  { id: "neu",         cat: "social",  icon: "🆕", name: "Neuigkeiten",    desc: "Was läuft",       href: "/neu" },
  { id: "schulen",     cat: "social",  icon: "🎓", name: "Schulen",        desc: "Klassen-Netz",    href: "/schulen" },
  { id: "compliments", cat: "social",  icon: "💝", name: "Komplimente",    desc: "Lieb sein",       href: "/compliments" },

  // 🥚 Pet
  { id: "vibo",        cat: "pet",     icon: "🥚", name: "Mein VIBO",      desc: "Dein Tamagotchi", href: "/vibo" },
  { id: "vibo-shop",   cat: "pet",     icon: "🛒", name: "VIBO-Shop",      desc: "Futter & Möbel",  href: "/shop?tab=vibo" },
  { id: "vibo-game",   cat: "pet",     icon: "🍕", name: "Snack-Schnapp",  desc: "Mini-Game",       href: "/vibo/minigame" },
  { id: "cemetery",    cat: "pet",     icon: "🪦", name: "Friedhof",       desc: "Erinnerungen",    href: "/vibo/cemetery" },

  // 🌍 Erkunden
  { id: "karte",       cat: "world",   icon: "🗺️", name: "Realitätskarte", desc: "Welt erkunden",   href: "/karte" },
  { id: "fotos",       cat: "world",   icon: "📸", name: "Fotos",          desc: "Alle Bilder",     href: "/fotos" },
  { id: "geschenke",   cat: "world",   icon: "🎁", name: "Geschenke",      desc: "Verschicken",     href: "/geschenke" },
  { id: "markt",       cat: "world",   icon: "💰", name: "Markt",          desc: "Items handeln",   href: "/markt" },

  // 💰 Vibes verdienen
  { id: "vibes-earn",  cat: "earn",    icon: "💰", name: "Vibes verdienen",desc: "Werbung & Co",    href: "/vibes-verdienen" },
  { id: "quests",      cat: "earn",    icon: "🥇", name: "Quests",         desc: "Aufgaben lösen",  href: "/quests" },
  { id: "daily",       cat: "earn",    icon: "🎁", name: "Tages-Bonus",    desc: "Tägliche ✨",     href: "/heute" },
  { id: "rang",        cat: "earn",    icon: "🏆", name: "Rang & XP",      desc: "Level up",        href: "/rang" },

  // 🛍️ Shop
  { id: "shop",        cat: "shop",    icon: "🛍️", name: "Shop",           desc: "Premium-Account", href: "/shop" },
  { id: "echtgeld",    cat: "shop",    icon: "💳", name: "Echtgeld-Kauf",  desc: "Vibes & VIP",     href: "/shop#stripe" },
  { id: "empfehl",     cat: "shop",    icon: "💝", name: "Empfehlungen",   desc: "Amazon-Shop",     href: "/vibes-verdienen?tab=empfehlungen" },
  { id: "vibes-tx",    cat: "shop",    icon: "📊", name: "Transaktionen",  desc: "Vibes-Verlauf",   href: "/profile/transactions" },

  // 🎮 Spielen
  { id: "games",       cat: "play",    icon: "🎮", name: "Spiele",         desc: "Mini-Games",      href: "/spiele" },
  { id: "cards",       cat: "play",    icon: "🃏", name: "Sammelkarten",   desc: "Tauschen",        href: "/cards" },
  { id: "fortune",     cat: "play",    icon: "🔮", name: "Tages-Spruch",   desc: "Glückskeks",      href: "/heute" },

  // ⚙️ System
  { id: "datenschutz", cat: "system",  icon: "🛡️", name: "Datenschutz",    desc: "DSGVO",           href: "/datenschutz" },
  { id: "impressum",   cat: "system",  icon: "📄", name: "Impressum",      desc: "Rechtliches",     href: "/impressum" },
  { id: "install",     cat: "system",  icon: "📲", name: "Als App",        desc: "PWA installieren",href: "/installieren" },

  // 👑 Admin (wird gefiltert)
  { id: "admin",       cat: "admin",   icon: "👑", name: "Admin",          desc: "System-Tools",    href: "/admin", adminOnly: true },
  { id: "admin-neu",   cat: "admin",   icon: "🆕", name: "Admin: NEU",     desc: "Posts pflegen",   href: "/admin/neu", adminOnly: true },
  { id: "admin-pwa",   cat: "admin",   icon: "📲", name: "PWA-Installs",   desc: "Installs sehen",  href: "/admin/pwa", adminOnly: true },
  { id: "admin-econ",  cat: "admin",   icon: "🤖", name: "Fidolin",        desc: "Wirtschaft",      href: "/admin?tab=economy", adminOnly: true },
];

const CATEGORIES = [
  { id: "start",  label: "Start",        color: "#fce7f3", border: "#ec4899" },
  { id: "talk",   label: "Reden",        color: "#dbeafe", border: "#3b82f6" },
  { id: "social", label: "Freundschaft", color: "#fef3c7", border: "#f59e0b" },
  { id: "pet",    label: "Mein VIBO",    color: "#ede9fe", border: "#8b5cf6" },
  { id: "world",  label: "Erkunden",     color: "#cffafe", border: "#06b6d4" },
  { id: "earn",   label: "Verdienen",    color: "#dcfce7", border: "#22c55e" },
  { id: "shop",   label: "Kaufen",       color: "#ffedd5", border: "#fb923c" },
  { id: "play",   label: "Spielen",      color: "#fce7ff", border: "#c026d3" },
  { id: "system", label: "System",       color: "#f1f5f9", border: "#94a3b8" },
  { id: "admin",  label: "Admin",        color: "#fee2e2", border: "#dc2626" },
];

const PIN_KEY = "vv_apps_pinned";

function loadPinned() {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(PIN_KEY) || "[]"); } catch { return []; }
}
function savePinned(ids) {
  try { localStorage.setItem(PIN_KEY, JSON.stringify(ids)); } catch { /* ignore */ }
}

export default function AppsPage() {
  const { me } = useMe();
  const [pinned, setPinned] = useState(loadPinned);
  const [search, setSearch] = useState("");

  const isAdmin = !!me?.isAdmin;

  // Apps filtern: Admin-only nur für Admins zeigen + nach Suche filtern
  const visibleApps = useMemo(() => {
    const term = search.trim().toLowerCase();
    return APPS.filter((a) => {
      if (a.adminOnly && !isAdmin) return false;
      if (!term) return true;
      return a.name.toLowerCase().includes(term) ||
             a.desc.toLowerCase().includes(term) ||
             (CATEGORIES.find((c) => c.id === a.cat)?.label || "").toLowerCase().includes(term);
    });
  }, [search, isAdmin]);

  const pinnedApps = useMemo(() => {
    return pinned.map((id) => visibleApps.find((a) => a.id === id)).filter(Boolean);
  }, [pinned, visibleApps]);

  function togglePin(id) {
    setPinned((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      savePinned(next);
      return next;
    });
  }

  // Apps nach Kategorie gruppieren
  const grouped = useMemo(() => {
    const map = new Map();
    CATEGORIES.forEach((c) => map.set(c.id, []));
    visibleApps.forEach((a) => {
      if (!map.has(a.cat)) map.set(a.cat, []);
      map.get(a.cat).push(a);
    });
    return map;
  }, [visibleApps]);

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "10px 12px 80px" }}>
      {/* HERO */}
      <div style={{
        background: "linear-gradient(135deg, #8b5cf6, #ec4899)",
        color: "#fff", padding: "14px 16px", borderRadius: 16, marginBottom: 12,
        boxShadow: "0 4px 12px rgba(139,92,246,0.25)",
      }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>📲 Alle Apps</h1>
        <p style={{ margin: "4px 0 10px", fontSize: 13, opacity: 0.95 }}>
          Alle Features auf einen Blick · ⭐ tippen zum Pinnen oben
        </p>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 App suchen…"
          style={{
            width: "100%", padding: "8px 12px", borderRadius: 10,
            border: "none", fontSize: 14, background: "rgba(255,255,255,0.9)",
            color: "#1f2937", outline: "none",
          }}
        />
      </div>

      {/* PINNED (oben, wenn vorhanden) */}
      {pinnedApps.length > 0 && (
        <CategoryBlock
          label="⭐ Deine Favoriten"
          color="#fef9c3"
          border="#eab308"
          apps={pinnedApps}
          pinned={pinned}
          onPinToggle={togglePin}
        />
      )}

      {/* CATEGORIES */}
      {CATEGORIES.map((c) => {
        const apps = grouped.get(c.id) || [];
        if (apps.length === 0) return null;
        return (
          <CategoryBlock
            key={c.id}
            label={c.label}
            color={c.color}
            border={c.border}
            apps={apps}
            pinned={pinned}
            onPinToggle={togglePin}
          />
        );
      })}

      {visibleApps.length === 0 && (
        <div style={{
          padding: 30, textAlign: "center", color: "#64748b",
          background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb",
        }}>
          <div style={{ fontSize: 34 }}>🔍</div>
          <div style={{ fontWeight: 700, marginTop: 6 }}>Nichts gefunden.</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Probier einen anderen Suchbegriff.</div>
        </div>
      )}

      <div style={{ marginTop: 16, padding: 10, fontSize: 11, color: "#94a3b8", textAlign: "center" }}>
        ✿ Tipp: Tippe auf ⭐ neben einer App, um sie ganz oben anzuzeigen. ✿
      </div>
    </div>
  );
}

function CategoryBlock({ label, color, border, apps, pinned, onPinToggle }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <h2 style={{
        margin: "0 0 6px", fontSize: 13, fontWeight: 800,
        color: "#1f2937", letterSpacing: 0.3, textTransform: "uppercase",
        padding: "0 4px",
      }}>{label}</h2>
      <div style={{
        background: color, border: `1.5px solid ${border}`,
        borderRadius: 14, padding: 10,
      }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))",
          gap: 8,
        }}>
          {apps.map((app) => (
            <AppTile
              key={app.id}
              app={app}
              isPinned={pinned.includes(app.id)}
              onPinToggle={onPinToggle}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function AppTile({ app, isPinned, onPinToggle }) {
  return (
    <div style={{ position: "relative" }}>
      <Link href={app.href} style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "flex-start", textAlign: "center", gap: 4,
        background: "#fff", padding: "10px 6px 8px", borderRadius: 12,
        textDecoration: "none", color: "#1f2937", minHeight: 88,
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        transition: "transform 0.1s",
      }}>
        <span style={{ fontSize: 30, lineHeight: 1, marginBottom: 2 }}>{app.icon}</span>
        <span style={{ fontSize: 11, fontWeight: 800, color: "#1f2937", lineHeight: 1.15 }}>
          {app.name}
        </span>
        <span style={{ fontSize: 9.5, color: "#64748b", lineHeight: 1.1 }}>
          {app.desc}
        </span>
      </Link>
      {/* Pin-Button */}
      <button type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onPinToggle(app.id); }}
        title={isPinned ? "Pin entfernen" : "An Favoriten anpinnen"}
        style={{
          position: "absolute", top: 2, right: 2,
          background: isPinned ? "#fbbf24" : "rgba(255,255,255,0.95)",
          border: `1px solid ${isPinned ? "#f59e0b" : "#e5e7eb"}`,
          borderRadius: 999, width: 22, height: 22,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, cursor: "pointer", padding: 0,
          boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
        }}>
        {isPinned ? "⭐" : "☆"}
      </button>
    </div>
  );
}
