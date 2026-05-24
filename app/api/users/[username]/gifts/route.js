import { NextResponse } from "next/server";
import { getUserByUsername, addGift, getGifts } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { findGift } from "@/lib/gifts";

export async function POST(req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { username } = await params;
  const target = getUserByUsername(username);
  if (!target) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (target.id === me.id) return NextResponse.json({ error: "self gift" }, { status: 400 });
  const { giftId } = await req.json();
  if (!findGift(giftId)) return NextResponse.json({ error: "unknown gift" }, { status: 400 });
  addGift(target.id, me.id, giftId);
  return NextResponse.json({ gifts: getGifts(target.id) });
}
