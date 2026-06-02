import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  listTopFriends, pinTopFriend, unpinTopFriend, getUserByUsername,
  TOP_FRIENDS_MAX,
} from "@/lib/db";

// GET ?username=  — Top-5 eines beliebigen Profils. Ohne param: eigene.
export async function GET(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const url = new URL(req.url);
  const username = url.searchParams.get("username");
  let userId = me.id;
  if (username) {
    const u = getUserByUsername(username);
    if (!u) return NextResponse.json({ error: "User nicht gefunden." }, { status: 404 });
    userId = u.id;
  }
  return NextResponse.json({
    friends: listTopFriends(userId),
    max: TOP_FRIENDS_MAX,
    isOwner: userId === me.id,
  });
}

// POST { username, slot }  — eigenen Top-Slot belegen
export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const username = String(body?.username || "");
  const slot = Number(body?.slot || 0);
  if (!username || !slot) return NextResponse.json({ error: "username + slot erforderlich" }, { status: 400 });
  const buddy = getUserByUsername(username);
  if (!buddy) return NextResponse.json({ error: "User nicht gefunden." }, { status: 404 });
  try {
    const friends = pinTopFriend(me.id, buddy.id, slot);
    return NextResponse.json({ ok: true, friends });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

// DELETE ?slot=N
export async function DELETE(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const url = new URL(req.url);
  const slot = Number(url.searchParams.get("slot") || 0);
  if (!slot) return NextResponse.json({ error: "slot erforderlich" }, { status: 400 });
  const friends = unpinTopFriend(me.id, slot);
  return NextResponse.json({ ok: true, friends });
}
