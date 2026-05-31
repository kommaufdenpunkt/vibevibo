// Mini-Pixel-Sprites für VIBO. Pure-SVG, kein Asset nötig.
// Jeder Sprite ist ein 16x16-Raster, je nach Stage und Stimmung
// werden Augen/Mund leicht variiert.

const SP = {
  sprout:  { primary: "#10b981", accent: "#fbbf24", dark: "#065f46" },
  kitsune: { primary: "#f97316", accent: "#fff",    dark: "#7c2d12" },
  drago:   { primary: "#8b5cf6", accent: "#fde68a", dark: "#4c1d95" },
  knuddi:  { primary: "#ec4899", accent: "#fff",    dark: "#831843" },
  stella:  { primary: "#fbbf24", accent: "#1f5fa8", dark: "#92400e" },
};

// Sprite-Definition pro Stage: 16x16-Strings.
// Zeichen:
//   . = transparent
//   # = primary (Körper)
//   o = dark (Outline / Schatten)
//   a = accent
//   e = Auge (schwarz/dunkel)
//   m = Mund (dunkel)
//   * = Wange (rosa)
const SPRITES = {
  egg: [
    "................",
    ".....######.....",
    "....########....",
    "...##########...",
    "..############..",
    "..############..",
    ".##############.",
    ".##############.",
    ".##############.",
    "..############..",
    "..############..",
    "...##########...",
    "....########....",
    ".....######.....",
    "................",
    "................",
  ],
  baby: [
    "................",
    "................",
    ".....######.....",
    "....########....",
    "...####a#####...",
    "..############..",
    "..##e######e##..",
    "..############..",
    "..############..",
    "..####mmmm####..",
    "..############..",
    "...##########...",
    "....########....",
    ".....##..##.....",
    "....##....##....",
    "................",
  ],
  kid: [
    "................",
    "...##......##...",
    "..####....####..",
    "..######a#####..",
    "..############..",
    ".##############.",
    ".##e########e##.",
    ".##############.",
    ".####**####**##.",
    ".##############.",
    ".#####mmmm#####.",
    "..############..",
    "...##########...",
    "...##......##...",
    "..####....####..",
    "................",
  ],
  teen: [
    "................",
    "....##....##....",
    "...####aa####...",
    "...###aaaa###...",
    "..############..",
    ".##############.",
    "##e##########e##",
    "##############.#",
    "##**########**##",
    "##############.#",
    "##############.#",
    "###mmm#mmm####.#",
    ".##############.",
    "...##########...",
    "...##......##...",
    "..####....####..",
  ],
  adult: [
    "................",
    "...##......##...",
    "..####....####..",
    "..######aa####..",
    ".###aaaaaa#####.",
    ".##############.",
    "##e##########e##",
    "################",
    "##**##########*#",
    "################",
    "################",
    "###mmm##mmm#####",
    ".##############.",
    "..############..",
    "...##......##...",
    "...##......##...",
  ],
  elder: [
    "................",
    "...oo......oo...",
    "..oooo....oooo..",
    "..oo##aaaa##oo..",
    ".##############.",
    ".##############.",
    "##e##aaaa####e##",
    "##############.#",
    "##**##oooo##**##",
    "##############.#",
    "##############.#",
    "##oo########oo##",
    ".##oommmmoo###..",
    "..############..",
    "...##......##...",
    "..oooo....oooo..",
  ],
  dead: [
    "................",
    "................",
    "......++++......",
    "......+##+......",
    "......+##+......",
    "..++++######++..",
    "..+##########+..",
    "..+##XXXXXXX#+..",
    "..+##XX##XXX#+..",
    "..+##########+..",
    "..++########++..",
    "...+#~~~~~~#+...",
    "...+##########..",
    "...+##########..",
    "................",
    "................",
  ],
};

// "+" = stein/grau, "X" = Risse, "~" = Inschrift
const CHAR_COLOR = {
  "#": "primary",
  o: "dark",
  a: "accent",
  e: "#1c1c1e",
  m: "#7c2d12",
  "*": "#ec4899",
  "+": "#6b7280",
  X: "#1f2937",
  "~": "#9ca3af",
};

// Custom-PNG-Loader: probiert /vibo/{species}/{stage}.png aus public/.
// Fällt auf das SVG-Pixel-Art zurück wenn das PNG fehlt.
import { useEffect, useState } from "react";

function CustomSprite({ src, alt, size, sleeping }) {
  return (
    <img
      src={src} alt={alt}
      width={size} height={size}
      style={{
        imageRendering: "pixelated",
        display: "block",
        animation: sleeping ? "none" : "vv-vibo-bounce 2.5s ease-in-out infinite",
        filter: sleeping ? "brightness(0.85)" : "none",
      }}
    />
  );
}

export default function ViboSprite({ stage = "kid", species = "sprout", mood = "okay", size = 96, blink = true, sleeping = false }) {
  // Custom PNG zuerst probieren
  const [hasCustom, setHasCustom] = useState(null);
  const customUrl = `/vibo/${species}/${stage}.png`;
  useEffect(() => {
    let cancelled = false;
    const img = new window.Image();
    img.onload = () => { if (!cancelled) setHasCustom(true); };
    img.onerror = () => { if (!cancelled) setHasCustom(false); };
    img.src = customUrl;
    return () => { cancelled = true; };
  }, [customUrl]);

  if (hasCustom) {
    return <CustomSprite src={customUrl} alt={`VIBO ${stage}`} size={size} sleeping={sleeping} />;
  }

  const pal = SP[species] || SP.sprout;
  const lines = SPRITES[stage] || SPRITES.kid;
  const cell = size / 16;

  // Mood beeinflusst Mund/Augen-Variation
  const happy = mood === "glücklich" || mood === "okay";
  const sad = mood === "traurig" || mood === "missmutig";
  const sick = mood === "krank";

  const cells = [];
  lines.forEach((line, y) => {
    for (let x = 0; x < line.length; x++) {
      const ch = line[x];
      if (ch === "." || ch === " ") continue;
      let color = CHAR_COLOR[ch];
      if (color === "primary") color = pal.primary;
      else if (color === "dark") color = pal.dark;
      else if (color === "accent") color = pal.accent;
      // Krank → Körper grünlich blass
      if (sick && (ch === "#")) color = "#9ca3af";
      // Traurig → Mund nach unten (kein einfacher Pixel-Swap, lass weg)
      cells.push(
        <rect
          key={`${x}-${y}`}
          x={x * cell} y={y * cell}
          width={cell} height={cell}
          fill={color}
        />
      );
    }
  });

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      style={{
        imageRendering: "pixelated",
        display: "block",
        animation: stage !== "dead" && stage !== "egg" ? "vv-vibo-bounce 2.5s ease-in-out infinite" : (stage === "egg" ? "vv-vibo-wiggle 4s ease-in-out infinite" : "none"),
      }}
      aria-label={`VIBO Stadium ${stage}`}
    >
      <style>{`
        @keyframes vv-vibo-bounce {
          0%,100% { transform: translateY(0); }
          50% { transform: translateY(-${Math.max(2, size * 0.04)}px); }
        }
        @keyframes vv-vibo-wiggle {
          0%,100% { transform: rotate(0deg); }
          45% { transform: rotate(-3deg); }
          55% { transform: rotate(3deg); }
        }
      `}</style>
      {cells}
    </svg>
  );
}

export { SP as VIBO_PALETTES };
