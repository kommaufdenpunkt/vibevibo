// 🔄 Auto-Sync von tipp.4ever1.tv → vibevibo (Spiele, Ergebnisse, Bestenliste, Tipps).
// Läuft serverseitig im Hintergrund, gedrosselt und nie parallel. Wird vom
// /api/tipp/matches-Handler bei jedem Aufruf angestoßen — kein Hand-Import nötig.
//
// Zwei Takte, damit's schnell ist ohne 4ever1 zu überlasten:
//   • LITE alle ~30 s: Teams + Spiele (Tore!) + Bestenliste (wenige Requests)
//   • FULL alle ~5 Min: zusätzlich alle Tipps der Runde (1 Request je Spiel)

import * as vvdb from "@/lib/db";

const BASE = "https://tipp.4ever1.tv/api";
const LITE_THROTTLE = 15000;   // 15 s — Live-Spielstände schnell nachziehen
const FULL_THROTTLE = 300000;  // 5 min
let _lastLite = 0;
let _lastFull = 0;
let _syncing = false;

async function jget(url) {
  const r = await fetch(url, { headers: { accept: "application/json" }, cache: "no-store" });
  if (!r.ok) throw new Error(`${url} -> HTTP ${r.status}`);
  return r.json();
}

async function fetchTips(matches) {
  const ids = (matches || []).map((m) => m && m.id).filter((x) => x != null);
  const tips = [];
  const BATCH = 8;
  for (let i = 0; i < ids.length; i += BATCH) {
    const chunk = ids.slice(i, i + BATCH);
    const results = await Promise.all(
      chunk.map((id) => jget(`${BASE}/matches/${id}/predictions`).catch(() => null))
    );
    results.forEach((pd, j) => {
      const id = chunk[j];
      const preds = (pd && pd.predictions) || [];
      for (const p of preds) {
        if (!p || !p.name) continue;
        tips.push({ extMatchId: id, tipper: p.name, home: p.home, away: p.away, joker: p.joker, points: p.points });
      }
    });
  }
  return tips;
}

// withTips=false → Tipps werden NICHT angefasst (tippImport löscht nur bei tips.length>0).
export async function tipp4ever1Import({ withTips = true } = {}) {
  if (typeof vvdb.tippImport !== "function") throw new Error("tippImport nicht verfügbar.");
  const [teamsD, matchesD, rankingD] = await Promise.all([
    jget(`${BASE}/teams`).catch(() => ({ teams: [] })),
    jget(`${BASE}/matches`).catch(() => ({ matches: [] })),
    jget(`${BASE}/ranking`).catch(() => ({ ranking: [] })),
  ]);
  const teams = teamsD.teams || [];
  const matches = matchesD.matches || [];
  const ranking = rankingD.ranking || [];
  const tips = withTips ? await fetchTips(matches) : [];
  const res = vvdb.tippImport({ teams, matches, ranking, tips });
  // 🔄 Abgleich: Spiele, die 4ever1 entfernt hat (z.B. Test-Spiele), bei uns auch entfernen — sicher.
  try {
    if (matches.length && typeof vvdb.tippSyncPrune === "function") {
      vvdb.tippSyncPrune(matches.map((m) => m && m.id));
    }
  } catch {}
  return res;
}

// Gedrosselter Hintergrund-Sync (fire-and-forget). Blockiert die Antwort NICHT.
export function tippMaybeAutoSync() {
  if (_syncing) return;
  const now = Date.now();
  const doFull = now - _lastFull >= FULL_THROTTLE;
  const doLite = now - _lastLite >= LITE_THROTTLE;
  if (!doFull && !doLite) return;
  _syncing = true;
  _lastLite = now;
  if (doFull) _lastFull = now;
  Promise.resolve()
    .then(() => tipp4ever1Import({ withTips: doFull }))
    .catch(() => {})
    .finally(() => { _syncing = false; });
}
