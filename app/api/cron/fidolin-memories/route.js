// 🎀 Fidolin-Erinnerungs-Cron — postet höchstens 1 nostalgische Erinnerung pro Tag.
//
// Aufruf 1× pro Stunde (oder häufiger — wir entdoppeln über last_posted_at):
//   curl -H "x-cron-secret: $CRON_SECRET" https://vibevibo.de/api/cron/fidolin-memories
//
// Antwort: { ok, seeded, posted: { id, text }? | null, at }

import { NextResponse } from "next/server";
import {
  ensureFidolinUser,
  seedFidolinMemoriesIfEmpty,
  listMemoriesDueToday,
  postFidolinMemory,
} from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  const expected = process.env.CRON_SECRET || "";
  const got = req.headers.get("x-cron-secret") || "";
  if (!expected) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  if (got !== expected) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // 1) Fidolin-User sicherstellen
  const fidolinId = ensureFidolinUser();
  if (!fidolinId) {
    return NextResponse.json({ error: "Fidolin-User konnte nicht angelegt werden" }, { status: 500 });
  }

  // 2) Catalog seeden falls leer (nur erstmaliger Lauf)
  const seeded = seedFidolinMemoriesIfEmpty();

  // 3) Fällige Erinnerungen — wir posten max. 1 pro Tag (das erste in der Sortier-Reihenfolge)
  const due = listMemoriesDueToday();
  if (due.length === 0) {
    return NextResponse.json({
      ok: true, seeded, posted: null,
      fidolinUserId: fidolinId, dueCount: 0,
      at: new Date().toISOString(),
    });
  }

  const winner = due[0];
  const result = postFidolinMemory(winner.id);

  return NextResponse.json({
    ok: true, seeded,
    posted: result.ok ? { id: winner.id, postId: result.postId, text: result.text } : null,
    error: result.ok ? undefined : result.error,
    fidolinUserId: fidolinId,
    dueCount: due.length,
    skippedCount: Math.max(0, due.length - 1),
    at: new Date().toISOString(),
  });
}
