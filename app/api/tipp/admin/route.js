// POST /api/tipp/admin → Spiele/Ergebnisse verwalten.
// Freigabe: Owner (eyfahrlehrer) ODER Rolle admin/teamleitung/moderator — gleiche Logik
// wie /api/tipp/matches & /import-4ever1 (getAdminUser greift auf vibevibo.de nicht zuverlässig).
// Body: { action: "create_match" | "set_result" | "delete_match", ... }
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import * as vvdb from "@/lib/db";

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

export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Bitte einloggen." }, { status: 401 });
  if (!isStaff(me)) return NextResponse.json({ error: "Nur für Admin/Owner." }, { status: 403 });

  let b = {};
  try { b = await req.json(); } catch {}
  const action = String(b?.action || "");

  try {
    if (action === "create_match") {
      if (typeof vvdb.tippCreateMatch !== "function") throw new Error("n/a");
      const teamHome = String(b?.teamHome || "").trim();
      const teamAway = String(b?.teamAway || "").trim();
      if (!teamHome || !teamAway) return NextResponse.json({ error: "Beide Teams nötig." }, { status: 400 });
      let kickoffAt = null;
      if (b?.kickoffAt) {
        const t = new Date(b.kickoffAt).getTime();
        if (!isNaN(t)) kickoffAt = t;
      }
      const id = vvdb.tippCreateMatch({ phase: b?.phase || "group", teamHome, teamAway, kickoffAt });
      return NextResponse.json({ ok: true, id });
    }

    if (action === "set_result") {
      const matchId = Number(b?.matchId);
      if (!matchId) return NextResponse.json({ error: "matchId fehlt." }, { status: 400 });
      // Ergebnis ist bei K.o. optional (dort zählen Sieger + Entscheidungsart) — die DB-Funktion prüft je Phase.
      const opts = {
        scoreHome: b?.scoreHome, scoreAway: b?.scoreAway,
        decision: b?.decision,                         // 'reg' | 'aet' | 'pen'
        winner: b?.winner,                             // 'home' | 'away'
        aetHome: b?.aetHome, aetAway: b?.aetAway,
        penHome: b?.penHome, penAway: b?.penAway,
      };
      let ok;
      if (typeof vvdb.tippSetResultKO3 === "function") ok = vvdb.tippSetResultKO3(matchId, opts);
      else if (typeof vvdb.tippSetResultKO2 === "function") ok = vvdb.tippSetResultKO2(matchId, opts);
      else if (typeof vvdb.tippSetResultKO === "function") ok = vvdb.tippSetResultKO(matchId, opts);
      else if (typeof vvdb.tippSetResult === "function") ok = vvdb.tippSetResult(matchId, Number(b?.scoreHome), Number(b?.scoreAway));
      else throw new Error("n/a");
      if (!ok) return NextResponse.json({ error: "Ungültig: Bei K.o. Sieger + Entscheidungsart nötig, bei Gruppe ein Ergebnis." }, { status: 400 });
      return NextResponse.json({ ok: true });
    }

    if (action === "delete_match") {
      if (typeof vvdb.tippDeleteMatch !== "function") throw new Error("n/a");
      const matchId = Number(b?.matchId);
      if (!matchId) return NextResponse.json({ error: "matchId nötig." }, { status: 400 });
      vvdb.tippDeleteMatch(matchId);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unbekannte action." }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Fehler." }, { status: 500 });
  }
}
