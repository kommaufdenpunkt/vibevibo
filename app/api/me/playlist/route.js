// 🎵 Meine Profil-Playlist
//
// GET  → { playlist: [...], max: 5 }
// POST { musicUrl, title? } → fügt hinzu

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getProfilePlaylist, addToProfilePlaylist } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX = 5;

export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  return NextResponse.json({ playlist: getProfilePlaylist(me.id), max: MAX });
}

export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  let body = {};
  try { body = await req.json(); } catch {}
  try {
    const id = addToProfilePlaylist(me.id, {
      musicUrl: body?.musicUrl || "",
      title: body?.title || "",
    });
    return NextResponse.json({ ok: true, id, playlist: getProfilePlaylist(me.id) });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
