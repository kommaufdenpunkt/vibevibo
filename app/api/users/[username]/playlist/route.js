// 🎵 Playlist eines anderen Users (öffentlich sichtbar)

import { NextResponse } from "next/server";
import { getUserByUsername, getProfilePlaylist } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req, { params }) {
  const { username } = await params;
  const user = getUserByUsername(username);
  if (!user) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ playlist: getProfilePlaylist(user.id) });
}
