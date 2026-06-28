// Idempotenter Patch: YouTube-Embed in der Haupt-CSP erlauben (für den Profil-Song-Player auf /tipp).
// Robust per Regex: ergänzt NUR die "großen" Direktiven (die googlesyndication enthalten = CSP_MAIN).
// Die strenge MCP/Admin-CSP (script-src 'self' 'unsafe-inline' / frame-src 'none') bleibt unangetastet,
// weil sie kein "googlesyndication" enthält und damit vom Regex nicht getroffen wird.

import fs from "node:fs";
import path from "node:path";

const FILE = path.join(process.cwd(), "lib", "securityHardeningV2.js");
if (!fs.existsSync(FILE)) { console.error("⚠ lib/securityHardeningV2.js nicht gefunden."); process.exit(0); }

let src = fs.readFileSync(FILE, "utf8");
let changed = 0;
const notes = [];

// Fügt Tokens vor dem schließenden Anführungszeichen einer Direktiven-Zeile ein.
// Trifft nur Direktiven der Haupt-CSP (enthalten "googlesyndication").
function addTokens(directive, tokens) {
  const re = new RegExp('"(' + directive + '\\s[^"]*googlesyndication[^"]*)"', "g");
  let touched = false;
  src = src.replace(re, (full, inner) => {
    let add = "";
    for (const t of tokens) { if (!inner.includes(t)) add += " " + t; }
    if (!add) return full; // schon vorhanden
    touched = true;
    return '"' + inner + add + '"';
  });
  if (touched) { changed++; return true; }
  return false;
}

// 1) script-src: iframe_api (www.youtube.com) + Player-JS (s.ytimg.com)
if (addTokens("script-src", ["https://www.youtube.com", "https://s.ytimg.com"])) {
  notes.push("script-src");
} else if (!src.includes("https://s.ytimg.com")) {
  console.error("⚠ script-src (Haupt-CSP) nicht gefunden — bitte CSP manuell prüfen.");
}

// 2) frame-src: YouTube-Embed (regulär + nocookie)
if (addTokens("frame-src", ["https://www.youtube.com", "https://www.youtube-nocookie.com"])) {
  notes.push("frame-src");
} else if (!src.includes("https://www.youtube-nocookie.com")) {
  console.error("⚠ frame-src (Haupt-CSP) nicht gefunden — bitte CSP manuell prüfen.");
}

if (changed > 0) {
  fs.writeFileSync(FILE, src, "utf8");
  console.log(`✅ securityHardeningV2.js: YouTube in Haupt-CSP erlaubt (${notes.join(" + ")}).`);
} else {
  console.log("ℹ CSP: YouTube bereits erlaubt — nichts zu tun.");
}
