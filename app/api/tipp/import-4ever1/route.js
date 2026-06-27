// POST /api/tipp/import-4ever1 — holt Teams/Spiele/Ergebnisse/Bestenliste/Tipps
// direkt von tipp.4ever1.tv (öffentliche API) und schreibt sie nach vibevibo.
// Nur Admin. Kein Login bei 4ever1 nötig (predictions sind öffentlich).

import { NextResponse } from "next/server";
import * as vvdb from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const BASE = "https://tipp.4ever1.tv/api";

async function requireAdmin() {
  try {
    const mod = await import("@/lib/adminAuth");
    if (typeof mod.getAdminUser === "function") return await mod.getAdminUser();
  } catch {}
  return null;
}

async function jget(url) {
  const r = await fetch(url, { headers: { accept: "application/json" }, cache: "no-store" });
  if (!r.ok) throw new Error(`${url} -> HTTP ${r.status}`);
  return r.json();
}

export async function POST() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin-Login nötig." }, { status: 401 });
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

    // Tipps pro Spiel (öffentlich) — in Batches ziehen.
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
