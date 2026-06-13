import { NextResponse } from "next/server";
import { runFidolinEconomyCheck } from "@/lib/economy";

// 🤖 Fidolin-Wirtschafts-Check via Cron — pingst du z.B. 1× pro Tag.
//
// Aufruf:
//   curl -H "x-cron-secret: <CRON_SECRET>" https://vibevibo.de/api/cron/fidolin-economy
//
// CRON_SECRET muss als ENV in Coolify gesetzt sein, sonst 401.
export async function GET(req) {
  const expected = process.env.CRON_SECRET || "";
  const got = req.headers.get("x-cron-secret") || "";
  if (!expected) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  if (got !== expected) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const result = runFidolinEconomyCheck("fidolin-cron");
  return NextResponse.json({ ok: true, result, at: new Date().toISOString() });
}
