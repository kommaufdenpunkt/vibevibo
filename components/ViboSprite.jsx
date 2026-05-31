// Hübschere VIBO-Charaktere als gezeichnete SVGs.
// Pro Spezies ein eindeutiges Wesen mit Blink-/Atem-Animation.
// Custom PNG aus public/vibo/{species}/{stage}.png hat Vorrang (Fallback).
import { useEffect, useState } from "react";

const PALETTES = {
  sprout:  { body: "#86efac", outline: "#16a34a", accent: "#facc15", cheek: "#fda4af" },
  kitsune: { body: "#fb923c", outline: "#9a3412", accent: "#fff",    cheek: "#fda4af" },
  drago:   { body: "#a78bfa", outline: "#5b21b6", accent: "#fde68a", cheek: "#fda4af" },
  knuddi:  { body: "#f9a8d4", outline: "#be185d", accent: "#fff",    cheek: "#f43f5e" },
  stella:  { body: "#fde047", outline: "#a16207", accent: "#3b82f6", cheek: "#fda4af" },
  maunzi:  { body: "#fb923c", outline: "#7c2d12", accent: "#fff",    cheek: "#fda4af" },
  boo:     { body: "#f3f4f6", outline: "#6b21a8", accent: "#a78bfa", cheek: "#fda4af" },
  robi:    { body: "#93c5fd", outline: "#1e3a8a", accent: "#fde047", cheek: "#fda4af" },
};

const SIZE_BY_STAGE = {
  egg:   0.55,
  baby:  0.55,
  kid:   0.70,
  teen:  0.82,
  adult: 0.92,
  elder: 0.92,
  dead:  0.85,
};

function CustomImage({ src, size, sleeping }) {
  // 1-Bit-Sprites werden 35% größer gerendert damit sie das LCD füllen.
  // multiply-Blend macht weißen GIF-Hintergrund unsichtbar auf weißem LCD.
  const renderSize = Math.round(size * 1.35);
  return (
    <img
      src={src} alt=""
      width={renderSize} height={renderSize}
      style={{
        imageRendering: "pixelated",
        display: "block",
        animation: sleeping ? "none" : "vv-vibo-bounce 2.5s ease-in-out infinite",
        filter: sleeping ? "brightness(0.7) contrast(1.1)" : "contrast(1.15)",
        mixBlendMode: "multiply",
      }}
    />
  );
}

// Spezies-spezifisches Add-On (Ohren, Hörner, Stern-Form usw.)
function SpeciesAddon({ species, p, w, h, cx, cy, bodyR }) {
  // Positionen normiert auf 100×100 viewport
  if (species === "sprout") {
    // Blattstiel + Blatt, sanft wippend
    return (
      <g style={{ transformOrigin: `${cx}px ${cy - bodyR}px`, animation: "vv-leaf-sway 3.4s ease-in-out infinite" }}>
        <line x1={cx} y1={cy - bodyR + 2} x2={cx + 3} y2={cy - bodyR - 12} stroke={p.outline} strokeWidth="2.2" strokeLinecap="round" />
        <path d={`M${cx + 3} ${cy - bodyR - 12} q 10 -2 12 -10 q -10 -1 -12 10 z`} fill={p.body} stroke={p.outline} strokeWidth="1.5" />
      </g>
    );
  }
  if (species === "kitsune") {
    // Spitze Ohren — beide wackeln leicht
    return (
      <>
        <g style={{ transformOrigin: `${cx - bodyR * 0.5}px ${cy - bodyR * 0.6}px`, animation: "vv-ear-l 2.3s ease-in-out infinite" }}>
          <path d={`M${cx - bodyR * 0.6} ${cy - bodyR * 0.6} L${cx - bodyR * 0.95} ${cy - bodyR * 1.2} L${cx - bodyR * 0.2} ${cy - bodyR * 0.85} z`} fill={p.body} stroke={p.outline} strokeWidth="2" strokeLinejoin="round" />
          <path d={`M${cx - bodyR * 0.8} ${cy - bodyR * 0.85} L${cx - bodyR * 0.9} ${cy - bodyR * 1.1} L${cx - bodyR * 0.55} ${cy - bodyR * 0.9} z`} fill={p.accent} />
        </g>
        <g style={{ transformOrigin: `${cx + bodyR * 0.5}px ${cy - bodyR * 0.6}px`, animation: "vv-ear-r 2.3s 0.4s ease-in-out infinite" }}>
          <path d={`M${cx + bodyR * 0.6} ${cy - bodyR * 0.6} L${cx + bodyR * 0.95} ${cy - bodyR * 1.2} L${cx + bodyR * 0.2} ${cy - bodyR * 0.85} z`} fill={p.body} stroke={p.outline} strokeWidth="2" strokeLinejoin="round" />
          <path d={`M${cx + bodyR * 0.8} ${cy - bodyR * 0.85} L${cx + bodyR * 0.9} ${cy - bodyR * 1.1} L${cx + bodyR * 0.55} ${cy - bodyR * 0.9} z`} fill={p.accent} />
        </g>
      </>
    );
  }
  if (species === "drago") {
    // Hörnchen + flatternde Flügel
    return (
      <>
        <path d={`M${cx - 8} ${cy - bodyR + 2} q -2 -10 4 -14`} stroke={p.outline} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d={`M${cx + 8} ${cy - bodyR + 2} q 2 -10 -4 -14`} stroke={p.outline} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <g style={{ transformOrigin: `${cx - bodyR * 0.85}px ${cy}px`, animation: "vv-wing-l 0.9s ease-in-out infinite" }}>
          <path d={`M${cx - bodyR * 0.95} ${cy - 2} q -10 -4 -14 6 q 8 2 14 -2 z`} fill={p.accent} stroke={p.outline} strokeWidth="1.5" />
        </g>
        <g style={{ transformOrigin: `${cx + bodyR * 0.85}px ${cy}px`, animation: "vv-wing-r 0.9s ease-in-out infinite" }}>
          <path d={`M${cx + bodyR * 0.95} ${cy - 2} q 10 -4 14 6 q -8 2 -14 -2 z`} fill={p.accent} stroke={p.outline} strokeWidth="1.5" />
        </g>
      </>
    );
  }
  if (species === "knuddi") {
    // Antennen-Haar — pendelt
    return (
      <g style={{ transformOrigin: `${cx}px ${cy - bodyR}px`, animation: "vv-antenna 2.8s ease-in-out infinite" }}>
        <line x1={cx} y1={cy - bodyR} x2={cx - 5} y2={cy - bodyR - 8} stroke={p.outline} strokeWidth="2" strokeLinecap="round" />
        <line x1={cx} y1={cy - bodyR} x2={cx + 5} y2={cy - bodyR - 8} stroke={p.outline} strokeWidth="2" strokeLinecap="round" />
        <circle cx={cx - 5} cy={cy - bodyR - 9} r="2.5" fill={p.cheek} />
        <circle cx={cx + 5} cy={cy - bodyR - 9} r="2.5" fill={p.cheek} />
      </g>
    );
  }
  if (species === "stella") {
    // 5-zackiger Stern-Hintergrund hinter dem Wesen
    const r1 = bodyR * 1.35;
    const r2 = bodyR * 0.7;
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? r1 : r2;
      const a = (i / 10) * 2 * Math.PI - Math.PI / 2;
      pts.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`);
    }
    return (
      <polygon
        points={pts.join(" ")}
        fill={p.body}
        stroke={p.outline}
        strokeWidth="2.5"
        opacity="0.35"
      />
    );
  }
  if (species === "maunzi") {
    // Katzen-Ohren (Dreiecke) + Schnurrhaare
    return (
      <>
        <g style={{ transformOrigin: `${cx - bodyR * 0.4}px ${cy - bodyR * 0.7}px`, animation: "vv-ear-l 2.5s ease-in-out infinite" }}>
          <path d={`M${cx - bodyR * 0.7} ${cy - bodyR * 0.6} L${cx - bodyR * 0.85} ${cy - bodyR * 1.15} L${cx - bodyR * 0.3} ${cy - bodyR * 0.95} z`} fill={p.body} stroke={p.outline} strokeWidth="2" strokeLinejoin="round" />
          <path d={`M${cx - bodyR * 0.75} ${cy - bodyR * 0.85} L${cx - bodyR * 0.78} ${cy - bodyR * 1.0} L${cx - bodyR * 0.55} ${cy - bodyR * 0.95} z`} fill="#fda4af" />
        </g>
        <g style={{ transformOrigin: `${cx + bodyR * 0.4}px ${cy - bodyR * 0.7}px`, animation: "vv-ear-r 2.5s 0.4s ease-in-out infinite" }}>
          <path d={`M${cx + bodyR * 0.7} ${cy - bodyR * 0.6} L${cx + bodyR * 0.85} ${cy - bodyR * 1.15} L${cx + bodyR * 0.3} ${cy - bodyR * 0.95} z`} fill={p.body} stroke={p.outline} strokeWidth="2" strokeLinejoin="round" />
          <path d={`M${cx + bodyR * 0.75} ${cy - bodyR * 0.85} L${cx + bodyR * 0.78} ${cy - bodyR * 1.0} L${cx + bodyR * 0.55} ${cy - bodyR * 0.95} z`} fill="#fda4af" />
        </g>
        {/* Schnurrhaare links */}
        <line x1={cx - bodyR * 0.55} y1={cy + bodyR * 0.18} x2={cx - bodyR * 1.0} y2={cy + bodyR * 0.10} stroke={p.outline} strokeWidth="1" />
        <line x1={cx - bodyR * 0.55} y1={cy + bodyR * 0.28} x2={cx - bodyR * 1.0} y2={cy + bodyR * 0.32} stroke={p.outline} strokeWidth="1" />
        {/* Schnurrhaare rechts */}
        <line x1={cx + bodyR * 0.55} y1={cy + bodyR * 0.18} x2={cx + bodyR * 1.0} y2={cy + bodyR * 0.10} stroke={p.outline} strokeWidth="1" />
        <line x1={cx + bodyR * 0.55} y1={cy + bodyR * 0.28} x2={cx + bodyR * 1.0} y2={cy + bodyR * 0.32} stroke={p.outline} strokeWidth="1" />
      </>
    );
  }
  if (species === "boo") {
    // Geist hat keine Beine — Spiral-Schwanz unten + schwebende Wisps
    return (
      <>
        <path
          d={`M${cx - bodyR * 0.85} ${cy + bodyR * 0.7} Q ${cx - bodyR * 0.4} ${cy + bodyR * 1.2}, ${cx} ${cy + bodyR * 0.95} T ${cx + bodyR * 0.85} ${cy + bodyR * 0.7}`}
          fill="none" stroke={p.outline} strokeWidth="2.5"
        />
        <circle cx={cx - bodyR * 1.1} cy={cy - bodyR * 0.3} r={3} fill={p.accent} opacity="0.7">
          <animate attributeName="opacity" values="0.3;0.9;0.3" dur="2.4s" repeatCount="indefinite" />
        </circle>
        <circle cx={cx + bodyR * 1.1} cy={cy - bodyR * 0.1} r={2.5} fill={p.accent} opacity="0.7">
          <animate attributeName="opacity" values="0.9;0.3;0.9" dur="2.4s" repeatCount="indefinite" />
        </circle>
      </>
    );
  }
  if (species === "robi") {
    // Antenne mit Bulb oben + Schrauben seitlich
    return (
      <>
        <line x1={cx} y1={cy - bodyR + 2} x2={cx} y2={cy - bodyR - 12} stroke={p.outline} strokeWidth="2" />
        <circle cx={cx} cy={cy - bodyR - 14} r={4} fill={p.accent} stroke={p.outline} strokeWidth="1.5">
          <animate attributeName="r" values="3.5;4.5;3.5" dur="1.2s" repeatCount="indefinite" />
        </circle>
        {/* Schrauben */}
        <circle cx={cx - bodyR * 0.85} cy={cy - bodyR * 0.45} r="2" fill={p.outline} />
        <circle cx={cx + bodyR * 0.85} cy={cy - bodyR * 0.45} r="2" fill={p.outline} />
        <circle cx={cx - bodyR * 0.85} cy={cy + bodyR * 0.55} r="2" fill={p.outline} />
        <circle cx={cx + bodyR * 0.85} cy={cy + bodyR * 0.55} r="2" fill={p.outline} />
      </>
    );
  }
  return null;
}

// Augen abhängig von Stimmung
function Eyes({ mood, cx, cy, bodyR, p, sleeping }) {
  if (sleeping) {
    // Geschlossene Augen ~)~)
    const ex = cx - bodyR * 0.32;
    const ex2 = cx + bodyR * 0.32;
    const ey = cy - bodyR * 0.05;
    return (
      <>
        <path d={`M${ex - 4} ${ey} q 4 3 8 0`} stroke={p.outline} strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d={`M${ex2 - 4} ${ey} q 4 3 8 0`} stroke={p.outline} strokeWidth="2" fill="none" strokeLinecap="round" />
      </>
    );
  }
  const ex = cx - bodyR * 0.32;
  const ex2 = cx + bodyR * 0.32;
  const ey = cy - bodyR * 0.1;
  const r = mood === "krank" ? 1.5 : 3;
  return (
    <>
      <circle cx={ex} cy={ey} r="4" fill="#fff" />
      <circle cx={ex2} cy={ey} r="4" fill="#fff" />
      <circle cx={ex} cy={ey + 0.5} r={r} fill="#1c1c1e">
        <animate attributeName="r" values={`${r};${r};0.4;${r};${r}`} keyTimes="0;0.94;0.97;0.99;1" dur="4s" repeatCount="indefinite" />
      </circle>
      <circle cx={ex2} cy={ey + 0.5} r={r} fill="#1c1c1e">
        <animate attributeName="r" values={`${r};${r};0.4;${r};${r}`} keyTimes="0;0.94;0.97;0.99;1" dur="4s" repeatCount="indefinite" />
      </circle>
      {/* Glanzpunkt */}
      <circle cx={ex + 1} cy={ey - 1} r="0.9" fill="#fff" />
      <circle cx={ex2 + 1} cy={ey - 1} r="0.9" fill="#fff" />
    </>
  );
}

function Mouth({ mood, cx, cy, bodyR, p, sleeping }) {
  if (sleeping) {
    return <ellipse cx={cx} cy={cy + bodyR * 0.3} rx="3" ry="2" fill={p.outline} opacity="0.6" />;
  }
  const my = cy + bodyR * 0.32;
  if (mood === "glücklich") {
    return <path d={`M${cx - 6} ${my} q 6 6 12 0`} stroke={p.outline} strokeWidth="2.2" fill="none" strokeLinecap="round" />;
  }
  if (mood === "traurig" || mood === "krank") {
    return <path d={`M${cx - 6} ${my + 2} q 6 -5 12 0`} stroke={p.outline} strokeWidth="2.2" fill="none" strokeLinecap="round" />;
  }
  // okay/missmutig — gerader Strich
  return <line x1={cx - 5} y1={my} x2={cx + 5} y2={my} stroke={p.outline} strokeWidth="2.2" strokeLinecap="round" />;
}

function EggSprite({ p }) {
  return (
    <>
      <ellipse cx="50" cy="58" rx="28" ry="36" fill={p.body} stroke={p.outline} strokeWidth="3" />
      <ellipse cx="42" cy="48" rx="6" ry="10" fill="#fff" opacity="0.5" />
      {/* Wackel-Sprenkel */}
      <circle cx="35" cy="70" r="2" fill={p.accent} />
      <circle cx="60" cy="78" r="2" fill={p.accent} />
      <circle cx="50" cy="55" r="1.5" fill={p.accent} />
    </>
  );
}

function GravestoneSprite({ p }) {
  return (
    <>
      <path d="M30 90 H70 V40 a20 20 0 0 0 -40 0 Z" fill="#9ca3af" stroke="#374151" strokeWidth="2.5" />
      <text x="50" y="68" textAnchor="middle" fontSize="16" fill="#1f2937" fontWeight="700">✝</text>
      {/* Grasstreifen */}
      <line x1="20" y1="90" x2="80" y2="90" stroke="#16a34a" strokeWidth="3" />
    </>
  );
}

export default function ViboSprite({ stage = "kid", species = "sprout", mood = "okay", size = 96, sleeping = false }) {
  // Custom-Asset-Fallback. Reihenfolge:
  // 1. Spezies-spezifisch: /vibo/{species}/{stage}.gif/png/webp
  // 2. Generisch (alle Spezies): /vibo/{stage}.gif/png/webp
  // 3. SVG-Default (eingebaut)
  const [customUrl, setCustomUrl] = useState(null);
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const tries = [
      `/vibo/${species}/${stage}.gif`,
      `/vibo/${species}/${stage}.png`,
      `/vibo/${species}/${stage}.webp`,
      `/vibo/${stage}.gif`,
      `/vibo/${stage}.png`,
      `/vibo/${stage}.webp`,
      `/${stage}.gif`,
      `/${stage}.png`,
      `/${stage}.webp`,
    ];
    async function probe() {
      for (const url of tries) {
        const ok = await new Promise((resolve) => {
          const img = new window.Image();
          img.onload = () => resolve(true);
          img.onerror = () => resolve(false);
          img.src = url;
        });
        if (cancelled) return;
        if (ok) { setCustomUrl(url); setChecked(true); return; }
      }
      if (!cancelled) { setCustomUrl(null); setChecked(true); }
    }
    probe();
    return () => { cancelled = true; };
  }, [species, stage]);
  if (customUrl) return <CustomImage src={customUrl} size={size} sleeping={sleeping} />;
  void checked;

  const p = PALETTES[species] || PALETTES.sprout;
  const scale = SIZE_BY_STAGE[stage] || 0.85;
  const cx = 50;
  const cy = 55;
  const bodyR = 32 * scale;

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      style={{
        display: "block",
        animation: stage === "dead" ? "none" : (stage === "egg" ? "vv-vibo-wiggle 3.5s ease-in-out infinite" : "vv-vibo-bounce 2.5s ease-in-out infinite"),
      }}
    >
      <style>{`
        @keyframes vv-vibo-bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
        @keyframes vv-vibo-wiggle { 0%,100%{transform:rotate(0)} 45%{transform:rotate(-4deg)} 55%{transform:rotate(4deg)} }
        @keyframes vv-leaf-sway { 0%,100%{transform:rotate(-6deg)} 50%{transform:rotate(6deg)} }
        @keyframes vv-ear-l { 0%,100%{transform:rotate(0)} 50%{transform:rotate(-8deg)} }
        @keyframes vv-ear-r { 0%,100%{transform:rotate(0)} 50%{transform:rotate(8deg)} }
        @keyframes vv-wing-l { 0%,100%{transform:rotate(0)} 50%{transform:rotate(-22deg)} }
        @keyframes vv-wing-r { 0%,100%{transform:rotate(0)} 50%{transform:rotate(22deg)} }
        @keyframes vv-antenna { 0%,100%{transform:rotate(-8deg)} 50%{transform:rotate(8deg)} }
        @keyframes vv-breathe { 0%,100%{transform:scaleY(1)} 50%{transform:scaleY(1.04)} }
      `}</style>

      {/* Schatten unter dem Wesen */}
      {stage !== "dead" && (
        <ellipse cx={cx} cy={cy + bodyR + 3} rx={bodyR * 0.7} ry="3" fill="#000" opacity="0.15" />
      )}

      {stage === "dead" ? (
        <GravestoneSprite p={p} />
      ) : stage === "egg" ? (
        <EggSprite p={p} />
      ) : (
        <>
          {/* Spezies-Add-On hinten */}
          {species === "stella" && <SpeciesAddon species={species} p={p} cx={cx} cy={cy} bodyR={bodyR} />}

          {/* Körper — atmet (Robi hat einen eckigen Body, Rest rund) */}
          <g style={{ transformOrigin: `${cx}px ${cy + bodyR * 0.95}px`, animation: sleeping ? "vv-breathe 4.5s ease-in-out infinite" : "vv-breathe 3s ease-in-out infinite" }}>
            {species === "robi" ? (
              <rect x={cx - bodyR} y={cy - bodyR * 0.95} width={bodyR * 2} height={bodyR * 1.9} rx="8" fill={p.body} stroke={p.outline} strokeWidth="2.5" />
            ) : (
              <ellipse cx={cx} cy={cy} rx={bodyR} ry={bodyR * 0.95} fill={p.body} stroke={p.outline} strokeWidth="2.5" />
            )}
          </g>

          {/* Wangen — sichtbar wenn happy */}
          {(mood === "glücklich" || mood === "okay") && (
            <>
              <ellipse cx={cx - bodyR * 0.55} cy={cy + bodyR * 0.18} rx="4" ry="2.5" fill={p.cheek} opacity="0.7" />
              <ellipse cx={cx + bodyR * 0.55} cy={cy + bodyR * 0.18} rx="4" ry="2.5" fill={p.cheek} opacity="0.7" />
            </>
          )}

          {/* Spezies-Add-On vorne (Ohren/Hörner) */}
          {species !== "stella" && <SpeciesAddon species={species} p={p} cx={cx} cy={cy} bodyR={bodyR} />}

          <Eyes mood={mood} cx={cx} cy={cy} bodyR={bodyR} p={p} sleeping={sleeping} />
          <Mouth mood={mood} cx={cx} cy={cy} bodyR={bodyR} p={p} sleeping={sleeping} />

          {/* Krank-Indikator: kleine grüne Wolke */}
          {mood === "krank" && (
            <text x={cx + bodyR * 0.7} y={cy - bodyR * 0.4} fontSize="14">🤢</text>
          )}
        </>
      )}
    </svg>
  );
}

export { PALETTES as VIBO_PALETTES };
