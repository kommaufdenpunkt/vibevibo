// POST /api/tipp/import-4ever1 — holt Teams/Spiele/Ergebnisse/Bestenliste/Tipps
// direkt von tipp.4ever1.tv (öffentliche API) und schreibt sie nach vibevibo.
// Freigabe: Rolle admin/teamleitung/moderator ODER Owner (eyfahrlehrer).

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import * as vvdb from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const BASE = "https://tipp.4ever1.tv/api";
const OWNERS = new Set(["eyfahrlehrer"]);

function isStaff(me) {
  if (!me) return false;
  if (me.username && OWNERS.has(String(me.username).toLowerCase())) return true;
  try { if (typeof vvdb.isAdminRole === "function" && vvdb.isAdminRole(me.id)) return true; } catch {}
  try { if (typeof vvdb.isModeratorRole === "function" && vvdb.isModeratorRole(me.id)) return true; } catch {}
  return false;
}

async function jget(url) {
  const r = await fetch(url, { headers: { accept: "application/json" }, cache: "no-store" });
  if (!r.ok) throw new Error(`${url} -> HTTP ${r.status}`);
  return r.json();
}

export async function POST() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Bitte einloggen." }, { status: 401 });
  if (!isStaff(me)) return NextResponse.json({ error: "Nur für Admin/Teamleitung/Mod." }, { status: 403 });
  if (typeof vvdb.tippImport !== "function") {
    return NextResponse.json({ error: "Import-Funktion nicht verfügbar (Patch nicht aktiv?)." }, { status: 500 });
  }

  try {
    const [teamsD, matchesD, rankingD] = await Promise.all([
      jget(`${BASE}/teams`).catch(() => ({ teams: [] })),
      jget(`${BASE}/matches`).catch(() => ({ matches: [] })),
      jget(`${BASE}/ranking`).catch(() => ({ ranking: [] })),
    ]);
    const teams = teamsD.teams || [];
    const matches = matchesD.matches || [];
    const ranking = rankingD.ranking || [];

    const ids = matches.map((m) => m && m.id).filter((x) => x != null);
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

    const summary = vvdb.tippImport({ teams, matches, ranking, tips });
    return NextResponse.json({ ok: true, ...summary });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Import fehlgeschlagen." }, { status: 500 });
  }
}
