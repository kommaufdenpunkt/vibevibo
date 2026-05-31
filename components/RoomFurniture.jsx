"use client";

// SVG-Render-Definitionen für alle Möbel. Jedes wird in einen 100x100-viewBox
// gezeichnet und vom Room mit (w,h) skaliert. Hübsche Schatten + Schraffuren.

function Shadow({ cx = 50, cy = 92, rx = 38, ry = 4 }) {
  return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#000" opacity="0.22" />;
}

function Bed() {
  return (
    <g>
      <Shadow rx={42} ry={5} />
      {/* Matratze */}
      <rect x="6" y="44" width="88" height="38" rx="6" fill="#fbbf24" stroke="#92400e" strokeWidth="2" />
      <rect x="6" y="44" width="88" height="10" rx="6" fill="#fde68a" />
      {/* Kissen */}
      <rect x="12" y="30" width="22" height="20" rx="4" fill="#fef3c7" stroke="#92400e" strokeWidth="1.8" />
      <rect x="36" y="30" width="22" height="20" rx="4" fill="#fef3c7" stroke="#92400e" strokeWidth="1.8" />
      {/* Decke */}
      <rect x="58" y="50" width="38" height="28" rx="4" fill="#f87171" stroke="#7f1d1d" strokeWidth="1.8" />
      <path d="M58 56 L96 56" stroke="#fda4af" strokeWidth="1.5" />
      <path d="M58 64 L96 64" stroke="#fda4af" strokeWidth="1.5" />
      {/* Beine */}
      <rect x="8" y="80" width="6" height="8" fill="#78350f" />
      <rect x="86" y="80" width="6" height="8" fill="#78350f" />
    </g>
  );
}

function Couch() {
  return (
    <g>
      <Shadow rx={44} ry={5} />
      {/* Rückenlehne */}
      <rect x="6" y="26" width="88" height="32" rx="10" fill="#a78bfa" stroke="#4c1d95" strokeWidth="2" />
      {/* Sitzfläche */}
      <rect x="4" y="50" width="92" height="32" rx="8" fill="#8b5cf6" stroke="#4c1d95" strokeWidth="2" />
      {/* Kissen */}
      <rect x="10" y="54" width="24" height="22" rx="4" fill="#c4b5fd" stroke="#4c1d95" strokeWidth="1.6" />
      <rect x="38" y="54" width="24" height="22" rx="4" fill="#c4b5fd" stroke="#4c1d95" strokeWidth="1.6" />
      <rect x="66" y="54" width="24" height="22" rx="4" fill="#c4b5fd" stroke="#4c1d95" strokeWidth="1.6" />
      {/* Beine */}
      <rect x="8" y="80" width="6" height="8" fill="#4c1d95" />
      <rect x="86" y="80" width="6" height="8" fill="#4c1d95" />
    </g>
  );
}

function Table() {
  return (
    <g>
      <Shadow rx={38} ry={4} />
      {/* Tischplatte */}
      <rect x="10" y="44" width="80" height="14" rx="3" fill="#b45309" stroke="#451a03" strokeWidth="2" />
      <path d="M14 47 L86 47" stroke="#fcd34d" strokeWidth="1" opacity="0.6" />
      <path d="M14 53 L86 53" stroke="#fcd34d" strokeWidth="1" opacity="0.6" />
      {/* Beine */}
      <rect x="16" y="58" width="6" height="30" fill="#78350f" />
      <rect x="78" y="58" width="6" height="30" fill="#78350f" />
      {/* Vase oben drauf */}
      <ellipse cx="50" cy="44" rx="6" ry="2.5" fill="#1e293b" />
      <path d="M44 44 Q50 26 56 44 Z" fill="#3b82f6" stroke="#1e293b" strokeWidth="1.4" />
      <circle cx="48" cy="28" r="3" fill="#ec4899" />
      <circle cx="52" cy="26" r="3" fill="#fbbf24" />
    </g>
  );
}

function Lamp() {
  return (
    <g>
      <Shadow rx={20} ry={3} cy={94} />
      {/* Sockel */}
      <ellipse cx="50" cy="88" rx="14" ry="4" fill="#1f2937" />
      <rect x="46" y="80" width="8" height="10" fill="#374151" />
      {/* Stange */}
      <rect x="48" y="20" width="4" height="62" fill="#4b5563" />
      {/* Schirm */}
      <path d="M30 22 L70 22 L62 4 L38 4 Z" fill="#fbbf24" stroke="#92400e" strokeWidth="2" strokeLinejoin="round" />
      <path d="M30 22 L70 22" stroke="#92400e" strokeWidth="1.5" />
      {/* Lichtkegel */}
      <path d="M30 22 L18 60 L82 60 L70 22 Z" fill="url(#lampLight)" opacity="0.4" />
      <defs>
        <linearGradient id="lampLight" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fef3c7" stopOpacity="0.8" />
          <stop offset="1" stopColor="#fef3c7" stopOpacity="0" />
        </linearGradient>
      </defs>
    </g>
  );
}

function Plant() {
  return (
    <g>
      <Shadow rx={22} ry={3} />
      {/* Topf */}
      <path d="M30 70 L36 92 L64 92 L70 70 Z" fill="#b45309" stroke="#451a03" strokeWidth="2" />
      <ellipse cx="50" cy="70" rx="20" ry="4" fill="#78350f" stroke="#451a03" strokeWidth="2" />
      {/* Blätter */}
      <ellipse cx="34" cy="48" rx="14" ry="22" fill="#16a34a" stroke="#14532d" strokeWidth="1.8" transform="rotate(-30 34 48)" />
      <ellipse cx="66" cy="46" rx="14" ry="22" fill="#22c55e" stroke="#14532d" strokeWidth="1.8" transform="rotate(28 66 46)" />
      <ellipse cx="50" cy="32" rx="14" ry="24" fill="#15803d" stroke="#14532d" strokeWidth="1.8" />
      <ellipse cx="50" cy="40" rx="8" ry="14" fill="#22c55e" stroke="#14532d" strokeWidth="1.4" />
    </g>
  );
}

function TV() {
  return (
    <g>
      <Shadow rx={36} ry={4} />
      {/* Standfuß */}
      <rect x="40" y="80" width="20" height="6" fill="#1f2937" />
      <rect x="35" y="84" width="30" height="4" rx="2" fill="#0f172a" />
      {/* Bildschirm-Gehäuse */}
      <rect x="4" y="18" width="92" height="60" rx="6" fill="#0f172a" stroke="#1e293b" strokeWidth="2" />
      {/* Bildschirm-Inhalt: animiertes Bild */}
      <rect x="10" y="24" width="80" height="48" rx="3" fill="#1e3a8a" />
      <path d="M10 60 Q30 50 50 56 T90 50 L90 72 L10 72 Z" fill="#3b82f6">
        <animate attributeName="d" values="M10 60 Q30 50 50 56 T90 50 L90 72 L10 72 Z;M10 56 Q30 64 50 56 T90 60 L90 72 L10 72 Z;M10 60 Q30 50 50 56 T90 50 L90 72 L10 72 Z" dur="4s" repeatCount="indefinite" />
        </path>
      <circle cx="68" cy="34" r="6" fill="#fde047">
        <animate attributeName="cy" values="34;30;34" dur="3s" repeatCount="indefinite" />
      </circle>
      {/* Power-LED */}
      <circle cx="50" cy="76" r="1.5" fill="#22c55e">
        <animate attributeName="opacity" values="1;0.3;1" dur="1.4s" repeatCount="indefinite" />
      </circle>
    </g>
  );
}

function Console() {
  return (
    <g>
      <Shadow rx={26} ry={4} />
      {/* Konsole-Body */}
      <rect x="14" y="50" width="72" height="28" rx="6" fill="#1f2937" stroke="#000" strokeWidth="2" />
      <rect x="20" y="54" width="40" height="6" rx="2" fill="#3b82f6" />
      <circle cx="74" cy="64" r="5" fill="#0f172a" />
      <circle cx="74" cy="64" r="2.5" fill="#22c55e">
        <animate attributeName="opacity" values="1;0.4;1" dur="1.6s" repeatCount="indefinite" />
      </circle>
      {/* Controller */}
      <ellipse cx="40" cy="84" rx="14" ry="5" fill="#374151" stroke="#000" strokeWidth="1.5" />
      <circle cx="36" cy="82" r="2" fill="#dc2626" />
      <circle cx="44" cy="82" r="2" fill="#16a34a" />
    </g>
  );
}

function Frame() {
  return (
    <g>
      <Shadow rx={22} ry={3} />
      {/* Rahmen */}
      <rect x="14" y="14" width="72" height="60" rx="3" fill="#b45309" stroke="#451a03" strokeWidth="3" />
      <rect x="20" y="20" width="60" height="48" rx="1" fill="#fef3c7" />
      {/* Bild: kleine Landschaft */}
      <rect x="20" y="20" width="60" height="32" fill="#7dd3fc" />
      <circle cx="68" cy="28" r="4" fill="#fbbf24" />
      <path d="M20 48 L34 32 L46 42 L58 28 L80 48 Z" fill="#16a34a" />
      <rect x="20" y="48" width="60" height="20" fill="#86efac" />
    </g>
  );
}

function Bookshelf() {
  return (
    <g>
      <Shadow rx={28} ry={4} />
      <rect x="14" y="6" width="72" height="82" rx="2" fill="#78350f" stroke="#1c1917" strokeWidth="2" />
      {/* 4 Regalböden */}
      {[20, 38, 56, 74].map((y, i) => (
        <g key={i}>
          <rect x="14" y={y} width="72" height="3" fill="#451a03" />
          {/* Bücher */}
          {[18, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78].map((x, j) => (
            <rect key={j} x={x} y={y - 14} width="4.5" height="14"
              fill={["#dc2626","#3b82f6","#16a34a","#f59e0b","#8b5cf6","#ec4899"][(i + j) % 6]}
              stroke="#1c1917" strokeWidth="0.5" />
          ))}
        </g>
      ))}
    </g>
  );
}

function Rug() {
  return (
    <g>
      <ellipse cx="50" cy="50" rx="48" ry="22" fill="#ec4899" stroke="#831843" strokeWidth="2" />
      <ellipse cx="50" cy="50" rx="38" ry="14" fill="none" stroke="#fbcfe8" strokeWidth="1.5" />
      <ellipse cx="50" cy="50" rx="26" ry="8" fill="none" stroke="#fbcfe8" strokeWidth="1.5" />
      {/* Fransen */}
      {[0,1,2,3,4,5,6,7,8,9].map((i) => (
        <line key={"f1" + i} x1={2 + i * 11} y1="70" x2={2 + i * 11} y2="76" stroke="#831843" strokeWidth="1.4" />
      ))}
    </g>
  );
}

function Disco() {
  return (
    <g>
      {/* Aufhängung */}
      <line x1="50" y1="0" x2="50" y2="20" stroke="#374151" strokeWidth="2" />
      <circle cx="50" cy="50" r="28" fill="url(#discoGrad)" stroke="#374151" strokeWidth="2">
        <animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur="6s" repeatCount="indefinite" />
      </circle>
      <defs>
        <radialGradient id="discoGrad">
          <stop offset="0" stopColor="#fff" />
          <stop offset="0.5" stopColor="#c7d2fe" />
          <stop offset="1" stopColor="#4338ca" />
        </radialGradient>
      </defs>
      {/* Facetten */}
      {[20, 40, 60, 80].map((y, i) => (
        <line key={i} x1="22" y1={y} x2="78" y2={y} stroke="#fff" strokeWidth="0.6" opacity="0.7" />
      ))}
      {[30, 50, 70].map((x, i) => (
        <line key={"v" + i} x1={x} y1="22" x2={x} y2="78" stroke="#fff" strokeWidth="0.6" opacity="0.7" />
      ))}
      {/* Funkeln */}
      <circle cx="36" cy="38" r="2" fill="#fff">
        <animate attributeName="opacity" values="0;1;0" dur="1.2s" repeatCount="indefinite" />
      </circle>
      <circle cx="62" cy="58" r="2" fill="#fff">
        <animate attributeName="opacity" values="1;0;1" dur="1.4s" repeatCount="indefinite" />
      </circle>
    </g>
  );
}

function Aquarium() {
  return (
    <g>
      <Shadow rx={36} ry={4} />
      {/* Sockel */}
      <rect x="12" y="78" width="76" height="8" fill="#4b5563" />
      {/* Glasbecken */}
      <rect x="8" y="22" width="84" height="58" rx="3" fill="#7dd3fc" stroke="#1e3a8a" strokeWidth="2.5" opacity="0.85" />
      {/* Wasseroberfläche */}
      <path d="M10 28 Q26 24 50 28 T90 28" stroke="#fff" strokeWidth="1.5" fill="none" opacity="0.7">
        <animate attributeName="d" values="M10 28 Q26 24 50 28 T90 28;M10 28 Q26 32 50 28 T90 28;M10 28 Q26 24 50 28 T90 28" dur="3s" repeatCount="indefinite" />
      </path>
      {/* Boden + Korallen */}
      <path d="M8 76 Q30 72 50 76 T92 76 L92 80 L8 80 Z" fill="#facc15" />
      <path d="M24 76 Q26 60 32 76 Z" fill="#f97316" />
      <path d="M68 76 Q66 64 60 76 Z" fill="#ec4899" />
      {/* Fisch (animiert) */}
      <g>
        <animateTransform attributeName="transform" type="translate" values="0,0;60,8;0,0" dur="6s" repeatCount="indefinite" />
        <ellipse cx="22" cy="48" rx="7" ry="4" fill="#f97316" stroke="#7c2d12" strokeWidth="1" />
        <path d="M15 48 L8 44 L8 52 Z" fill="#f97316" stroke="#7c2d12" strokeWidth="1" />
        <circle cx="26" cy="47" r="0.9" fill="#1c1917" />
      </g>
      {/* Bubbles */}
      <circle cx="20" cy="70" r="1.4" fill="#fff" opacity="0.7">
        <animate attributeName="cy" values="70;28;70" dur="3.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="76" cy="65" r="1" fill="#fff" opacity="0.7">
        <animate attributeName="cy" values="65;26;65" dur="4s" repeatCount="indefinite" />
      </circle>
    </g>
  );
}

const RENDER = {
  furn_bed:       Bed,
  furn_couch:     Couch,
  furn_table:     Table,
  furn_lamp:      Lamp,
  furn_plant:     Plant,
  furn_tv:        TV,
  furn_console:   Console,
  furn_frame:     Frame,
  furn_bookshelf: Bookshelf,
  furn_rug:       Rug,
  furn_disco:     Disco,
  furn_aquarium:  Aquarium,
};

export default function FurnitureSprite({ kind, w = 90, h = 60 }) {
  const Cmp = RENDER[kind];
  if (!Cmp) return null;
  return (
    <svg viewBox="0 0 100 100" width={w} height={h} style={{ display: "block", overflow: "visible" }}>
      <Cmp />
    </svg>
  );
}
