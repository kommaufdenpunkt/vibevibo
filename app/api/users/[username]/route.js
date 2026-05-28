import { NextResponse } from "next/server";
import { getUserByUsername, getPinnwand, getGifts, isOnline, updateUser, getVisitCount, getRecentVisitors } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { sanitizeCustomCss } from "@/lib/sanitizeCss";

export async function GET(_req, { params }) {
  const { username } = await params;
  const user = getUserByUsername(username);
  if (!user) return NextResponse.json({ error: "not found" }, { status: 404 });
  const me = await getSessionUser();
  return NextResponse.json({
    user: { ...user, online: isOnline(user.lastSeen) },
    pinnwand: getPinnwand(user.id, { byUserId: me?.id }),
    gifts: getGifts(user.id),
    visitCount: getVisitCount(user.id),
    visitors: getRecentVisitors(user.id, 6).map((v) => ({ ...v, online: isOnline(v.lastSeen) })),
  });
}

export async function PATCH(req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { username } = await params;
  if (username.toLowerCase() !== me.username) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const patch = {};
  if (typeof body.displayName === "string") patch.displayName = body.displayName.slice(0, 100);
  if (typeof body.emoji === "string") patch.emoji = body.emoji.slice(0, 8);
  if (typeof body.mood === "string") patch.mood = body.mood.slice(0, 120);
  if (typeof body.aboutMe === "string") patch.aboutMe = body.aboutMe.slice(0, 4000);
  if (typeof body.bgMusic === "string") patch.bgMusic = body.bgMusic.slice(0, 200);
  if (typeof body.bgMusicUrl === "string") patch.bgMusicUrl = body.bgMusicUrl.slice(0, 400);
  if (typeof body.customCss === "string") patch.customCss = sanitizeCustomCss(body.customCss);
  // Geschlecht & Geburtsdatum kann der Nutzer NICHT mehr selbst aendern (nur Admin/Moderation).
  if (Array.isArray(body.interests)) {
    patch.interests = body.interests.map((s) => String(s).slice(0, 60)).filter(Boolean).slice(0, 30);
  }
  const updated = updateUser(me.id, patch);
  return NextResponse.json({ user: updated });
}
