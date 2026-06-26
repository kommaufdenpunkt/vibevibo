#!/usr/bin/env node
// 🗺 Fix: WorldMap blieb grau, weil der Tile-Layer mit Fehler-Handlern + Auto-
// Fallback im useEffect([tileStyle]) hängt — der aber beim Mount abbricht
// (mapRef.current === null, da pos noch fehlt) und danach NIE wieder läuft.
// Der [pos]-Init hängt nur einen nackten Tile-Layer dran (ohne Fallback).
// → Wenn der Default-Tileserver nicht lädt: graue Fläche, kein Fallback, kein Overlay.
//
// Fix (idempotent):
//   1) mapReady-State einführen, in [pos]-Init auf true setzen.
//   2) Tile-Effect-Deps [tileStyle] → [tileStyle, mapReady], damit er nach
//      Karten-Erstellung erneut läuft (mit Handlern + Fallback-Kette).
//   3) Leaflet-Load-Fehler sichtbar machen: "failed"-Overlay statt stiller Grau-Fläche.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const FILE = join(ROOT, "components", "WorldMap.jsx");

let src = readFileSync(FILE, "utf-8");
let changed = false;

// ── 1) mapReady-State einführen ───────────────────────────────────────────
if (!src.includes("const [mapReady, setMapReady]")) {
  const anchor = `  const [tileStatus, setTileStatus] = useState("idle");`;
  if (!src.includes(anchor)) {
    console.error("✗ Anker tileStatus nicht gefunden — Abbruch.");
    process.exit(1);
  }
  src = src.replace(
    anchor,
    `  const [tileStatus, setTileStatus] = useState("idle");\n  // 🗺 Wird true sobald die Leaflet-Karte erstellt ist → triggert den Tile-Effect erneut\n  // (sonst läuft die Fallback-Logik nie, weil sie beim Mount mit mapRef===null abbricht).\n  const [mapReady, setMapReady] = useState(false);`
  );
  changed = true;
  console.log("✓ mapReady-State ergänzt.");
} else {
  console.log("• mapReady-State schon vorhanden.");
}

// ── 2) Tile-Effect-Deps erweitern ─────────────────────────────────────────
if (src.includes("}, [tileStyle]);")) {
  src = src.replace("}, [tileStyle]);", "}, [tileStyle, mapReady]);");
  changed = true;
  console.log("✓ Tile-Effect-Deps → [tileStyle, mapReady].");
} else if (src.includes("}, [tileStyle, mapReady]);")) {
  console.log("• Tile-Effect-Deps schon gepatcht.");
} else {
  console.error("✗ Anker '}, [tileStyle]);' nicht gefunden — Abbruch.");
  process.exit(1);
}

// ── 3) setMapReady(true) nach Karten-Erstellung ───────────────────────────
if (!src.includes("setMapReady(true)")) {
  const anchor = `      mapRef.current = map;`;
  if (!src.includes(anchor)) {
    console.error("✗ Anker 'mapRef.current = map;' nicht gefunden — Abbruch.");
    process.exit(1);
  }
  src = src.replace(
    anchor,
    `      mapRef.current = map;\n      setMapReady(true); // 🗺 jetzt läuft der Tile-Effect mit Fallback-Handlern`
  );
  changed = true;
  console.log("✓ setMapReady(true) nach Karten-Init ergänzt.");
} else {
  console.log("• setMapReady(true) schon vorhanden.");
}

// ── 4) Leaflet-Load-Fehler sichtbar machen ────────────────────────────────
const oldGuard = `      const ok = await loadLeaflet();\n      if (!ok || cancelled || !containerRef.current) return;`;
const newGuard = `      const ok = await loadLeaflet();\n      if (!ok) {\n        if (!cancelled) {\n          setTileStatus("failed");\n          setTileMsg("⚠ Karten-Bibliothek (Leaflet) konnte nicht geladen werden — Internet/Adblocker prüfen oder unten ↻ tippen.");\n        }\n        return;\n      }\n      if (cancelled || !containerRef.current) return;`;
if (src.includes(oldGuard)) {
  src = src.replace(oldGuard, newGuard);
  changed = true;
  console.log("✓ Leaflet-Load-Fehler zeigt jetzt failed-Overlay.");
} else if (src.includes(`setTileMsg("⚠ Karten-Bibliothek (Leaflet)`)) {
  console.log("• Leaflet-Load-Fehler-Handling schon vorhanden.");
} else {
  console.warn("⚠ loadLeaflet-Guard nicht im erwarteten Format — Schritt 4 übersprungen (nicht kritisch).");
}

if (changed) {
  writeFileSync(FILE, src);
  console.log("\n✅ WorldMap.jsx gepatcht. Bitte committen + deployen.");
} else {
  console.log("\n✓ Nichts zu tun — alles schon gepatcht.");
}
