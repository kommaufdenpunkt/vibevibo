import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import * as DB from "@/lib/db";
import { COM_FEATURES, COM_FEATURE_CATEGORIES } from "@/lib/comFeatures";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET — Katalog + Freischaltungen + Member-Count für eine Com
export async function GET(_req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { slug } = await params;
  const g = DB.getGroup(slug);
  if (!g) return NextResponse.json({ error: "Com nicht gefunden" }, { status: 404 });

  const myRole = DB.getComsRole(g.id, me.id);
  const unlocked = typeof DB.listComUnlocks === "function" ? DB.listComUnlocks(g.id) : [];
  const memberCount = DB.getGroupMembers(g.id).length;

  // Owner-Vibes-Stand nur an Owner zurückgeben
  let myBalance = null;
  if (myRole === "owner") {
    try {
      const c = DB.getCredits(me.id);
      myBalance = c?.balance || 0;
    } catch {}
  }

  return NextResponse.json({
    catalog: COM_FEATURES,
    categories: COM_FEATURE_CATEGORIES,
    unlocked,
    memberCount,
    myRole,
    myBalance,
    ownerId: g.owner_id,
  });
}
