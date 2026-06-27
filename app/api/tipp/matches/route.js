// GET /api/tipp/matches → { matches, myBets, me, isAdmin }
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import * as vvdb from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function checkAdmin() {
  try {
    const mod = await import("@/lib/adminAuth");
    if (typeof mod.getAdminUser === "function") {
      const a = await mod.getAdminUser();
      return !!a;
    }
  } catch {}
  return false;
}

export async function GET() {
  const me = await getSessionUser();
  const matches = (typeof vvdb.tippListMatches === "function") ? vvdb.tippListMatches() : [];
  let myBets = [];
  if (me && typeof vvdb.tippUserBets === "function") myBets = vvdb.tippUserBets(me.id);
  const isAdmin = await checkAdmin();
  return NextResponse.json({
    ok: true,
    matches,
    myBets,
    me: me ? { id: me.id, username: me.username } : null,
    isAdmin,
  });
}
