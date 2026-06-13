// Patcht lib/db.js: greeting_title-Spalte + Mapping an 3 Stellen.
// Idempotent.

import fs from 'fs';
const PATH = process.env.HOME + '/vibevibo/lib/db.js';

const c = fs.readFileSync(PATH, 'utf-8');
let out = c;
let changed = 0;

// 1) Schema: addColumnIfMissing fuer greeting_title direkt nach greeting_html
const SCHEMA_MARK = `addColumnIfMissing(d, "users", "greeting_html", "TEXT DEFAULT ''");`;
const SCHEMA_NEW = `${SCHEMA_MARK}\n  addColumnIfMissing(d, "users", "greeting_title", "TEXT DEFAULT ''");`;
if (!out.includes(`addColumnIfMissing(d, "users", "greeting_title"`)) {
  if (!out.includes(SCHEMA_MARK)) {
    console.error("Marker fuer greeting_html-Spalte nicht gefunden.");
    process.exit(1);
  }
  out = out.replace(SCHEMA_MARK, SCHEMA_NEW);
  changed++;
}

// 2) Return-Mapping: greetingHtml: u.greeting_html || "",
const RET_MARK = `greetingHtml: u.greeting_html || "",`;
const RET_NEW = `${RET_MARK}\n    greetingTitle: u.greeting_title || "",`;
if (!out.includes(`greetingTitle: u.greeting_title`)) {
  if (!out.includes(RET_MARK)) {
    console.error("Marker fuer greetingHtml-Return-Mapping nicht gefunden.");
    process.exit(1);
  }
  out = out.replace(RET_MARK, RET_NEW);
  changed++;
}

// 3) updateUser-Allowed-Map: greetingHtml: "greeting_html",
const UPD_MARK = `greetingHtml: "greeting_html",`;
const UPD_NEW = `${UPD_MARK}\n    greetingTitle: "greeting_title",`;
if (!out.includes(`greetingTitle: "greeting_title"`)) {
  if (!out.includes(UPD_MARK)) {
    console.error("Marker fuer updateUser-Map nicht gefunden.");
    process.exit(1);
  }
  out = out.replace(UPD_MARK, UPD_NEW);
  changed++;
}

if (changed === 0) {
  console.log("greeting_title-Patch schon angewendet, skip.");
  process.exit(0);
}
fs.writeFileSync(PATH, out);
console.log(`greeting_title-Patch angewendet (${changed} Stellen).`);
