// POST /api/tipp/admin → Spiele/Ergebnisse verwalten (nur Admin).
// Body: { action: "create_match" | "set_result" | "delete_match", ... }
import { NextResponse } from "next/server";
import * as vvdb from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function requireAdmin() {
  try {
    const mod = await import("@/lib/adminAuth");
    if (typeof mod.getAdminUser === "function") {
      return await mod.getAdminUser();
    }
  } catch {}
  return null;
}

export async function POST(req) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin-Login nötig." }, { status: 401 });

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
      if (typeof vvdb.tippSetResult !== "function") throw new Error("n/a");
      const matchId = Number(b?.matchId);
      const sh = Number(b?.scoreHome), sa = Number(b?.scoreAway);
      if (!matchId || !Number.isInteger(sh) || !Number.isInteger(sa) || sh < 0 || sa < 0) {
        return NextResponse.json({ error: "Ungültiges Ergebnis." }, { status: 400 });
      }
      const ok = vvdb.tippSetResult(matchId, sh, sa);
      if (!ok) return NextResponse.json({ error: "Spiel nicht gefunden." }, { status: 404 });
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
