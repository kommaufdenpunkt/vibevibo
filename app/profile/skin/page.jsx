"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMe } from "@/lib/useMe";
import { api } from "@/lib/api";
import { scopeCss } from "@/lib/sanitizeCss";

const PRESETS = {
  Pink_Glamour: `
body { background: radial-gradient(circle at 30% 20%, #ff66c4 0%, #b300ff 60%, #1a0030 100%) !important; }
.vv-card, .vv-nost-card-body { background: linear-gradient(180deg, #ffdcef, #ffb3dc) !important; }
.vv-card h2, .vv-card h3, .vv-nost-card-title { background: linear-gradient(90deg, #ff3e9d, #b300ff, #ff3e9d) !important; color: #fff !important; }
.vv-pinnwand-entry { background: #fff0fa !important; border-color: #ff3e9d !important; }
.vv-nost-wordart { background: linear-gradient(180deg, #fff, #ff66c4, #ff3e9d, #b300ff) !important; -webkit-background-clip: text !important; }
`,
  Black_Emo: `
body { background: #0a0014 !important; }
.vv-card, .vv-nost-card-body { background: #1a0030 !important; color: #e5b0ff !important; border-color: #ff3e9d !important; }
.vv-card h2, .vv-card h3, .vv-nost-card-title { background: #000 !important; color: #ff3e9d !important; text-shadow: 0 0 6px #ff3e9d !important; }
.vv-pinnwand-entry { background: #2a004a !important; color: #fff !important; border-color: #ff3e9d !important; }
.vv-muted, .vv-nost-steckbrief-label { color: #d8b4fe !important; }
.vv-nost-hero { background: linear-gradient(135deg, #0a0014, #2a004a, #4a0e6e) !important; }
.vv-nost-wordart { background: linear-gradient(180deg, #ff3e9d, #b300ff, #000) !important; -webkit-background-clip: text !important; }
`,
  Neon_Rave: `
body { background: linear-gradient(135deg, #000, #001020, #200020) !important; }
.vv-card, .vv-nost-card-body { background: #000 !important; color: #0ff !important; border-color: #0ff !important; box-shadow: 0 0 16px rgba(0,255,255,0.4) !important; }
.vv-card h2, .vv-card h3, .vv-nost-card-title { background: linear-gradient(90deg, #0ff, #f0f, #0ff) !important; color: #000 !important; }
.vv-pinnwand-entry { background: #001020 !important; color: #0ff !important; border-color: #0ff !important; }
.vv-mood, .vv-nost-mood { background: linear-gradient(90deg, #f0f, #0ff) !important; color: #000 !important; border-color: #0ff !important; }
.vv-nost-wordart { background: linear-gradient(180deg, #0ff, #f0f) !important; -webkit-background-clip: text !important; text-shadow: 0 0 20px #0ff !important; }
`,
  Sweet_Dream: `
body { background: linear-gradient(135deg, #c4f4ff, #d4a5ff, #ffd9f4) !important; }
.vv-card, .vv-nost-card-body { background: #fffaf0 !important; border-color: #d4a5ff !important; }
.vv-card h2, .vv-card h3, .vv-nost-card-title { background: linear-gradient(90deg, #c4f4ff, #d4a5ff, #ffb3dc) !important; color: #5500aa !important; }
.vv-pinnwand-entry { background: #f5e5ff !important; border-color: #d4a5ff !important; }
`,
  Regenbogen_Party: `
body { background: linear-gradient(45deg, #ff0080, #ff8c00, #ffd700, #00ff7f, #00bfff, #8a2be2, #ff0080) !important; background-size: 400% 400% !important; animation: rainbow-bg 8s linear infinite !important; }
@keyframes rainbow-bg { 0%{background-position:0% 50%} 100%{background-position:400% 50%} }
.vv-card, .vv-nost-card-body { background: rgba(255,255,255,0.92) !important; border: 4px solid #ff0080 !important; }
.vv-card h2, .vv-card h3, .vv-nost-card-title { background: linear-gradient(90deg, #ff0080, #ffd700, #00ff7f, #00bfff, #8a2be2) !important; color: #fff !important; text-shadow: 1px 1px 0 #000 !important; }
.vv-pinnwand-entry { background: #fffacd !important; border-color: #ff0080 !important; }
`,
  Bubblegum_Pop: `
body { background: linear-gradient(180deg, #ff77c6, #ff99dd, #ffcce6) !important; }
.vv-card, .vv-nost-card-body { background: linear-gradient(180deg, #fff, #ffe0f0) !important; border: 4px dashed #ff1493 !important; border-radius: 22px !important; }
.vv-card h2, .vv-card h3, .vv-nost-card-title { background: #ff1493 !important; color: #fff !important; font-family: "Comic Sans MS", cursive !important; }
.vv-pinnwand-entry { background: #fff0f5 !important; border: 2px dotted #ff1493 !important; border-radius: 18px !important; }
.vv-nost-wordart { color: #ff1493 !important; -webkit-text-fill-color: #ff1493 !important; }
`,
  Cyber_Y2K: `
body { background: linear-gradient(135deg, #001f3f, #7fdbff, #b10dc9) !important; }
.vv-card, .vv-nost-card-body { background: linear-gradient(135deg, rgba(0,31,63,0.95), rgba(127,219,255,0.2)) !important; color: #7fdbff !important; border: 2px solid #b10dc9 !important; box-shadow: 0 0 18px #b10dc9 !important; }
.vv-card h2, .vv-card h3, .vv-nost-card-title { background: linear-gradient(90deg, #b10dc9, #7fdbff) !important; color: #fff !important; font-family: "Courier New", monospace !important; letter-spacing: 3px !important; }
.vv-pinnwand-entry { background: rgba(0,31,63,0.7) !important; border-color: #7fdbff !important; color: #fff !important; }
.vv-muted, .vv-nost-steckbrief-label { color: #7fdbff !important; }
`,
  Sommer_Sonne: `
body { background: linear-gradient(180deg, #fff5cc, #ffcc66, #ff9933) !important; }
.vv-card, .vv-nost-card-body { background: linear-gradient(180deg, #fffbe6, #ffe699) !important; border: 3px solid #ff6600 !important; }
.vv-card h2, .vv-card h3, .vv-nost-card-title { background: linear-gradient(90deg, #ff6600, #ffcc00, #ff6600) !important; color: #fff !important; text-shadow: 1px 1px 0 #cc3300 !important; }
.vv-pinnwand-entry { background: #fff8e1 !important; border-color: #ff9933 !important; }
.vv-nost-wordart { background: linear-gradient(180deg, #fff, #ffcc00, #ff6600, #cc3300) !important; -webkit-background-clip: text !important; }
`,
  Ozean_Blau: `
body { background: linear-gradient(180deg, #001a33, #003366, #0066cc, #66ccff) !important; }
.vv-card, .vv-nost-card-body { background: linear-gradient(180deg, #e6f7ff, #b3e0ff) !important; border: 3px solid #0066cc !important; color: #001a33 !important; }
.vv-card h2, .vv-card h3, .vv-nost-card-title { background: linear-gradient(90deg, #0066cc, #00ccff, #0066cc) !important; color: #fff !important; }
.vv-pinnwand-entry { background: #e0f4ff !important; border-color: #00ccff !important; }
`,
  Wald_Gruen: `
body { background: linear-gradient(180deg, #1a3300, #336600, #66cc33) !important; }
.vv-card, .vv-nost-card-body { background: linear-gradient(180deg, #f0fff0, #ccffcc) !important; border: 3px solid #336600 !important; color: #1a3300 !important; }
.vv-card h2, .vv-card h3, .vv-nost-card-title { background: linear-gradient(90deg, #336600, #66cc33, #336600) !important; color: #fff !important; }
.vv-pinnwand-entry { background: #f5fff0 !important; border-color: #66cc33 !important; }
`,
  Vampire_Goth: `
body { background: radial-gradient(circle, #330000, #000) !important; }
.vv-card, .vv-nost-card-body { background: #1a0000 !important; color: #ff6666 !important; border: 3px solid #cc0000 !important; }
.vv-card h2, .vv-card h3, .vv-nost-card-title { background: #000 !important; color: #cc0000 !important; text-shadow: 0 0 10px #cc0000, 2px 2px 0 #330000 !important; font-family: "Georgia", serif !important; }
.vv-pinnwand-entry { background: #2a0000 !important; color: #ff9999 !important; border-color: #cc0000 !important; }
.vv-muted, .vv-nost-steckbrief-label { color: #ff6666 !important; }
.vv-nost-wordart { color: #cc0000 !important; -webkit-text-fill-color: #cc0000 !important; text-shadow: 0 0 12px #cc0000 !important; }
`,
  Candy_Crush: `
body { background: linear-gradient(135deg, #ff6b9d, #c44dff, #ffd93d, #6bcfff) !important; background-size: 200% 200% !important; animation: rainbow-bg 12s ease infinite !important; }
.vv-card, .vv-nost-card-body { background: linear-gradient(180deg, #fff, #ffe6f2) !important; border: 4px solid #ff6b9d !important; border-radius: 20px !important; box-shadow: 0 8px 24px rgba(255,107,157,0.4) !important; }
.vv-card h2, .vv-card h3, .vv-nost-card-title { background: linear-gradient(90deg, #ff6b9d, #c44dff, #6bcfff) !important; color: #fff !important; }
.vv-pinnwand-entry { background: #fff0f8 !important; border: 2px dotted #c44dff !important; }
`,
  Disco_Glitter: `
body { background: linear-gradient(45deg, #ffd700, #ff69b4, #9370db, #00ced1, #ffd700) !important; background-size: 300% 300% !important; animation: rainbow-bg 6s linear infinite !important; }
.vv-card, .vv-nost-card-body { background: linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,255,255,0.95)) !important; border: 3px solid #ffd700 !important; box-shadow: 0 0 20px rgba(255,215,0,0.6) !important; }
.vv-card h2, .vv-card h3, .vv-nost-card-title { background: linear-gradient(90deg, #ffd700, #ff69b4, #9370db, #ffd700) !important; color: #fff !important; text-shadow: 1px 1px 0 #000 !important; }
.vv-pinnwand-entry { background: #fffbe6 !important; border-color: #ffd700 !important; }
.vv-nost-wordart { background: linear-gradient(180deg, #fff, #ffd700, #ff69b4) !important; -webkit-background-clip: text !important; }
`,
  Retro_VHS: `
body { background: linear-gradient(180deg, #2d0a4e, #6b1f8a, #ff006e) !important; }
.vv-card, .vv-nost-card-body { background: #1a0033 !important; color: #ff71ce !important; border: 2px solid #ff006e !important; box-shadow: 4px 4px 0 #01cdfe, 8px 8px 0 #b967ff !important; }
.vv-card h2, .vv-card h3, .vv-nost-card-title { background: linear-gradient(90deg, #ff71ce, #01cdfe, #b967ff) !important; color: #fff !important; font-family: "Courier New", monospace !important; letter-spacing: 2px !important; }
.vv-pinnwand-entry { background: #2d0a4e !important; color: #fff !important; border-color: #01cdfe !important; }
.vv-muted, .vv-nost-steckbrief-label { color: #01cdfe !important; }
`,
  Pastell_Eis: `
body { background: linear-gradient(135deg, #ffd1dc, #e0bbff, #c4faff, #d4ffea) !important; }
.vv-card, .vv-nost-card-body { background: rgba(255,255,255,0.85) !important; border: 2px solid #e0bbff !important; backdrop-filter: blur(8px) !important; }
.vv-card h2, .vv-card h3, .vv-nost-card-title { background: linear-gradient(90deg, #ffd1dc, #e0bbff, #c4faff, #d4ffea) !important; color: #6b4d8a !important; }
.vv-pinnwand-entry { background: #fafafa !important; border-color: #e0bbff !important; }
`,

  // ===== Nostalgische Marken-Style Presets =====
  MySpace_OG: `
body { background: #0c0c54 !important; }
.vv-card, .vv-nost-card-body { background: #fff !important; color: #000 !important; border: 1px solid #6f6fb3 !important; }
.vv-card h2, .vv-card h3, .vv-nost-card-title { background: #6f6fb3 !important; color: #fff !important; font-family: "Arial", sans-serif !important; }
.vv-pinnwand-entry { background: #f4f4ff !important; border-color: #6f6fb3 !important; color: #000 !important; }
.vv-nost-hero { background: linear-gradient(135deg, #6f6fb3, #0c0c54) !important; border-color: #fff !important; }
.vv-nost-wordart { color: #fff !important; -webkit-text-fill-color: #fff !important; }
`,
  SchuelerVZ_Blau: `
body { background: linear-gradient(180deg, #e0eaf6, #c4d6ea) !important; }
.vv-card, .vv-nost-card-body { background: #fff !important; color: #1c4f8c !important; border: 1px solid #5d8ec0 !important; }
.vv-card h2, .vv-card h3, .vv-nost-card-title { background: linear-gradient(180deg, #6ba0d6, #1c4f8c) !important; color: #fff !important; }
.vv-pinnwand-entry { background: #f5f9ff !important; border-color: #5d8ec0 !important; }
.vv-nost-hero { background: linear-gradient(135deg, #e0eaf6, #6ba0d6) !important; border-color: #1c4f8c !important; }
`,
  Jappy_Orange: `
body { background: linear-gradient(135deg, #ff9e2c, #ffd966) !important; }
.vv-card, .vv-nost-card-body { background: #fffaf0 !important; color: #7a3700 !important; border: 2px solid #ff7a00 !important; }
.vv-card h2, .vv-card h3, .vv-nost-card-title { background: linear-gradient(90deg, #ff7a00, #ffae00) !important; color: #fff !important; }
.vv-pinnwand-entry { background: #fff5e0 !important; border-color: #ff9e2c !important; }
.vv-nost-hero { background: linear-gradient(135deg, #ff7a00, #ffae00, #ffd966) !important; border-color: #fff !important; }
`,
  Knuddels_Holz: `
body { background: linear-gradient(180deg, #4a2b14, #7a4524) !important; }
.vv-card, .vv-nost-card-body { background: linear-gradient(180deg, #fff8e8, #fde6b5) !important; color: #4a2b14 !important; border: 3px solid #8b5a2b !important; }
.vv-card h2, .vv-card h3, .vv-nost-card-title { background: linear-gradient(90deg, #8b5a2b, #b87333) !important; color: #fff8e8 !important; font-family: "Georgia", serif !important; }
.vv-pinnwand-entry { background: #fff8e8 !important; border-color: #8b5a2b !important; }
.vv-nost-hero { background: radial-gradient(circle, #fde6b5, #b87333) !important; border-color: #4a2b14 !important; }
`,

  // ===== Pop-Kultur Presets =====
  Tokio_Hotel_Emo: `
body { background: linear-gradient(135deg, #000, #2b0a14, #000) !important; }
.vv-card, .vv-nost-card-body { background: #1a0008 !important; color: #ff6b9d !important; border: 2px solid #c2185b !important; }
.vv-card h2, .vv-card h3, .vv-nost-card-title { background: #000 !important; color: #ff1744 !important; text-shadow: 0 0 8px #ff1744 !important; font-family: "Impact", sans-serif !important; }
.vv-pinnwand-entry { background: #0a0004 !important; color: #ffb1c9 !important; border-color: #ff1744 !important; }
.vv-nost-hero { background: radial-gradient(circle at 30% 30%, #500015, #000) !important; border-color: #ff1744 !important; }
.vv-nost-wordart { color: #ff1744 !important; -webkit-text-fill-color: #ff1744 !important; text-shadow: 0 0 12px #ff1744, 2px 2px 0 #000 !important; }
`,
  Hannah_Montana: `
body { background: linear-gradient(45deg, #ff66cc, #c81a7d, #ffd700, #ff66cc) !important; background-size: 300% 300% !important; animation: rainbow-bg 12s linear infinite !important; }
@keyframes rainbow-bg { 0%{background-position:0% 50%} 100%{background-position:300% 50%} }
.vv-card, .vv-nost-card-body { background: linear-gradient(180deg, #fff, #ffe0f3) !important; border: 4px solid #c81a7d !important; }
.vv-card h2, .vv-card h3, .vv-nost-card-title { background: linear-gradient(90deg, #c81a7d, #ffd700, #c81a7d) !important; color: #fff !important; text-shadow: 1px 1px 0 #500030 !important; }
.vv-pinnwand-entry { background: #fff5fb !important; border-color: #ff66cc !important; }
`,
  Skater_Boy: `
body { background: linear-gradient(180deg, #2c2c2c, #555) !important; }
.vv-card, .vv-nost-card-body { background: #fff !important; color: #1c1c1c !important; border: 3px solid #ff6f00 !important; box-shadow: 5px 5px 0 #1c1c1c !important; }
.vv-card h2, .vv-card h3, .vv-nost-card-title { background: linear-gradient(45deg, #ff6f00 25%, #fff 25%, #fff 50%, #ff6f00 50%, #ff6f00 75%, #fff 75%) !important; background-size: 28px 28px !important; color: #1c1c1c !important; font-family: "Impact", sans-serif !important; text-shadow: 1px 1px 0 #fff !important; }
.vv-pinnwand-entry { background: #f5f5f5 !important; border-color: #ff6f00 !important; }
.vv-nost-hero { background: repeating-linear-gradient(45deg, #1c1c1c, #1c1c1c 12px, #2c2c2c 12px, #2c2c2c 24px) !important; border-color: #ff6f00 !important; }
`,

  // ===== Aesthetic-Style Presets =====
  Vaporwave: `
body { background: linear-gradient(180deg, #ff71ce, #b967ff, #01cdfe, #05ffa1) !important; }
.vv-card, .vv-nost-card-body { background: linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,113,206,0.15)) !important; color: #2d0a4e !important; border: 3px solid #b967ff !important; box-shadow: 5px 5px 0 #01cdfe, 10px 10px 0 #05ffa1 !important; }
.vv-card h2, .vv-card h3, .vv-nost-card-title { background: linear-gradient(90deg, #ff71ce, #01cdfe, #b967ff) !important; color: #fff !important; font-family: "Courier New", monospace !important; letter-spacing: 4px !important; }
.vv-pinnwand-entry { background: rgba(255,255,255,0.7) !important; border-color: #01cdfe !important; }
.vv-nost-hero { background: linear-gradient(135deg, #ff71ce, #01cdfe) !important; border-color: #b967ff !important; }
`,
  Cottagecore: `
body { background: linear-gradient(180deg, #f5e6c4, #c9d8a0, #8aa67a) !important; }
.vv-card, .vv-nost-card-body { background: #fff8e8 !important; color: #4d3a1f !important; border: 2px solid #8aa67a !important; }
.vv-card h2, .vv-card h3, .vv-nost-card-title { background: linear-gradient(90deg, #8aa67a, #b5c896) !important; color: #fff8e8 !important; font-family: "Georgia", serif !important; }
.vv-pinnwand-entry { background: #fff5e1 !important; border-color: #8aa67a !important; }
.vv-nost-hero { background: linear-gradient(135deg, #fff8e8, #c9d8a0) !important; border-color: #8aa67a !important; }
`,
  Dark_Academia: `
body { background: linear-gradient(180deg, #2b1810, #4a2c1d) !important; }
.vv-card, .vv-nost-card-body { background: #f4e8d0 !important; color: #2b1810 !important; border: 2px solid #8b5a3c !important; font-family: "Georgia", serif !important; }
.vv-card h2, .vv-card h3, .vv-nost-card-title { background: #2b1810 !important; color: #d4af37 !important; font-family: "Georgia", serif !important; letter-spacing: 3px !important; }
.vv-pinnwand-entry { background: #f8f0e0 !important; border-color: #8b5a3c !important; }
.vv-nost-hero { background: linear-gradient(135deg, #4a2c1d, #2b1810) !important; border-color: #d4af37 !important; }
.vv-nost-wordart { color: #d4af37 !important; -webkit-text-fill-color: #d4af37 !important; font-family: "Georgia", serif !important; }
`,
  Goth_Princess: `
body { background: radial-gradient(circle at 30% 20%, #4a004a, #1a0033, #000) !important; }
.vv-card, .vv-nost-card-body { background: #1a0033 !important; color: #e9c5ff !important; border: 3px solid #800080 !important; }
.vv-card h2, .vv-card h3, .vv-nost-card-title { background: linear-gradient(90deg, #4a004a, #800080, #4a004a) !important; color: #e9c5ff !important; text-shadow: 0 0 6px #ff66ff !important; font-family: "Georgia", serif !important; }
.vv-pinnwand-entry { background: #2a004a !important; color: #ffd1ff !important; border-color: #800080 !important; }
.vv-nost-hero { background: radial-gradient(circle, #4a004a, #000) !important; border-color: #800080 !important; }
.vv-nost-wordart { color: #ff66ff !important; -webkit-text-fill-color: #ff66ff !important; text-shadow: 0 0 12px #ff66ff !important; }
`,
  Kawaii_Sakura: `
body { background: linear-gradient(180deg, #ffe1ec, #ffd0e3, #ffb8d5) !important; }
.vv-card, .vv-nost-card-body { background: #fff !important; color: #c2185b !important; border: 3px dotted #ff8fbf !important; border-radius: 22px !important; }
.vv-card h2, .vv-card h3, .vv-nost-card-title { background: linear-gradient(90deg, #ff8fbf, #ffb8d5, #ff8fbf) !important; color: #fff !important; font-family: "Comic Sans MS", cursive !important; }
.vv-pinnwand-entry { background: #fff5fa !important; border: 2px dotted #ff8fbf !important; border-radius: 18px !important; }
.vv-nost-hero { background: radial-gradient(circle at 30% 30%, #ffd0e3, #ff8fbf) !important; border: 4px dotted #c2185b !important; }
.vv-nost-chip { background: linear-gradient(135deg, #ffe1ec, #ffb8d5) !important; }
`,
  Y2K_Chrome: `
body { background: linear-gradient(135deg, #c0c0c0, #e0e0e0, #c0c0c0) !important; }
.vv-card, .vv-nost-card-body { background: linear-gradient(180deg, #fff, #e0e0e0) !important; color: #2c2c2c !important; border: 2px solid #808080 !important; box-shadow: inset 0 0 0 2px #fff, 0 4px 8px rgba(0,0,0,0.3) !important; }
.vv-card h2, .vv-card h3, .vv-nost-card-title { background: linear-gradient(180deg, #fff, #c0c0c0, #808080) !important; color: #2c2c2c !important; text-shadow: 0 1px 0 #fff !important; font-family: "Impact", sans-serif !important; }
.vv-pinnwand-entry { background: #f0f0f0 !important; border-color: #808080 !important; }
.vv-nost-hero { background: linear-gradient(135deg, #d8b4fe, #c0c0c0, #67e8f9) !important; border-color: #808080 !important; }
`,
  Bubble_Tea: `
body { background: linear-gradient(180deg, #d4a574, #b8865b, #8b5a2b) !important; }
.vv-card, .vv-nost-card-body { background: linear-gradient(180deg, #fff, #f5e6d3) !important; color: #5d3317 !important; border: 3px solid #8b5a2b !important; }
.vv-card h2, .vv-card h3, .vv-nost-card-title { background: linear-gradient(90deg, #5d3317, #8b5a2b, #d4a574) !important; color: #fff !important; }
.vv-pinnwand-entry { background: #faf0e0 !important; border-color: #b8865b !important; }
.vv-nost-hero { background: linear-gradient(135deg, #d4a574, #b8865b) !important; border-color: #5d3317 !important; }
.vv-nost-chip { background: radial-gradient(circle, #3d1f0a 0%, #3d1f0a 30%, #d4a574 32%) !important; color: #5d3317 !important; }
`,
};

const CHAT_THEMES = [
  { id: "default", name: "💙 Standard (Blau)", color: "#2d7dd2" },
  { id: "pink",    name: "💖 Nostalgie Pink", color: "#ff3e9d" },
  { id: "msn",     name: "📨 MSN Classic",    color: "#5b94d6" },
  { id: "neon",    name: "⚡ Neon Rave",       color: "#f0f" },
  { id: "dark",    name: "🖤 Dark Emo",        color: "#1a0030" },
  { id: "gold",    name: "👑 Gold Glamour",   color: "#f59e0b" },
  { id: "ocean",   name: "🌊 Ocean",           color: "#06b6d4" },
  { id: "rainbow", name: "🌈 Regenbogen",      color: "#ff0080" },
];

const EXAMPLE = `/* Hier kannst du dein Profil designen!
 * Selektoren werden automatisch auf dein Profil beschränkt.
 *
 * Beispiel:
 *   body { background: pink; }
 *   .vv-card { background: #fff7d6; border: 3px dashed #ff3e9d; }
 *   .vv-card h2, .vv-card h3 { background: black !important; color: #ff3e9d !important; }
 */
`;

// Komponenten, die im Color-Builder einzeln gefärbt werden können.
// Jede Gruppe (group) wird im UI als eigene Sektion gerendert.
const COMPONENTS = [
  // === Seite & Hintergrund ===
  { group: "Seite",      key: "body",        label: "🌅 Hintergrund",          selectors: "body",                                                    prop: "background" },
  { group: "Seite",      key: "text",        label: "📃 Allgemeiner Text",     selectors: ".vv-nost-page, .vv-nost-card-body",                       prop: "color" },

  // === Marquee (Banner ganz oben) ===
  { group: "Marquee",    key: "marquee",     label: "🎀 Marquee-Hintergrund",  selectors: ".vv-nost-marquee",                                        prop: "background" },
  { group: "Marquee",    key: "marqueeText", label: "🎨 Marquee-Text",          selectors: ".vv-nost-marquee",                                        prop: "color" },

  // === Hero / Titelbild ===
  { group: "Titelbild",  key: "hero",        label: "🌈 Titelbild (Hero)",      selectors: ".vv-nost-hero",                                           prop: "background" },
  { group: "Titelbild",  key: "heroBorder",  label: "🟪 Titelbild-Rahmen",      selectors: ".vv-nost-hero",                                           prop: "border-color" },
  { group: "Titelbild",  key: "wordart",     label: "✨ Name (WordArt)",        selectors: ".vv-nost-wordart",                                        prop: "color", fill: true },
  { group: "Titelbild",  key: "username",    label: "🆔 @username-Farbe",       selectors: ".vv-nost-username",                                       prop: "color" },
  { group: "Titelbild",  key: "stars",       label: "⭐ Hero-Sterne",           selectors: ".vv-nost-hero-stars span",                                prop: "color" },
  { group: "Titelbild",  key: "mood",        label: "💭 Mood-Bubble",           selectors: ".vv-mood, .vv-nost-mood",                                 prop: "background" },
  { group: "Titelbild",  key: "moodText",    label: "💬 Mood-Text",             selectors: ".vv-mood, .vv-nost-mood",                                 prop: "color" },
  { group: "Titelbild",  key: "moodBorder",  label: "🔲 Mood-Rahmen",           selectors: ".vv-mood, .vv-nost-mood",                                 prop: "border-color" },

  // === Mitglieds-Zertifikat ===
  { group: "Zertifikat", key: "cert",        label: "📜 Zertifikat-BG",         selectors: ".vv-nost-cert",                                           prop: "background" },
  { group: "Zertifikat", key: "certBorder",  label: "🔲 Zertifikat-Rahmen",     selectors: ".vv-nost-cert",                                           prop: "border-color" },
  { group: "Zertifikat", key: "certText",    label: "📝 Zertifikat-Text",       selectors: ".vv-nost-cert, .vv-nost-cert-row",                        prop: "color" },
  { group: "Zertifikat", key: "certTitle",   label: "🏆 Zertifikat-Titel",      selectors: ".vv-nost-cert-title",                                     prop: "color" },

  // === Action-Buttons (Profil bearbeiten, Status, Skin, Fotos, Shop, Transaktionen) ===
  { group: "Aktionen",   key: "action",      label: "🔘 Action-Button BG",      selectors: ".vv-nost-action",                                         prop: "background" },
  { group: "Aktionen",   key: "actionText",  label: "🔠 Action-Button Text",    selectors: ".vv-nost-action, .vv-nost-action span",                   prop: "color" },
  { group: "Aktionen",   key: "actionBorder",label: "🟧 Action-Button Rahmen",  selectors: ".vv-nost-action",                                         prop: "border-color" },
  { group: "Aktionen",   key: "btn",         label: "🔘 Normale Buttons",       selectors: ".vv-btn",                                                 prop: "background" },
  { group: "Aktionen",   key: "btnText",     label: "🔠 Normale Buttons-Text",  selectors: ".vv-btn",                                                 prop: "color" },

  // === Cards (Steckbrief, Über mich, Pinnwand, Top5, Geschenke etc.) ===
  { group: "Karten",     key: "card",        label: "📋 Karten-Inhalt",         selectors: ".vv-card, .vv-nost-card-body",                            prop: "background" },
  { group: "Karten",     key: "cardTitle",   label: "🏷 Karten-Titel-BG",        selectors: ".vv-card h2, .vv-card h3, .vv-nost-card-title",           prop: "background" },
  { group: "Karten",     key: "cardText",    label: "📝 Karten-Titel-Text",     selectors: ".vv-card h2, .vv-card h3, .vv-nost-card-title",           prop: "color" },
  { group: "Karten",     key: "border",      label: "🟪 Karten-Rahmen",         selectors: ".vv-card, .vv-nost-card",                                 prop: "border-color" },
  { group: "Karten",     key: "cardBody",    label: "📃 Karten-Body-Text",      selectors: ".vv-nost-card-body, .vv-card",                            prop: "color" },

  // === Steckbrief ===
  { group: "Steckbrief", key: "stbLabel",    label: "🔖 Steckbrief-Label",      selectors: ".vv-nost-steckbrief-label",                               prop: "color" },
  { group: "Steckbrief", key: "stbValue",    label: "📌 Steckbrief-Werte",      selectors: ".vv-nost-steckbrief-value",                               prop: "color" },
  { group: "Steckbrief", key: "chip",        label: "🏷 Interessen-Chips",      selectors: ".vv-nost-chip",                                           prop: "background" },
  { group: "Steckbrief", key: "chipText",    label: "🔤 Chip-Text",             selectors: ".vv-nost-chip",                                           prop: "color" },

  // === Pinnwand / Gästebuch ===
  { group: "Pinnwand",   key: "pin",         label: "📌 Pinnwand-Eintrag",      selectors: ".vv-pinnwand-entry",                                      prop: "background" },
  { group: "Pinnwand",   key: "pinBorder",   label: "📍 Pinnwand-Rahmen",       selectors: ".vv-pinnwand-entry",                                      prop: "border-color" },
  { group: "Pinnwand",   key: "pinText",     label: "✍ Pinnwand-Text",          selectors: ".vv-pinnwand-entry",                                      prop: "color" },
  { group: "Pinnwand",   key: "tab",         label: "🔖 Tab aktiv (Pinnwand)",  selectors: ".vv-nost-tab.active",                                     prop: "background" },
  { group: "Pinnwand",   key: "tabInactive", label: "🔖 Tab inaktiv",           selectors: ".vv-nost-tab:not(.active)",                               prop: "background" },

  // === Footer ===
  { group: "Footer",     key: "footer",      label: "🦶 Footer-BG",             selectors: ".vv-nost-footer",                                         prop: "background" },
  { group: "Footer",     key: "footerText",  label: "🔤 Footer-Text",           selectors: ".vv-nost-footer",                                         prop: "color" },
  { group: "Footer",     key: "footerBorder",label: "🔲 Footer-Rahmen",         selectors: ".vv-nost-footer",                                         prop: "border-color" },
];

const COMPONENT_GROUPS = ["Seite", "Marquee", "Titelbild", "Zertifikat", "Aktionen", "Karten", "Steckbrief", "Pinnwand", "Footer"];

// 7 nostalgische Web-Schriftarten
const FONT_CHOICES = [
  { id: "default",   name: "Standard",         family: "" },
  { id: "comic",     name: "Comic Sans (2007)", family: '"Comic Sans MS", "Trebuchet MS", cursive' },
  { id: "trebuchet", name: "Trebuchet (sauber)", family: '"Trebuchet MS", Arial, sans-serif' },
  { id: "georgia",   name: "Georgia (Magazin)", family: 'Georgia, "Times New Roman", serif' },
  { id: "courier",   name: "Courier (Retro-Code)", family: '"Courier New", monospace' },
  { id: "verdana",   name: "Verdana (klar)",   family: 'Verdana, Geneva, sans-serif' },
  { id: "impact",    name: "Impact (laut)",     family: 'Impact, "Arial Black", sans-serif' },
];

// Hex zu RGB
function hexToRgb(hex) {
  if (!hex) return null;
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length !== 6) return null;
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
}
// Luminanz (WCAG-Formel, vereinfacht)
function luminance(hex) {
  const c = hexToRgb(hex);
  if (!c) return 0.5;
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
}
function autoContrast(bg) {
  if (!bg) return null;
  return luminance(bg) > 0.45 ? "#1c1c1e" : "#fff";
}

// Auto-Contrast Map: pro Hintergrund-Key gibt's einen Text-Key der mitgesetzt wird
const AUTO_CONTRAST = {
  body:       { textKey: "text" },
  hero:       { textKey: "username" },
  cert:       { textKey: "certText" },
  action:     { textKey: "actionText" },
  card:       { textKey: "cardBody" },
  cardTitle:  { textKey: "cardText" },
  pin:        { textKey: "pinText" },
  mood:       { textKey: "moodText" },
  chip:       { textKey: "chipText" },
  footer:     { textKey: "footerText" },
  marquee:    { textKey: "marqueeText" },
  btn:        { textKey: "btnText" },
  tab:        { textKey: null }, // tab-text wird automatisch korrigiert
};

function buildCssFromColors(colors, fontId, autoContrastEnabled) {
  const lines = [];
  for (const c of COMPONENTS) {
    const v = colors[c.key];
    if (!v) continue;
    if (c.fill) {
      lines.push(`${c.selectors} { ${c.prop}: ${v} !important; -webkit-text-fill-color: ${v} !important; background: none !important; -webkit-background-clip: initial !important; }`);
    } else {
      lines.push(`${c.selectors} { ${c.prop}: ${v} !important; }`);
    }
  }
  // Auto-Contrast: wenn aktiv und User keinen Text gesetzt hat, passenden Text mitsetzen
  if (autoContrastEnabled) {
    for (const [bgKey, info] of Object.entries(AUTO_CONTRAST)) {
      const bg = colors[bgKey];
      if (!bg) continue;
      if (info.textKey && colors[info.textKey]) continue; // User hat Text explizit gewählt
      if (!info.textKey) continue;
      const textComp = COMPONENTS.find((x) => x.key === info.textKey);
      if (!textComp) continue;
      const fg = autoContrast(bg);
      if (!fg) continue;
      lines.push(`${textComp.selectors} { color: ${fg} !important; }`);
    }
  }
  // Schriftart
  const font = FONT_CHOICES.find((f) => f.id === fontId);
  if (font && font.family) {
    lines.push(`body, .vv-nost-page, .vv-card, .vv-nost-card-body, .vv-pinnwand-entry { font-family: ${font.family} !important; }`);
  }
  return lines.join("\n");
}

export default function SkinPage() {
  const router = useRouter();
  const { me, loading, refresh } = useMe();
  const [css, setCss] = useState("");
  const [busy, setBusy] = useState(false);
  const [colors, setColors] = useState({});
  const [chatTheme, setChatTheme] = useState("default");
  const [fontId, setFontId] = useState("default");
  const [autoContrastEnabled, setAutoContrastEnabled] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!me) { router.push("/login"); return; }
    setCss(me.customCss || EXAMPLE);
    try { setChatTheme(localStorage.getItem("vv-chat-theme") || "default"); } catch {}
  }, [me, loading, router]);

  const builtCss = useMemo(() => buildCssFromColors(colors, fontId, autoContrastEnabled), [colors, fontId, autoContrastEnabled]);

  if (loading || !me) return null;

  async function save() {
    setBusy(true);
    try {
      await api.updateMe(me.username, { customCss: css });
      await refresh();
      router.push("/profile");
      router.refresh();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  function applyPreset(name) {
    setCss(PRESETS[name]);
    setColors({});
  }

  function applyChatTheme(id) {
    setChatTheme(id);
    try {
      localStorage.setItem("vv-chat-theme", id);
      window.dispatchEvent(new CustomEvent("vv-chat-theme-change"));
    } catch {}
  }

  function setColor(key, value) {
    setColors((c) => ({ ...c, [key]: value }));
  }

  function applyBuilderToCss() {
    const block = builtCss;
    if (!block.trim()) { alert("Wähl erst Farben aus 🎨"); return; }
    const marker = "/* --- Color-Builder --- */";
    const endMarker = "/* --- /Color-Builder --- */";
    const current = css.replace(new RegExp(`${marker.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}[\\s\\S]*?${endMarker.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}`, "m"), "").trim();
    setCss(`${marker}\n${block}\n${endMarker}\n\n${current}`);
  }

  function resetBuilder() {
    setColors({});
  }

  return (
    <div className="vv-card">
      <h2>🎨 Profil-Skin & Chat-Style</h2>
      <p className="vv-muted">
        Gib deinem Profil ein eigenes Aussehen — wie früher bei MySpace! Wähl ein Preset,
        bau dir mit den Farb-Pickern dein eigenes Design oder schreib direkt CSS.
        Dein CSS wirkt nur auf deiner Profilseite. Gefährliche Statements werden automatisch entfernt.
      </p>

      {/* === Chat-Overlay-Theme === */}
      <div className="vv-card" style={{ marginTop: 12, background: "linear-gradient(135deg,#fef3c7,#fde68a)", border: "2px dashed #f59e0b" }}>
        <h3 style={{ marginTop: 0, color: "#7c2d12" }}>💬 Chat-Overlay-Theme</h3>
        <p className="vv-muted" style={{ marginTop: 0 }}>
          Wirkt sofort auf dein Chat-Fenster unten rechts. Wird lokal gespeichert.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 6 }}>
          {CHAT_THEMES.map((t) => (
            <button key={t.id} type="button" onClick={() => applyChatTheme(t.id)}
              style={{
                padding: "8px 10px", borderRadius: 10, fontSize: 12, fontWeight: 700,
                background: chatTheme === t.id ? t.color : "#fff",
                color: chatTheme === t.id ? "#fff" : "#1c1c1e",
                border: `2px solid ${t.color}`,
                cursor: "pointer", textAlign: "left",
                boxShadow: chatTheme === t.id ? `0 4px 12px ${t.color}66` : "none",
              }}>
              {t.name}
              {chatTheme === t.id && <span style={{ float: "right" }}>✓</span>}
            </button>
          ))}
        </div>
      </div>

      {/* === Presets === */}
      <div className="vv-card" style={{ marginTop: 12 }}>
        <h3 style={{ marginTop: 0 }}>🎁 Presets — alles auf einmal</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 6 }}>
          {Object.keys(PRESETS).map((p) => (
            <button key={p} type="button" className="vv-btn" onClick={() => applyPreset(p)}
              style={{ fontSize: 12, padding: "8px 10px", textAlign: "left" }}>
              {p.replace(/_/g, " ")}
            </button>
          ))}
          <button type="button" className="vv-btn" onClick={() => { setCss(""); setColors({}); }}
            style={{ fontSize: 12, padding: "8px 10px" }}>🧹 Alles leeren</button>
        </div>
      </div>

      {/* === Schriftart + Auto-Kontrast === */}
      <div className="vv-card" style={{ marginTop: 12, background: "linear-gradient(135deg,#dbeafe,#e9d5ff)", border: "2px dashed #6366f1" }}>
        <h3 style={{ marginTop: 0, color: "#3730a3" }}>🔤 Schrift & Kontrast</h3>
        <p className="vv-muted" style={{ marginTop: 0 }}>
          Schriftart fürs ganze Profil wählen. <b>Auto-Kontrast</b> setzt automatisch hellen Text auf dunklem Hintergrund (kein schwarz auf schwarz).
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 6 }}>
          {FONT_CHOICES.map((f) => (
            <button key={f.id} type="button" onClick={() => setFontId(f.id)}
              style={{
                padding: "10px 12px", borderRadius: 10, fontSize: 13, fontWeight: 700,
                border: `2px solid ${fontId === f.id ? "#6366f1" : "#c4b5fd"}`,
                background: fontId === f.id ? "#6366f1" : "#fff",
                color: fontId === f.id ? "#fff" : "#3730a3",
                fontFamily: f.family || "inherit",
                cursor: "pointer", textAlign: "left",
              }}>
              {f.name}
              {fontId === f.id && <span style={{ float: "right" }}>✓</span>}
            </button>
          ))}
        </div>
        <label style={{
          display: "flex", alignItems: "center", gap: 10, marginTop: 12, padding: "10px 12px",
          background: autoContrastEnabled ? "linear-gradient(135deg, #dcfce7, #bbf7d0)" : "#fff",
          border: `2px solid ${autoContrastEnabled ? "#22c55e" : "#c4b5fd"}`,
          borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 13,
          color: autoContrastEnabled ? "#166534" : "#3730a3",
        }}>
          <input type="checkbox" checked={autoContrastEnabled}
            onChange={(e) => setAutoContrastEnabled(e.target.checked)}
            style={{ width: 18, height: 18 }} />
          <span style={{ flex: 1 }}>
            🌗 Auto-Kontrast — bei dunkler BG-Farbe automatisch helle Schrift
            <div style={{ fontSize: 11, opacity: 0.75, fontWeight: 500, marginTop: 2 }}>
              Wird übersteuert wenn du Text-Farbe selbst wählst.
            </div>
          </span>
        </label>
      </div>

      {/* === Color-Builder mit Sektionen === */}
      <div className="vv-card" style={{ marginTop: 12, background: "linear-gradient(135deg,#fce7f3,#f5d0fe)", border: "2px dashed #ec4899" }}>
        <h3 style={{ marginTop: 0, color: "#831843" }}>🖌 Farb-Builder — alles einzeln änderbar</h3>
        <p className="vv-muted" style={{ marginTop: 0 }}>
          Klick auf ein Farbfeld, wähl deine Farbe — fertig. Mit „→ In CSS-Editor übernehmen" landet alles unten als CSS-Block.
          <b> Sticky Buttons</b> ganz unten zeigen wieviele Farben aktiv sind.
        </p>

        {COMPONENT_GROUPS.map((group) => {
          const items = COMPONENTS.filter((c) => c.group === group);
          if (!items.length) return null;
          const activeInGroup = items.filter((c) => colors[c.key]).length;
          return (
            <div key={group} style={{ marginTop: 14 }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                marginBottom: 6, padding: "5px 10px",
                background: "rgba(255,255,255,0.55)",
                borderRadius: 999, fontWeight: 800, fontSize: 12,
                color: "#831843", border: "1px solid #ec4899",
              }}>
                <span style={{ flex: 1 }}>📂 {group}</span>
                {activeInGroup > 0 && (
                  <span style={{
                    background: "#ec4899", color: "#fff",
                    padding: "1px 8px", borderRadius: 999,
                    fontSize: 10, fontWeight: 700,
                  }}>{activeInGroup} aktiv</span>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 6 }}>
                {items.map((c) => (
                  <label key={c.key} style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "7px 9px",
                    background: colors[c.key] ? "#fff" : "rgba(255,255,255,0.7)",
                    borderRadius: 10,
                    border: colors[c.key] ? "2px solid #ec4899" : "1px solid #f9a8d4",
                    cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#831843",
                    transition: "border-color 0.15s",
                  }}>
                    <input type="color"
                      value={colors[c.key] || "#ec4899"}
                      onChange={(e) => setColor(c.key, e.target.value)}
                      style={{ width: 30, height: 30, border: "none", padding: 0, cursor: "pointer", background: "none", borderRadius: 6 }} />
                    <span style={{ flex: 1, minWidth: 0, fontSize: 11.5 }}>{c.label}</span>
                    {colors[c.key] && (
                      <button type="button" onClick={(e) => { e.preventDefault(); setColor(c.key, undefined); }}
                        style={{ background: "none", border: "none", color: "#831843", cursor: "pointer", fontSize: 16, lineHeight: 1 }}
                        title="Zurücksetzen">×</button>
                    )}
                  </label>
                ))}
              </div>
            </div>
          );
        })}

        <div className="vv-row vv-mt-12" style={{
          position: "sticky", bottom: 8, zIndex: 5,
          background: "linear-gradient(135deg,#fce7f3,#f5d0fe)",
          padding: 8, borderRadius: 10, border: "2px solid #ec4899",
          marginTop: 16,
        }}>
          <button type="button" className="vv-btn vv-btn-pink" onClick={applyBuilderToCss}>
            → In CSS-Editor übernehmen
          </button>
          <button type="button" className="vv-btn" onClick={resetBuilder}>
            ↺ Builder leeren
          </button>
          <span className="vv-muted" style={{ fontSize: 11, alignSelf: "center" }}>
            {Object.keys(colors).filter((k) => colors[k]).length} von {COMPONENTS.length} Komponenten gefärbt
          </span>
        </div>
      </div>

      {/* === CSS-Editor + Live-Vorschau === */}
      <div className="vv-skin-editor-grid vv-mt-12">
        <div className="vv-skin-editor-col">
          <label><strong>📝 CSS-Editor</strong></label>
          <textarea
            className="vv-textarea"
            style={{ fontFamily: "Courier New, monospace", minHeight: 360, fontSize: 12 }}
            value={css}
            onChange={(e) => setCss(e.target.value)}
            spellCheck={false}
          />
          <div className="vv-muted" style={{ fontSize: 11, marginTop: 4 }}>
            {css.length} Zeichen · Gefährliche Statements werden serverseitig entfernt.
          </div>
        </div>

        <div className="vv-skin-preview-col">
          <div className="vv-skin-preview-header">
            <strong>👁 Live-Vorschau</strong>
            <span className="vv-muted" style={{ fontSize: 11 }}>So sieht dein Profil aus</span>
          </div>

          {/* Mini-Browser-Rahmen */}
          <div className="vv-skin-preview-frame">
            <div className="vv-skin-preview-toolbar">
              <span className="vv-skin-preview-dot" style={{ background: "#ff5f57" }} />
              <span className="vv-skin-preview-dot" style={{ background: "#ffbd2e" }} />
              <span className="vv-skin-preview-dot" style={{ background: "#28ca42" }} />
              <span className="vv-skin-preview-url">vibevibo.de/u/{me.username}</span>
            </div>

            <div className="vv-skin vv-skin-preview-stage">
              {css && <style dangerouslySetInnerHTML={{ __html: scopeCss(css, ".vv-skin") }} />}
              <div className="vv-nost-page" data-gender={me.gender || ""}>

                {/* Marquee */}
                <div className="vv-nost-marquee">
                  <div style={{ padding: "6px 12px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    ★ ✿ ♡ Willkommen auf meinem Profil ♡ ✿ ★
                  </div>
                </div>

                {/* Hero */}
                <div className="vv-nost-hero" style={{ position: "relative", textAlign: "center", padding: "16px 12px" }}>
                  <div className="vv-nost-hero-glitter" />
                  <div className="vv-nost-hero-stars">
                    <span>✩</span><span>★</span><span>✿</span><span>♡</span>
                    <span>♥</span><span>✿</span><span>★</span><span>✩</span>
                  </div>
                  <div className="vv-nost-avatar-frame" style={{ display: "inline-block" }}>
                    <div className="vv-nost-avatar" style={{
                      width: 64, height: 64, borderRadius: "50%",
                      background: "linear-gradient(135deg,#fce7f3,#a855f7)",
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      fontSize: 28,
                    }}>🌸</div>
                  </div>
                  <h1 className="vv-nost-wordart" style={{ fontSize: 22, margin: "8px 0 2px" }}>
                    {me.displayName || me.username}
                  </h1>
                  <div className="vv-nost-username">@{me.username}</div>
                  <div className="vv-nost-mood" style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 6, padding: "3px 10px", borderRadius: 999, fontSize: 12 }}>
                    <span>💭</span><span>verliebt 💘</span>
                  </div>
                  <div className="vv-nost-cert" style={{ marginTop: 10, padding: 8, borderRadius: 10, fontSize: 11 }}>
                    <div className="vv-nost-cert-title" style={{ fontWeight: 800, marginBottom: 4 }}>★ OFFIZIELLES VIBE★VIBO MITGLIED ★</div>
                    <div className="vv-nost-cert-row" style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
                      <span><b>Nr.</b> #00042</span>
                      <span><b>Seit</b> 12.06.2026</span>
                      <span><b>Tage</b> 1</span>
                    </div>
                  </div>
                </div>

                {/* Action-Buttons */}
                <div className="vv-nost-actions" style={{ display: "flex", gap: 4, justifyContent: "center", margin: "10px 0", flexWrap: "wrap" }}>
                  <button type="button" className="vv-nost-action" style={{ padding: "6px 10px", borderRadius: 8, fontSize: 11, border: "2px solid", cursor: "default" }}>✎ Bearbeiten</button>
                  <button type="button" className="vv-nost-action" style={{ padding: "6px 10px", borderRadius: 8, fontSize: 11, border: "2px solid", cursor: "default" }}>💭 Status</button>
                  <button type="button" className="vv-nost-action" style={{ padding: "6px 10px", borderRadius: 8, fontSize: 11, border: "2px solid", cursor: "default" }}>🛍 Shop</button>
                </div>

                {/* Karte: Über mich */}
                <div className="vv-nost-card vv-nost-card-violet" style={{ marginBottom: 8 }}>
                  <div className="vv-nost-card-title" style={{ padding: 8, fontSize: 12 }}>✿ ÜBER MICH ✿</div>
                  <div className="vv-nost-card-body" style={{ padding: 10, fontSize: 12 }}>
                    <div style={{ marginBottom: 6 }}>
                      <span className="vv-nost-chip" style={{ display: "inline-block", padding: "2px 8px", borderRadius: 999, fontSize: 11, marginRight: 4 }}>📍 Berlin</span>
                      <span className="vv-nost-chip" style={{ display: "inline-block", padding: "2px 8px", borderRadius: 999, fontSize: 11, marginRight: 4 }}>🏫 Goethe-Gym</span>
                      <span className="vv-nost-chip" style={{ display: "inline-block", padding: "2px 8px", borderRadius: 999, fontSize: 11 }}>💕 vergeben</span>
                    </div>
                    <div style={{ fontSize: 12, lineHeight: 1.4 }}>
                      Hi! Ich liebe Y2K, Emo-Bands, Bubble-Tea und alte Nokia-Klingeltöne. ✿
                    </div>
                  </div>
                </div>

                {/* Karte: Pinnwand */}
                <div className="vv-nost-card vv-nost-card-pink" style={{ marginBottom: 8 }}>
                  <div className="vv-nost-card-title" style={{ padding: 8, fontSize: 12 }}>✎ PINNWAND ✎</div>
                  <div className="vv-nost-card-body" style={{ padding: 10 }}>
                    <div className="vv-nost-tabs" style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                      <button type="button" className="vv-nost-tab active" style={{ padding: "4px 10px", borderRadius: 8, fontSize: 11, cursor: "default", border: "1px solid" }}>📌 Pinnwand</button>
                      <button type="button" className="vv-nost-tab" style={{ padding: "4px 10px", borderRadius: 8, fontSize: 11, cursor: "default", border: "1px solid" }}>📖 Gästebuch</button>
                    </div>
                    <div className="vv-pinnwand-entry" style={{ padding: 8, borderRadius: 8, border: "1px solid", marginBottom: 4, fontSize: 12 }}>
                      <div className="vv-pinnwand-meta" style={{ fontSize: 10, opacity: 0.7, marginBottom: 3 }}>
                        <strong>kevin_skater</strong> 🛹 · vor 2 Std.
                      </div>
                      <div>Hdl du knuddelmaus 🥰</div>
                    </div>
                    <div className="vv-pinnwand-entry" style={{ padding: 8, borderRadius: 8, border: "1px solid", fontSize: 12 }}>
                      <div className="vv-pinnwand-meta" style={{ fontSize: 10, opacity: 0.7, marginBottom: 3 }}>
                        <strong>lisa_2k</strong> 💖 · gestern
                      </div>
                      <div>Cooles Profil ✨</div>
                    </div>
                  </div>
                </div>

                {/* Karte: Steckbrief */}
                <div className="vv-nost-card vv-nost-card-cyan" style={{ marginBottom: 8 }}>
                  <div className="vv-nost-card-title" style={{ padding: 8, fontSize: 12 }}>📋 STECKBRIEF</div>
                  <div className="vv-nost-card-body" style={{ padding: 10, fontSize: 12 }}>
                    <div className="vv-nost-steckbrief-row" style={{ display: "flex", gap: 8, marginBottom: 3 }}>
                      <span className="vv-nost-steckbrief-label" style={{ fontWeight: 700, minWidth: 70 }}>Lieblingsband:</span>
                      <span className="vv-nost-steckbrief-value">Tokio Hotel</span>
                    </div>
                    <div className="vv-nost-steckbrief-row" style={{ display: "flex", gap: 8 }}>
                      <span className="vv-nost-steckbrief-label" style={{ fontWeight: 700, minWidth: 70 }}>Lieblingsfarbe:</span>
                      <span className="vv-nost-steckbrief-value">Pink ✿</span>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="vv-nost-footer" style={{
                  padding: "8px 10px", textAlign: "center", fontSize: 10,
                  borderRadius: 10, border: "1px solid",
                  display: "flex", justifyContent: "center", gap: 6,
                }}>
                  <span>★</span>
                  <span>{me.displayName || me.username}'s VibeVibo · Mitglied #00042</span>
                  <span>★</span>
                </div>
              </div>
            </div>
          </div>

          <div className="vv-skin-preview-tip">
            💡 Die Vorschau zeigt alle 40+ stylebaren Bereiche. Was hier so aussieht, sieht auch auf deinem Profil so aus.
          </div>
        </div>
      </div>

      <div className="vv-row vv-mt-12">
        <Link href="/profile" className="vv-btn">↩ Abbrechen</Link>
        <div className="vv-spacer" />
        <button type="button" className="vv-btn vv-btn-pink" onClick={save} disabled={busy}>
          💾 Skin speichern
        </button>
      </div>
    </div>
  );
}
