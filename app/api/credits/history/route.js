import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { listCreditTx, countCreditTx, getUsernameById } from "@/lib/db";

// GET /api/credits/history?limit=50&offset=0
// Vollständiger Vibes-Verlauf, angereichert mit Referenz-Namen
export async function GET(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const limit = Math.min(100, Math.max(10, Number(searchParams.get("limit")) || 50));
  const offset = Math.max(0, Number(searchParams.get("offset")) || 0);
  const raw = listCreditTx(me.id, limit, offset);

  // Anreichern: bei ref_type=to/from die Username auflösen
  const items = raw.map((tx) => {
    let refUsername = null;
    if (tx.refId && (tx.refType === "to" || tx.refType === "from" || tx.refType === "user")) {
      refUsername = getUsernameById(tx.refId);
    }
    return { ...tx, refUsername };
  });

  return NextResponse.json({
    items,
    total: countCreditTx(me.id),
    limit, offset,
  });
}
