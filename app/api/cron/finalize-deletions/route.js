import { NextResponse } from "next/server";
import {
  listAccountsPendingDeletion,
  finalizeAccountDeletion,
} from "@/lib/db";

// 🗑 24h-Lösch-Cron — finalisiert alle Accounts deren Countdown abgelaufen ist.
//
// Aufruf 1× pro Stunde (oder häufiger):
//   curl -H "x-cron-secret: <CRON_SECRET>" https://vibevibo.de/api/cron/finalize-deletions
//
// Antwort: { ok, finalized: [{ id, username }], failed: [...], at }

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  const expected = process.env.CRON_SECRET || "";
  const got = req.headers.get("x-cron-secret") || "";
  if (!expected) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  if (got !== expected) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const pending = listAccountsPendingDeletion() || [];
  const finalized = [];
  const failed = [];

  for (const u of pending) {
    const ok = finalizeAccountDeletion(u.id);
    if (ok) finalized.push({ id: u.id, username: u.username });
    else failed.push({ id: u.id, username: u.username });
  }

  return NextResponse.json({
    ok: true,
    pendingCount: pending.length,
    finalized,
    failed,
    at: new Date().toISOString(),
  });
}
