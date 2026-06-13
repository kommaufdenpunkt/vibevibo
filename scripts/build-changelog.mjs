#!/usr/bin/env node
// 🔄 Liest `git log` und schreibt vibevibo/lib/changelog.generated.js
// Wird automatisch via `npm run prebuild` aufgerufen → vor jedem Next-Build
// frisch generiert. Manuelle Eintraege bleiben in lib/changelog-manual.js
// erhalten und werden in lib/changelog.js gemerged.
//
// Funktioniert auch wenn kein git verfuegbar ist (gibt leeres Array zurueck).

import { execSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const OUT = join(ROOT, "lib", "changelog.generated.js");
const MAX_ENTRIES = 80;

// Subject -> Emoji-Defaults (wenn der Commit-Text noch kein Emoji hat)
const KEYWORD_EMOJI = [
  [/^(feat|feature)[:\s(]/i, "✨"],
  [/^fix[:\s(]/i, "🐛"],
  [/^perf[:\s(]/i, "⚡"],
  [/^refactor[:\s(]/i, "♻️"],
  [/^docs?[:\s(]/i, "📝"],
  [/^test[:\s(]/i, "🧪"],
  [/^style[:\s(]/i, "💄"],
  [/^chore[:\s(]/i, "🔧"],
  [/^ci[:\s(]/i, "🤖"],
  [/^build[:\s(]/i, "🛠"],
  [/audit/i, "🛡"],
  [/messenger/i, "💬"],
  [/shop|preis|preise/i, "💰"],
  [/musik|playlist|player|dock/i, "🎵"],
  [/pwa|install/i, "📲"],
  [/edge|panel|navbar/i, "📱"],
  [/tile|kachel/i, "🟣"],
  [/begruessung|begrueß|greeting|jappy/i, "🌸"],
  [/komplim/i, "💖"],
  [/skin|design|theme|farb/i, "🎨"],
  [/glocke|bell|notif/i, "🔔"],
  [/vibo|pet|minigame|spiel/i, "🥚"],
  [/changelog/i, "🆕"],
];

// Strip eines fuehrenden Emojis aus dem Subject (gibt {emoji, rest})
function stripLeadingEmoji(subject) {
  // grobe Emoji-Range — kovariant zu Skript-Engine
  const m = subject.match(/^(\p{Extended_Pictographic}(?:‍\p{Extended_Pictographic})*|[★☆♡♥✿✩✎])\s*(.*)$/u);
  if (m) return { emoji: m[1], rest: m[2] };
  return { emoji: null, rest: subject };
}

function pickEmoji(subject) {
  const { emoji, rest } = stripLeadingEmoji(subject);
  if (emoji) return { emoji, title: rest };
  for (const [re, em] of KEYWORD_EMOJI) {
    if (re.test(rest)) return { emoji: em, title: rest };
  }
  return { emoji: "🚀", title: rest };
}

function cleanTitle(s) {
  let t = s.trim();
  // conventional commit prefix entfernen (feat:, fix(scope):, ...)
  t = t.replace(/^(feat|fix|perf|refactor|docs?|test|style|chore|ci|build)(\([^)]+\))?:\s*/i, "");
  // [ci skip] etc.
  t = t.replace(/\[(ci skip|skip ci|no ci)\]/gi, "");
  t = t.replace(/\s+/g, " ").trim();
  // 1. Buchstabe gross
  if (t.length > 0) t = t[0].toUpperCase() + t.slice(1);
  // Begrenzung
  if (t.length > 160) t = t.slice(0, 157) + "...";
  return t;
}

function shouldSkip(subject, parentCount) {
  if (parentCount > 1) return true; // Merge-Commit
  const s = subject.toLowerCase();
  if (/^(merge|merge branch|merge pull)/i.test(subject)) return true;
  if (/^wip(:|\s|\b)/i.test(subject)) return true;
  if (/^revert\b/i.test(subject)) return true;
  if (/^\s*$/.test(subject)) return true;
  if (s.includes("[skip changelog]")) return true;
  return false;
}

function runGit() {
  try {
    // %P = parent hashes (space-sep); zaehlen = Merge-Detection
    const out = execSync(
      `git log -n ${MAX_ENTRIES * 2} --no-merges --format=%H%x09%cI%x09%P%x09%s`,
      { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
    );
    return out;
  } catch {
    return "";
  }
}

function main() {
  const raw = runGit();
  const lines = raw.split("\n").filter(Boolean);
  const entries = [];
  for (const line of lines) {
    const [hash, iso, parents, ...subjParts] = line.split("\t");
    const subject = subjParts.join("\t");
    if (!hash || !iso || !subject) continue;
    const parentCount = (parents || "").split(/\s+/).filter(Boolean).length;
    if (shouldSkip(subject, parentCount)) continue;
    const { emoji, title } = pickEmoji(subject);
    const cleaned = cleanTitle(title);
    if (!cleaned) continue;
    entries.push({ at: iso, emoji, title: cleaned, sha: hash.slice(0, 7) });
    if (entries.length >= MAX_ENTRIES) break;
  }

  mkdirSync(dirname(OUT), { recursive: true });
  const body = `// 🤖 Auto-generiert von scripts/build-changelog.mjs — nicht von Hand editieren!
// Wird bei jedem \`next build\` neu erzeugt. Manuelle Eintraege in
// lib/changelog-manual.js werden in lib/changelog.js dazugemerged.

export const GENERATED_CHANGELOG = ${JSON.stringify(entries, null, 2)};
`;
  writeFileSync(OUT, body, "utf8");
  console.log(`[changelog] ${entries.length} Eintraege → ${OUT.replace(ROOT + "/", "")}`);
}

main();
