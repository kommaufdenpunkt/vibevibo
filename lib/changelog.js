// 🆕 Changelog — fuer das "NEU"-Panel im rechten Edge-Reiter.
// Quellen:
//   - lib/changelog.generated.js  (auto aus git log, frisch bei jedem Build)
//   - lib/changelog-manual.js     (handgepflegte Highlights, optional)
//
// Eintraege werden gemerged, nach Datum sortiert (neueste zuerst) und
// dedupliziert (nach normalisiertem Titel).

import { GENERATED_CHANGELOG } from "@/lib/changelog.generated";
import { MANUAL_CHANGELOG } from "@/lib/changelog-manual";

function norm(s) {
  return String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function mergeChangelog() {
  const all = [...MANUAL_CHANGELOG, ...GENERATED_CHANGELOG];
  // Sortieren: neueste zuerst
  all.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  // Dedupe nach normalisiertem Titel
  const seen = new Set();
  const out = [];
  for (const e of all) {
    const k = norm(e.title);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    // Eindeutiger Key fuer Reaktionen: id (manuell) oder sha (git)
    const key = e.id || e.sha || `${e.at}-${k.slice(0, 24)}`;
    out.push({ ...e, key });
  }
  return out;
}

export const CHANGELOG = mergeChangelog();

// Public-Filter: nur Eintraege die normale User sehen sollen.
// Default-Audience (z.B. fuer alte Generated-Files ohne Feld oder
// fuer manuelle Eintraege) ist "public".
export const CHANGELOG_PUBLIC = CHANGELOG.filter(
  (e) => (e.audience || "public") === "public"
);

// Admin sieht alles.
export const CHANGELOG_ADMIN = CHANGELOG;

// Helfer fuer das UI — gibt eine schoene relative Zeit zurueck
export function formatChangelogTime(iso, now = Date.now()) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const diffMs = now - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffMs / 86400000);
  const hhmm = d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  if (diffMin < 1) return "Gerade eben";
  if (diffMin < 60) return `vor ${diffMin} Min`;
  if (diffH < 4) return `vor ${diffH} Std`;
  const today = new Date(now);
  const sameDay = d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
  if (sameDay) return `Heute, ${hhmm}`;
  const yest = new Date(today); yest.setDate(yest.getDate() - 1);
  const isYest = d.getFullYear() === yest.getFullYear() && d.getMonth() === yest.getMonth() && d.getDate() === yest.getDate();
  if (isYest) return `Gestern, ${hhmm}`;
  if (diffD < 7) {
    const wd = d.toLocaleDateString("de-DE", { weekday: "short" });
    return `${wd} ${hhmm}`;
  }
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }) + " " + hhmm;
}

export function latestChangelogAt() {
  if (!CHANGELOG_PUBLIC.length) return 0;
  return new Date(CHANGELOG_PUBLIC[0].at).getTime();
}
