// GET  /api/tipp/podium → { teams, podium (eigener Tipp), board (alle, öffentlich) }
// POST /api/tipp/podium → { champion, second, third } speichern (eingeloggt)
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import * as vvdb from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const me = await getSessionUser();
  const teams = (typeof vvdb.tippTeamsList === "function") ? vvdb.tippTeamsList() : [];
  const board = (typeof vvdb.tippPodiumBoard === "function") ? vvdb.tippPodiumBoard() : [];
  let podium = null;
  if (me && typeof vvdb.tippGetPodium === "function") podium = vvdb.tippGetPodium(me.id);
  return NextResponse.json({
    ok: true, teams, podium, board,
    me: me ? { id: me.id, username: me.username } : null,
  });
}

export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Bitte einloggen." }, { status: 401 });
  if (typeof vvdb.tippSetPodium !== "function") {
    return NextResponse.json({ error: "Podium-Funktion nicht verfügbar." }, { status: 500 });
  }
  let b = {};
  try { b = await req.json(); } catch {}
  const r = vvdb.tippSetPodium(me.id, { champion: b?.champion, second: b?.second, third: b?.third });
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
