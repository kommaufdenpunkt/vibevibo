"use client";

// ❄ Animierte Hintergrund-Layer für Coms (freigeschaltet via Animated-Theme-Unlock).
// Reine CSS-Animationen, respektiert prefers-reduced-motion.

import { useMemo } from "react";

const THEMES = {
  snow:     { glyphs: ["❄", "❅", "❆", "✻"], color: "#bae6fd", fade: 0.85 },
  confetti: { glyphs: ["🎉", "✨", "🎊", "💫"], color: "#fbcfe8", fade: 0.9 },
  leaves:   { glyphs: ["🍂", "🍁", "🍃"], color: "#fed7aa", fade: 0.85 },
  hearts:   { glyphs: ["💖", "💕", "💗", "🌸"], color: "#fbcfe8", fade: 0.85 },
  stars:    { glyphs: ["⭐", "✨", "🌟", "💫"], color: "#fef08a", fade: 0.85 },
};

export default function ComAnimatedBg({ theme = "snow", count = 28 }) {
  const cfg = THEMES[theme] || THEMES.snow;

  const items = useMemo(() => {
    const arr = [];
    for (let i = 0; i < count; i++) {
      arr.push({
        glyph: cfg.glyphs[i % cfg.glyphs.length],
        left: Math.random() * 100,
        size: 14 + Math.random() * 16,
        duration: 10 + Math.random() * 14,
        delay: -Math.random() * 20,
        drift: (Math.random() - 0.5) * 30,
        opacity: 0.35 + Math.random() * 0.5,
      });
    }
    return arr;
  }, [count, theme]);

  return (
    <div aria-hidden="true" style={{
      position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden",
      zIndex: 0, opacity: cfg.fade,
    }}>
      <style jsx>{`
        @keyframes vv-fall {
          0%   { transform: translate3d(0, -10vh, 0) rotate(0deg); }
          100% { transform: translate3d(var(--vv-drift, 0px), 110vh, 0) rotate(360deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .vv-particle { animation: none !important; opacity: 0 !important; }
        }
        .vv-particle {
          position: absolute;
          top: -10vh;
          will-change: transform;
          animation-name: vv-fall;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
          user-select: none;
        }
      `}</style>
      {items.map((p, i) => (
        <span key={i} className="vv-particle" style={{
          left: `${p.left}%`,
          fontSize: p.size,
          opacity: p.opacity,
          animationDuration: `${p.duration}s`,
          animationDelay: `${p.delay}s`,
          "--vv-drift": `${p.drift}vw`,
        }}>{p.glyph}</span>
      ))}
    </div>
  );
}
