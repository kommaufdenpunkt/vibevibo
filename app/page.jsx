"use client";

// 🏠 Startseite — Buschfunk-Live-Feed als Hauptseite.
// Vorher: Hero + Mitglieder-Spalten + Buschfunk-Card. Wurde ersetzt durch das
// klare Buschfunk-First-Layout.

import Link from "next/link";
import Buschfunk from "@/components/Buschfunk";
import { useMe } from "@/lib/useMe";

export default function HomePage() {
  const { me } = useMe();

  if (!me) {
    return (
      <div style={{ padding: 24, maxWidth: 480, margin: "40px auto 0", textAlign: "center" }}>
        <div style={{ fontSize: 50, marginBottom: 10 }}>📣</div>
        <h1 style={{ color: "#fff", textShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>VibeVibo</h1>
        <p style={{ color: "#fff", opacity: 0.9, textShadow: "0 1px 4px rgba(0,0,0,0.3)", marginBottom: 18 }}>
          Logge dich ein für deinen Buschfunk-Feed — Freundes-News, Status, Erinnerungen & mehr.
        </p>
        <Link href="/login"
          style={{
            display: "inline-block", padding: "12px 24px", borderRadius: 999,
            background: "linear-gradient(135deg, #fb923c, #ec4899, #8b5cf6)",
            color: "#fff", fontWeight: 800, textDecoration: "none",
            boxShadow: "0 6px 20px rgba(236,72,153,0.4)",
          }}>
          🔑 Einloggen
        </Link>
      </div>
    );
  }

  return (
    <div style={{ background: "transparent", paddingBottom: 100 }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "10px 12px 0" }}>

        {/* === HERO BANNER === */}
        <div style={{
          position: "relative", overflow: "hidden",
          background: "linear-gradient(135deg, #fb923c 0%, #ec4899 50%, #a855f7 100%)",
          backgroundSize: "200% 200%",
          animation: "vv-bf-hero 12s ease infinite",
          borderRadius: 20, padding: "18px 18px",
          color: "#fff", marginBottom: 12,
          boxShadow: "0 8px 24px rgba(236,72,153,0.35)",
        }}>
          <div style={{
            position: "absolute", top: 8, right: 12, fontSize: 26, opacity: 0.45,
            pointerEvents: "none",
          }}>📣</div>
          <div style={{
            position: "absolute", bottom: 8, left: 12, fontSize: 18, opacity: 0.4,
            pointerEvents: "none",
          }}>✨</div>

          <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.95, letterSpacing: 1, textTransform: "uppercase" }}>
            VibeVibo Live-Feed
          </div>
          <div style={{
            fontSize: 26, fontWeight: 900, lineHeight: 1.1, marginTop: 4,
            textShadow: "0 2px 6px rgba(0,0,0,0.25)",
          }}>
            📣 Was läuft heute?
          </div>
          <div style={{
            fontSize: 12.5, opacity: 0.95, marginTop: 6, lineHeight: 1.4,
            textShadow: "0 1px 3px rgba(0,0,0,0.2)",
          }}>
            Freundes-News, Status, neue Profile, Geschenke — alles auf einem Blick.
          </div>

          {/* Quick-Action */}
          <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
            <Link href="/buschfunk/neu" style={{
              background: "rgba(255,255,255,0.95)", color: "#9a3412",
              padding: "8px 16px", borderRadius: 999,
              fontWeight: 900, fontSize: 13, textDecoration: "none",
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            }}>📌 Neuer Post</Link>
            <Link href={`/u/${me.username}#wall`} style={{
              background: "rgba(0,0,0,0.18)", color: "#fff",
              padding: "8px 16px", borderRadius: 999,
              fontWeight: 800, fontSize: 13, textDecoration: "none",
              backdropFilter: "blur(8px)",
            }}>📝 Pinnwand</Link>
            <Link href="/heute" style={{
              background: "rgba(0,0,0,0.18)", color: "#fff",
              padding: "8px 16px", borderRadius: 999,
              fontWeight: 800, fontSize: 13, textDecoration: "none",
              backdropFilter: "blur(8px)",
            }}>📊 Heute</Link>
          </div>
        </div>

        <style>{`
          @keyframes vv-bf-hero {
            0%, 100% { background-position: 0% 50%; }
            50%      { background-position: 100% 50%; }
          }
        `}</style>

        {/* === BUSCHFUNK FEED in Glas-Wrapper === */}
        <div style={{
          background: "rgba(255,255,255,0.88)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderRadius: 18, padding: 4,
          border: "1px solid rgba(255,255,255,0.5)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
        }}>
          <Buschfunk />
        </div>
      </div>
    </div>
  );
}
