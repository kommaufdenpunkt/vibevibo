#!/usr/bin/env node
// 🧹 Cleanup — entfernt veraltete robots.txt Varianten.
// Beide alten Wege werden durch app/robots.js (Next.js Metadata-Konvention) ersetzt.

import { unlinkSync, existsSync, rmSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");

// Variante 1: alte .ts-Metadata-Datei
const STALE_TS = join(ROOT, "app", "robots.ts");
if (existsSync(STALE_TS)) {
  try {
    unlinkSync(STALE_TS);
    console.log("✓ app/robots.ts entfernt (durch app/robots.js ersetzt)");
  } catch (e) {
    console.error("✗ Konnte app/robots.ts nicht löschen:", e.message);
  }
}

// Variante 2: Route-Handler-Verzeichnis (kollidiert mit Metadata-Konvention)
const STALE_ROUTE_DIR = join(ROOT, "app", "robots.txt");
if (existsSync(STALE_ROUTE_DIR)) {
  try {
    rmSync(STALE_ROUTE_DIR, { recursive: true, force: true });
    console.log("✓ app/robots.txt/ Verzeichnis entfernt (durch app/robots.js ersetzt)");
  } catch (e) {
    console.error("✗ Konnte app/robots.txt/ nicht löschen:", e.message);
  }
}

console.log("✓ robots.txt-Cleanup fertig — Next.js liefert jetzt via app/robots.js");
