#!/usr/bin/env node
// 🩹 Quote-Fix in lib/db.js — repariert die kaputte "Vielleicht".-Zeile
// die durch das fehlerhafte patch-com-meetups.mjs reingelandet ist.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const DB_PATH = join(ROOT, "lib", "db.js");

let src = readFileSync(DB_PATH, "utf-8");

// Defekt: ASCII-Doublequote schließt den String vorzeitig
const BAD = 'throw new Error("Meetup ist voll — versuch\'s mit „Vielleicht".");';
// Fix: U+201C (rechtes deutsches Anführungszeichen oben) statt ASCII-Quote
const GOOD = 'throw new Error("Meetup ist voll — versuch\'s mit „Vielleicht“.");';

if (!src.includes(BAD)) {
  console.log("✓ Quote-Fix schon drin (oder Zeile nicht gefunden).");
  process.exit(0);
}

src = src.replace(BAD, GOOD);
writeFileSync(DB_PATH, src);
console.log("✓ db.js Quote-Fix angewendet.");
