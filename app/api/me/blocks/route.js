// 🚫 Block-API — eigene Blocks verwalten.
// (Nutzt die NATIVEN Block-Helpers aus db.js: addUserBlock / listMyBlocks)
//
// GET    → { blocks, count }
// POST   { username, reason? }   → blockiert + räumt bestehende Friendship auf

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  addUserBlock, listMyBlocks, countMyBlocks, getUserByUsername, db,
} from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanupFriendship(a, b) {
  try {
    db().prepare(`
      DELETE FROM friend_requests
       WHERE (from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?)
    `).run(a, b, b, a);
  } catch {}
}

export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  return NextResponse.json({
    blocks: listMyBlocks(me.id),
    count: countMyBlocks(me.id),
  });
}

export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  let body = {};
  try { body = await req.json(); } catch {}
  const username = String(body?.username || body?.targetUsername || "").trim().toLowerCase();
  const reason = String(body?.reason || "").slice(0, 200);
  if (!username) return NextResponse.json({ error: "Username fehlt" }, { status: 400 });
  const target = getUserByUsername(username);
  if (!target) return NextResponse.json({ error: "User nicht gefunden" }, { status: 404 });
  if (Number(target.id) === Number(me.id)) {
    return NextResponse.json({ error: "Du kannst dich nicht selbst blockieren" }, { status: 400 });
  }
  try {
    const ok = addUserBlock(me.id, target.id, reason);
    if (!ok) return NextResponse.json({ error: "Block fehlgeschlagen" }, { status: 500 });
    cleanupFriendship(me.id, target.id);
    return NextResponse.json({
      ok: true,
      blocks: listMyBlocks(me.id),
      count: countMyBlocks(me.id),
    });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Fehler" }, { status: 400 });
  }
}
