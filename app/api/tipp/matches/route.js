// GET /api/tipp/matches → { matches (Flaggen + K.o.-Details + importierte Tipps), myBets, me, isAdmin }
// isAdmin = eingeloggter vibevibo-User mit Rolle admin/teamleitung/moderator ODER Owner (eyfahrlehrer).
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import * as vvdb from "@/lib/db";
import { tippMaybeAutoSync } from "@/lib/tipp4ever1";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const OWNERS = new Set(["eyfahrlehrer"]);

function isStaff(me) {
  if (!me) return false;
  if (me.username && OWNERS.has(String(me.username).toLowerCase())) return true;
  try { if (typeof vvdb.isAdminRole === "function" && vvdb.isAdminRole(me.id)) return true; } catch {}
  try { if (typeof vvdb.isModeratorRole === "function" && vvdb.isModeratorRole(me.id)) return true; } catch {}
  return false;
}

export async function GET() {
  const me = await getSessionUser();

  // 🔄 Hintergrund-Sync von 4ever1 anstoßen (gedrosselt, fire-and-forget — blockiert nicht).
  try { tippMaybeAutoSync(); } catch {}

  const matches = (typeof vvdb.tippMatchesRichKO === "function")
    ? vvdb.tippMatchesRichKO()
    : (typeof vvdb.tippMatchesRich === "function")
      ? vvdb.tippMatchesRich()
      : (typeof vvdb.tippListMatches === "function" ? vvdb.tippListMatches() : []);

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
  if (me) {
    if (typeof vvdb.tippUserBetsKO2 === "function") myBets = vvdb.tippUserBetsKO2(me.id);
    else if (typeof vvdb.tippUserBetsKO === "function") myBets = vvdb.tippUserBetsKO(me.id);
    else if (typeof vvdb.tippUserBets === "function") myBets = vvdb.tippUserBets(me.id);
  }

  return NextResponse.json({
    ok: true, matches, myBets,
    me: me ? { id: me.id, username: me.username } : null,
    isAdmin: isStaff(me),
  });
}
