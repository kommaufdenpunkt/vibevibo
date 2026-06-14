"use client";

// 🏆 Auszeichnungs-Galerie — alle eigenen Auszeichnungen + Fortschritt
// auf gesperrten. Versteckte Auszeichnungen tauchen erst auf wenn verdient.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMe } from "@/lib/useMe";
import PremiumHero from "@/components/PremiumHero";

const CATEGORIES = {
  anfang:    { label: "🌱 Anfang",    color: "#10b981" },
  sammler:   { label: "📊 Sammler",   color: "#3b82f6" },
  loyalty:   { label: "🔥 Loyalty",   color: "#f59e0b" },
  vibo:      { label: "🥚 Mein VIBO", color: "#a855f7" },
  events:    { label: "🎉 Events",    color: "#ec4899" },
  versteckt: { label: "🤫 Versteckt", color: "#64748b" },
};

export default function AchievementsPage() {
  const { me, loading } = useMe();
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!me) return;
    fetch("/api/me/achievements", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => setData(d || { achievements: [], stats: { earned: 0, total: 0 } }))
      .catch(() => setData({ achievements: [], stats: { earned: 0, total: 0 } }));
  }, [me]);

  if (loading) return null;
  if (!me) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <Link href="/login?next=/profile/achievements" className="vv-btn vv-btn-pink">Zum Login</Link>
      </div>
    );
  }
  if (!data) {
    return <div style={{ padding: 30, color: "#fff", textAlign: "center", textShadow: "0 1px 3px rgba(0,0,0,0.4)" }}>⏳ Lade…</div>;
  }

  // Nach Kategorie gruppieren
  const grouped = {};
  for (const a of data.achievements) {
    if (!grouped[a.cat]) grouped[a.cat] = [];
    grouped[a.cat].push(a);
  }

  return (
    <div style={{ background: "transparent", paddingBottom: 100 }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "12px 12px 0" }}>

        {/* Hero */}
        <PremiumHero
          eyebrow="🏆 Auszeichnungen"
          title="Deine Sammlung"
          gradient="gold"
          sparkles={["🏆", "★", "✨"]}
          stats={[{ value: `${data.stats.earned} / ${data.stats.total} freigeschaltet`, color: "rgba(0,0,0,0.25)" }]}
        />

        {Object.entries(CATEGORIES).map(([catId, catInfo]) => {
          const items = grouped[catId] || [];
          if (items.length === 0) return null;
          const earnedInCat = items.filter((a) => a.earned).length;
          return (
            <div key={catId} style={{ marginBottom: 16 }}>
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                marginBottom: 8, padding: "0 4px",
              }}>
                <div style={{
                  fontSize: 13, fontWeight: 900, color: "#fff",
                  textShadow: "0 2px 6px rgba(0,0,0,0.4)",
                  letterSpacing: 0.8,
                }}>{catInfo.label}</div>
                <div style={{
                  background: "rgba(255,255,255,0.18)",
                  backdropFilter: "blur(8px)",
                  color: "#fff", padding: "3px 10px", borderRadius: 999,
                  fontSize: 11, fontWeight: 700,
                }}>{earnedInCat}/{items.length}</div>
              </div>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                gap: 10,
              }}>
                {items.map((a) => <AchievementCard key={a.slug} ach={a} catColor={catInfo.color} />)}
              </div>
            </div>
          );
        })}

      </div>
    </div>
  );
}

function AchievementCard({ ach, catColor }) {
  const fmtDate = ach.earnedAt
    ? new Date(ach.earnedAt).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" })
    : "";

  return (
    <div style={{
      background: ach.earned ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.55)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      borderRadius: 12, padding: 12,
      border: ach.earned ? `2px solid ${catColor}` : "2px dashed rgba(0,0,0,0.15)",
      boxShadow: ach.earned ? `0 4px 12px ${catColor}40` : "0 2px 6px rgba(0,0,0,0.04)",
      textAlign: "center",
      opacity: ach.earned ? 1 : 0.6,
      transition: "transform 0.12s",
    }}>
      <div style={{
        fontSize: 40, lineHeight: 1, marginBottom: 6,
        filter: ach.earned ? "none" : "grayscale(0.6)",
      }}>{ach.emoji}</div>
      <div style={{
        fontSize: 13, fontWeight: 900, color: "#1f2937",
        marginBottom: 3, lineHeight: 1.2,
      }}>{ach.name}</div>
      <div style={{
        fontSize: 10.5, color: "#475569", lineHeight: 1.3,
        marginBottom: 6,
      }}>{ach.desc}</div>
      {ach.earned ? (
        <div style={{
          background: catColor, color: "#fff",
          padding: "3px 10px", borderRadius: 999,
          fontSize: 10, fontWeight: 800, display: "inline-block",
        }}>✓ {fmtDate}</div>
      ) : (
        <div style={{
          background: "#f1f5f9", color: "#64748b",
          padding: "3px 10px", borderRadius: 999,
          fontSize: 10, fontWeight: 700, display: "inline-block",
        }}>🔒 noch nicht</div>
      )}
    </div>
  );
}
