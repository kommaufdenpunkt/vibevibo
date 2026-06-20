// 🩷 Meine Admirers — Männer die oft auf meine Posts reagieren/kommentieren.
//
// GET → { admirers: [...], minInteractions: 3, womenInitiative: bool }

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { listMyAdmirers, getWomenInitiative } from "@/lib/db";

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
  return NextResponse.json({
    admirers: listMyAdmirers(me.id),
    minInteractions: 3,
    womenInitiative: getWomenInitiative(me.id),
  });
}
