#!/usr/bin/env node
// 🔧 Fix: duplicate sendCompliment in db.js.
// Existing compliments-System hat schon eine `sendCompliment(from, to, {text, emoji, anonymous})`.
// Mein neuer Patch hatte `sendCompliment({toUserId, fromUserId, body, emoji})` mit anderer Signatur.
// → Rename meine Version zu `sendComplimentNew` damit Build wieder grün wird.
// Idempotent.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const DB_PATH = join(ROOT, "lib", "db.js");

let src = readFileSync(DB_PATH, "utf-8");
let changed = false;

// Mein dupliziertes sendCompliment ist eindeutig durch die {toUserId,...}-Signatur
const PATTERN_OLD = `export function sendCompliment({ toUserId, fromUserId = null, body, emoji = "💌" }) {`;
const PATTERN_NEW = `export function sendComplimentNew({ toUserId, fromUserId = null, body, emoji = "💌" }) {`;

if (src.includes(PATTERN_OLD)) {
  src = src.replace(PATTERN_OLD, PATTERN_NEW);
  changed = true;
  console.log("✓ sendCompliment-Duplikat umbenannt → sendComplimentNew");
} else if (src.includes(PATTERN_NEW)) {
  console.log("✓ Bereits umbenannt.");
} else {
  console.log("ℹ️  Kein Duplikat gefunden — vermutlich noch nicht installiert. Übersprungen.");
}

if (changed) {
  writeFileSync(DB_PATH, src);
  console.log("✓ db.js gefixt.");
}
