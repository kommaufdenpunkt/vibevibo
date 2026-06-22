// 🩷 Meine Admirers — Männer die oft auf meine Posts reagieren/kommentieren.
//
// GET → { admirers: [...], minInteractions: 3, womenInitiative: bool }

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { listMyAdmirers, getWomenInitiative, blockedUserIdsFor } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  if (me.gender !== "w") {
    return NextResponse.json({
      error: "Dieser Bereich ist nur für weibliche Accounts gedacht.",
    }, { status: 403 });
  }

  const all = listMyAdmirers(me.id);
  // 🚫 Block-Filter: blockierte User nicht als Admirer anzeigen
  const hidden = blockedUserIdsFor(me.id);
  const admirers = hidden.size === 0
    ? all
    : all.filter((a) => !hidden.has(Number(a.id || a.userId || a.user_id)));

  return NextResponse.json({
    admirers,
    minInteractions: 3,
    womenInitiative: getWomenInitiative(me.id),
  });
}
