"use client";

// 🎨 Saisonaler Rahmen ums Com-Hero. Per Owner-Auswahl oder Auto-Modus (nach Datum).
// Reine CSS-Deko — keine Performance-Kosten, respektiert prefers-reduced-motion.

import { useMemo } from "react";

const SEASONS = {
  spring:    { glyphs: ["🌸", "🌷", "🌼", "🐝", "🦋"], hue: "#fbcfe8" },
  summer:    { glyphs: ["☀", "🌻", "🌊", "🍉", "🏖"], hue: "#fef08a" },
  autumn:    { glyphs: ["🍂", "🍁", "🌰", "🍄", "🦔"], hue: "#fed7aa" },
  winter:    { glyphs: ["❄", "⛄", "🧣", "🌨", "✨"], hue: "#bae6fd" },
  halloween: { glyphs: ["🎃", "👻", "🦇", "🕸", "🕷"], hue: "#fed7aa" },
  xmas:      { glyphs: ["🎄", "🎅", "❄", "🎁", "⭐"], hue: "#fecaca" },
  newyear:   { glyphs: ["🎆", "🎇", "🥂", "✨", "🎊"], hue: "#fef08a" },
  valentine: { glyphs: ["💘", "💖", "🌹", "💋", "💝"], hue: "#fecaca" },
};

function autoSeason(d = new Date()) {
  const m = d.getMonth() + 1; // 1-12
  const day = d.getDate();
  if (m === 12 && day >= 27) return "newyear";
  if (m === 12) return "xmas";
  if (m === 10 && day >= 20) return "halloween";
  if (m === 11) return "autumn";
  if (m === 2 && day >= 10 && day <= 16) return "valentine";
  if (m >= 1 && m <= 2) return "winter";
  if (m >= 3 && m <= 5) return "spring";
  if (m >= 6 && m <= 8) return "summer";
  return "autumn"; // Sept/Okt
}

export default function ComHeroSeasonalFrame({ season = "auto" }) {
  const active = season === "auto" ? autoSeason() : season;
  const cfg = SEASONS[active] || SEASONS.spring;

  // Erzeugt 14 Deko-Glyphs um den Hero-Rand verteilt
  const items = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 14; i++) {
      arr.push({
        glyph: cfg.glyphs[i % cfg.glyphs.length],
        // entlang des Rands platzieren: oben/unten/links/rechts
        side: ["top", "right", "bottom", "left"][i % 4],
        offset: 4 + Math.random() * 92,
        size: 16 + Math.random() * 12,
        delay: Math.random() * 4,
        rot: (Math.random() - 0.5) * 30,
      });
    }
    return arr;
  }, [active]);

  return (
    <div aria-hidden="true" style={{
      position: "absolute", inset: 0, pointerEvents: "none",
      borderRadius: 18, overflow: "hidden", zIndex: 2,
    }}>
      <style jsx>{`
        @keyframes vv-bob {
          0%,100% { transform: translateY(0) rotate(var(--r,0deg)); }
          50%     { transform: translateY(-4px) rotate(calc(var(--r,0deg) + 6deg)); }
        }
        @media (prefers-reduced-motion: reduce) {
          .vv-deco { animation: none !important; }
        }
        .vv-deco {
          position: absolute;
          will-change: transform;
          filter: drop-shadow(0 1px 2px rgba(0,0,0,0.25));
          animation: vv-bob 3.5s ease-in-out infinite;
          user-select: none;
        }
      `}</style>
      {/* Sanft eingefärbter Rand */}
      <div style={{
        position: "absolute", inset: 0,
        boxShadow: `inset 0 0 40px ${cfg.hue}99`,
        borderRadius: 18,
      }} />
      {items.map((p, i) => {
        const pos = {};
        if (p.side === "top")    { pos.top = 4; pos.left = `${p.offset}%`; }
        if (p.side === "bottom") { pos.bottom = 4; pos.left = `${p.offset}%`; }
        if (p.side === "left")   { pos.left = 4; pos.top = `${p.offset}%`; }
        if (p.side === "right")  { pos.right = 4; pos.top = `${p.offset}%`; }
        return (
          <span key={i} className="vv-deco" style={{
            ...pos,
            fontSize: p.size,
            animationDelay: `${p.delay}s`,
            "--r": `${p.rot}deg`,
          }}>{p.glyph}</span>
        );
      })}
    </div>
  );
}
