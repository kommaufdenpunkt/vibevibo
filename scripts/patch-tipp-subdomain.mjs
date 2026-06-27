// Idempotenter Patch: tipp.vibevibo.de → 308-Redirect auf https://vibevibo.de/tipp.
// Ergänzt die bestehende middleware.js (Helper + Redirect-Block), ohne sonst etwas zu ändern.

import fs from "node:fs";
import path from "node:path";

const FILE = path.join(process.cwd(), "middleware.js");
if (!fs.existsSync(FILE)) {
  console.error("⚠ middleware.js nicht gefunden — Patch abgebrochen.");
  process.exit(1);
}

let src = fs.readFileSync(FILE, "utf8");

if (src.includes("isTippHost")) {
  console.log("ℹ Tipp-Subdomain-Redirect bereits vorhanden — nichts zu tun.");
  process.exit(0);
}

let changed = false;

// 1) Helper isTippHost direkt nach isAdminHost einsetzen
const ADMIN_HOST_FN = `function isAdminHost(hostname) {
  if (!hostname) return false;
  const h = hostname.toLowerCase();
  return h === "admin.vibevibo.de" || h.startsWith("admin.vibevibo.de:");
}`;
const TIPP_HOST_FN = `

function isTippHost(hostname) {
  if (!hostname) return false;
  const h = hostname.toLowerCase();
  return h === "tipp.vibevibo.de" || h.startsWith("tipp.vibevibo.de:");
}`;
if (!src.includes(ADMIN_HOST_FN)) {
  console.error("⚠ Anker isAdminHost nicht gefunden — Patch abgebrochen.");
  process.exit(1);
}
src = src.replace(ADMIN_HOST_FN, ADMIN_HOST_FN + TIPP_HOST_FN);
changed = true;

// 2) Redirect-Block früh in middleware() einsetzen (nach der isApi-Zeile)
const API_ANCHOR = '  const isApi = pathname.startsWith("/api/");';
const REDIRECT_BLOCK = `

  // === ⚽ Tipp-Subdomain → Redirect auf vibevibo.de/tipp ===
  // (Login-Cookie gilt für vibevibo.de; daher Redirect statt Rewrite.)
  if (isTippHost(hostname)) {
    return NextResponse.redirect("https://vibevibo.de/tipp", 308);
  }`;
if (!src.includes(API_ANCHOR)) {
  console.error("⚠ Anker isApi nicht gefunden — Patch abgebrochen.");
  process.exit(1);
}
src = src.replace(API_ANCHOR, API_ANCHOR + REDIRECT_BLOCK);
changed = true;

if (changed) {
  fs.writeFileSync(FILE, src, "utf8");
  console.log("✅ middleware.js: tipp.vibevibo.de → /tipp Redirect ergänzt.");
}
