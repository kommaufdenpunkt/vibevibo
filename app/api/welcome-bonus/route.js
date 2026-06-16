import { NextResponse } from "next/server";
import { ensureBootstrapBonus } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Einmaliger Welcome-Bonus für den ersten registrierten User (= Admin).
// Kein Auth nötig — die Funktion ist idempotent (nur ersten Aufruf wirksam).
// Sicher weil: kann nur einmal jemals 10000 ✨ vergeben, und immer an User_id=1.
//
// Aufruf:
//   curl -X POST https://vibevibo.de/api/welcome-bonus
//   oder einfach im Browser GET auf /api/welcome-bonus
export async function POST() {
  try {
    const r = ensureBootstrapBonus({ amount: 10000 });
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET() {
  // Auch GET damit man's einfach im Browser aufrufen kann
  try {
    const r = ensureBootstrapBonus({ amount: 10000 });
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
