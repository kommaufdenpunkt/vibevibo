"use client";

// 📢 Welcome/News-Toast — zeigt eingeloggten Usern EINMAL pro Update-Kampagne
// einen Toast unten rechts der auf /neu verlinkt. State pro Browser-Profil
// in localStorage. Wenn CAMPAIGN_ID hier hochgezogen wird, sehen alle User
// den Toast erneut (so können wir auch zukünftige Mega-Updates ankündigen).

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useMe } from "@/lib/useMe";

const CAMPAIGN_ID = "mega-update-juni-2026";
const STORAGE_KEY = "vv_news_campaign_seen";
const SHOW_DELAY_MS = 2500;

// Routen wo der Toast NICHT erscheint — Login, Maintenance, intime Editoren
const SUPPRESS_PREFIXES = [
  "/login", "/register", "/installieren",
  "/admin", "/profile/edit", "/profile/skin", "/profile/status",
];

function isSuppressed(path) {
  if (!path) return true;
  for (const p of SUPPRESS_PREFIXES) {
    if (path === p || path.startsWith(p + "/")) return true;
  }
  return false;
}

export default function NewsToast() {
  const { me } = useMe();
  const pathname = usePathname();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!me) return;
    if (isSuppressed(pathname)) return;
    try {
      if (localStorage.getItem(STORAGE_KEY) === CAMPAIGN_ID) return;
    } catch { return; }
    const t = setTimeout(() => setShow(true), SHOW_DELAY_MS);
    return () => clearTimeout(t);
  }, [me, pathname]);

  function dismiss() {
    setShow(false);
    try { localStorage.setItem(STORAGE_KEY, CAMPAIGN_ID); } catch {}
  }

  if (!show || !me) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed", right: 12, bottom: 80, zIndex: 9998,
        maxWidth: 360,
        background: "linear-gradient(135deg, #ec4899, #8b5cf6)",
        color: "#fff",
        borderRadius: 14,
        padding: 14,
        boxShadow: "0 10px 32px rgba(139, 92, 246, 0.42)",
        fontFamily: "Arial, sans-serif",
        animation: "vv-news-toast-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both",
      }}
    >
      <style jsx>{`
        @keyframes vv-news-toast-in {
          from { opacity: 0; transform: translateY(20px) scale(0.9); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          [role="status"] { animation: none; }
        }
      `}</style>

      <button
        onClick={dismiss}
        aria-label="Schließen"
        style={{
          position: "absolute", top: 6, right: 8,
          background: "transparent", border: "none", cursor: "pointer",
          color: "rgba(255,255,255,0.7)", fontSize: 22, lineHeight: 1,
          padding: 4,
        }}
      >×</button>

      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <div style={{ fontSize: 32, lineHeight: 1, flexShrink: 0 }}>🚀</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4, letterSpacing: 0.2 }}>
            Großes VibeVibo-Update!
          </div>
          <div style={{ fontSize: 12.5, lineHeight: 1.4, opacity: 0.95, marginBottom: 10 }}>
            🛡 Frauen-Schutz mit Stimm-Verifikation · 🎤 KI-moderierte Sprachnachrichten · 🔓 8 neue Com-Funktionen
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Link
              href="/neu"
              onClick={dismiss}
              style={{
                background: "rgba(255,255,255,0.95)",
                color: "#9d174d",
                padding: "7px 14px",
                borderRadius: 999,
                textDecoration: "none",
                fontSize: 12,
                fontWeight: 800,
                lineHeight: 1.2,
                whiteSpace: "nowrap",
              }}
            >Was ist neu? →</Link>
            <button
              onClick={dismiss}
              style={{
                background: "rgba(0,0,0,0.18)",
                color: "#fff",
                padding: "7px 14px",
                borderRadius: 999,
                border: "none",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 700,
                fontFamily: "inherit",
                lineHeight: 1.2,
                whiteSpace: "nowrap",
              }}
            >Später</button>
          </div>
        </div>
      </div>
    </div>
  );
}
