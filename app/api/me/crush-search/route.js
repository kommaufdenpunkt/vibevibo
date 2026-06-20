// 💕 User-Suche speziell für den Crush-Picker.
// Filtert: mich selbst, gelöschte/gebannte, vergeben/verheiratet/verlobt,
// User die ich schon als Crush habe.
//
// GET ?q=tobi → { results: [{ id, username, displayName, avatarUrl, ... }] }

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { searchCrushCandidates } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const url = new URL(req.url);
  const q = url.searchParams.get("q") || "";
  const results = searchCrushCandidates(me.id, q, 12);
  return NextResponse.json({ results });
}
