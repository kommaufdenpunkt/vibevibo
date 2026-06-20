// 🎵 Einzel-Playlist-Entry — Löschen
//
// DELETE → { ok }

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { removeFromProfilePlaylist, getProfilePlaylist } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(_req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { id } = await params;
  const entryId = Number(id);
  if (!entryId) return NextResponse.json({ error: "invalid id" }, { status: 400 });
  const ok = removeFromProfilePlaylist(me.id, entryId);
  return NextResponse.json({ ok, playlist: getProfilePlaylist(me.id) });
}
