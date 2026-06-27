// GET /api/tipp/matches → { matches (mit Flaggen + importierten Tipps), myBets, me, isAdmin }
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import * as vvdb from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function checkAdmin() {
  try {
    const mod = await import("@/lib/adminAuth");
    if (typeof mod.getAdminUser === "function") return !!(await mod.getAdminUser());
  } catch {}
  return false;
}

export async function GET() {
  const me = await getSessionUser();

  const matches = (typeof vvdb.tippMatchesRich === "function")
    ? vvdb.tippMatchesRich()
    : (typeof vvdb.tippListMatches === "function" ? vvdb.tippListMatches() : []);

  // Importierte Tipps pro Spiel anhängen
  const allTips = (typeof vvdb.tippAllImportTips === "function") ? vvdb.tippAllImportTips() : [];
  const byMatch = {};
  for (const t of allTips) {
    if (t.extMatchId == null) continue;
    (byMatch[t.extMatchId] = byMatch[t.extMatchId] || []).push(t);
  }
  for (const m of matches) {
    m.importedTips = (m.extId != null && byMatch[m.extId]) ? byMatch[m.extId] : [];
  }

  let myBets = [];
  if (me && typeof vvdb.tippUserBets === "function") myBets = vvdb.tippUserBets(me.id);

  const isAdmin = await checkAdmin();
  return NextResponse.json({
    ok: true, matches, myBets,
    me: me ? { id: me.id, username: me.username } : null,
    isAdmin,
  });
}
