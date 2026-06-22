"use client";

// ✨ PremiumHero — wiederverwendbarer hochwertiger Hero für alle Hauptseiten.
// Multi-Stop-Gradient, Glas-Inner-Highlight, optimierte Typographie,
// Mount-Animation, optionale Sparkle-Deko und Stat-Pillen.

import { useEffect, useState } from "react";

export default function PremiumHero({
  // Visual
  eyebrow,           // kleine Caps-Zeile oben (z.B. "DEIN TAGES-HUB")
  title,             // große Haupt-Überschrift
  subtitle,          // Untertitel
  gradient = "default",  // "default" | "warm" | "cool" | "rose" | "gold" | custom array
  sparkles = ["✨", "★", "♡"],  // emoji-Deko die schweben
  // Stats
  stats = [],        // [{ label, value, color? }]
  // Actions
  actions,           // JSX (Buttons)
  // Layout
  compact = false,
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const grad = typeof gradient === "string" ? GRADIENTS[gradient] : gradient;

  return (
    <div style={{
      position: "relative", overflow: "hidden",
      // Multi-Stop High-End Gradient
      background: `linear-gradient(135deg, ${grad.join(", ")})`,
      backgroundSize: "200% 200%",
      animation: "vv-premium-shift 18s cubic-bezier(0.65, 0, 0.35, 1) infinite",
      // Refined shadow: outer drop + inner highlight
      boxShadow: `
        0 1px 0 rgba(255,255,255,0.25) inset,
        0 -1px 0 rgba(0,0,0,0.15) inset,
        0 10px 36px ${grad[0]}55,
        0 4px 12px rgba(0,0,0,0.12)
      `,
      borderRadius: 20,
      padding: compact ? "16px 18px" : "22px 22px",
      color: "#fff",
      marginBottom: 14,
      transform: mounted ? "translateY(0)" : "translateY(-12px)",
      opacity: mounted ? 1 : 0,
      transition: "transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s ease-out",
    }}>
      {/* Subtle inner highlight */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse at top left, rgba(255,255,255,0.2), transparent 60%)",
        pointerEvents: "none",
      }} />

      {/* Sparkle-Deko mit Floating-Animation */}
      {sparkles.map((s, i) => (
        <span key={i} style={{
          position: "absolute",
          top: `${15 + (i * 27) % 60}%`,
          right: `${8 + (i * 31) % 70}%`,
          fontSize: 14 + (i % 3) * 6,
          opacity: 0.5 - (i % 3) * 0.1,
          pointerEvents: "none",
          animation: `vv-premium-float ${4 + (i % 3)}s ease-in-out infinite`,
          animationDelay: `${i * 0.4}s`,
        }}>{s}</span>
      ))}

      {/* Inhalt */}
      <div style={{ position: "relative" }}>
        {eyebrow && (
          <div style={{
            fontSize: 10.5, fontWeight: 800, opacity: 0.95,
            letterSpacing: 1.4, textTransform: "uppercase",
            fontFeatureSettings: '"tnum", "ss01"',
          }}>{eyebrow}</div>
        )}
        <h1 style={{
          margin: eyebrow ? "5px 0 5px" : "0 0 5px",
          fontSize: compact ? 22 : 28,
          fontWeight: 900,
          letterSpacing: -0.5,
          lineHeight: 1.1,
          textShadow: "0 2px 8px rgba(0,0,0,0.18)",
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
        }}>{title}</h1>
        {subtitle && (
          <div style={{
            fontSize: 13.5, opacity: 1, lineHeight: 1.5,
            maxWidth: 600, fontWeight: 600,
            textShadow: "0 1px 3px rgba(0,0,0,0.35), 0 1px 1px rgba(0,0,0,0.2)",
          }}>{subtitle}</div>
        )}

        {/* Stat-Pillen */}
        {stats.length > 0 && (
          <div style={{
            display: "flex", gap: 8, flexWrap: "wrap",
            marginTop: 12,
          }}>
            {stats.map((s, i) => (
              <div key={i} style={{
                background: s.color || "rgba(255,255,255,0.22)",
                backdropFilter: "blur(10px) saturate(140%)",
                WebkitBackdropFilter: "blur(10px) saturate(140%)",
                padding: "6px 14px", borderRadius: 999,
                fontWeight: 800, fontSize: 13,
                border: "1px solid rgba(255,255,255,0.3)",
                fontFeatureSettings: '"tnum"',
                transform: mounted ? "scale(1)" : "scale(0.85)",
                opacity: mounted ? 1 : 0,
                transition: `all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.15 + i * 0.06}s`,
              }}>
                {s.label && <span style={{ opacity: 0.85, fontWeight: 700, marginRight: 4 }}>{s.label}</span>}
                {s.value}
              </div>
            ))}
          </div>
        )}

        {/* Action-Slot */}
        {actions && (
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            {actions}
          </div>
        )}
      </div>

      {/* Inline Keyframes — global registriert (kein CSS-Patch noetig) */}
      <style>{`
        @keyframes vv-premium-shift {
          0%, 100% { background-position: 0% 50%; }
          50%      { background-position: 100% 50%; }
        }
        @keyframes vv-premium-float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50%      { transform: translateY(-6px) rotate(6deg); }
        }
      `}</style>
    </div>
  );
}

// Premium Gradient-Library — sorgfältig abgestimmte HSL-Übergänge
const GRADIENTS = {
  default: ["#ec4899", "#a855f7", "#06b6d4"],
  warm:    ["#fb923c", "#ec4899", "#a855f7"],
  cool:    ["#06b6d4", "#3b82f6", "#6366f1"],
  rose:    ["#fce7f3", "#ec4899", "#9d174d"],
  gold:    ["#fbbf24", "#f59e0b", "#d97706"],
  forest:  ["#10b981", "#059669", "#065f46"],
  midnight: ["#1e1b4b", "#312e81", "#6366f1"],
  sunset:  ["#f59e0b", "#ef4444", "#ec4899"],
};
