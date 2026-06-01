"use client";

// Inline-Anzeige der Premium-Badges neben einem Usernamen.
// Werden im Premium-Shop freigekauft (lib/premium.js).

const BADGE_META = {
  gold:     { emoji: "🥇", title: "Gold-Mitglied", glow: "0 0 6px #fde047" },
  diamond:  { emoji: "💎", title: "Diamant-Premium", glow: "0 0 6px #67e8f9" },
  rainbow:  { emoji: "🌈", title: "Regenbogen-Rahmen", glow: "0 0 6px #f0abfc" },
};

export default function PremiumBadges({ badges, size = 14, gap = 3 }) {
  if (!badges || !badges.length) return null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap, lineHeight: 1, verticalAlign: "middle" }}>
      {badges.map((b) => {
        const m = BADGE_META[b];
        if (!m) return null;
        return (
          <span key={b} title={m.title}
            style={{ fontSize: size, filter: `drop-shadow(${m.glow})` }}>
            {m.emoji}
          </span>
        );
      })}
    </span>
  );
}

// Helper: hat User den Regenbogen-Rahmen? → Style für sein Avatar-Bild
export function rainbowFrameStyle(badges) {
  if (!badges?.includes("rainbow")) return null;
  return {
    boxShadow: "0 0 0 3px transparent, 0 0 0 5px transparent",
    background: "linear-gradient(45deg, #f87171, #fbbf24, #34d399, #60a5fa, #a78bfa, #f472b6)",
    backgroundSize: "300% 300%",
    animation: "vv-rainbow-anim 4s ease infinite",
    padding: 3,
    borderRadius: "50%",
  };
}
