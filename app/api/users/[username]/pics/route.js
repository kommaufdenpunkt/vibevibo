import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getUserByUsername, listProfilePics, addProfilePic, countProfilePics, getUserPicSlots, logMod } from "@/lib/db";
import { moderateImage } from "@/lib/fidolin";

const MAX_BYTES = 700_000;

export async function GET(req, { params }) {
  const { username } = await params;
  const target = getUserByUsername(username);
  if (!target) return NextResponse.json({ error: "not found" }, { status: 404 });
  const me = await getSessionUser();
  const owner = !!(me && me.username === target.username);
  const pics = listProfilePics(target.id, { approvedOnly: !owner });
  return NextResponse.json({ pics, max: getUserPicSlots(target.id), owner });
}

export async function POST(req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { username } = await params;
  if (username.toLowerCase() !== me.username) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const slots = getUserPicSlots(me.id);
  if (countProfilePics(me.id) >= slots) {
    return NextResponse.json({ error: `Maximal ${slots} Profilbilder. Kauf mehr Slots im Premium-Shop!` }, { status: 400 });
  }

  const { image } = await req.json();
  const s = String(image || "");
  if (!/^data:image\/(png|jpeg|jpg|webp);base64,/.test(s)) {
    return NextResponse.json({ error: "Ungültiges Bildformat (PNG/JPG/WEBP)." }, { status: 400 });
  }
  if (s.length > MAX_BYTES) return NextResponse.json({ error: "Bild zu groß." }, { status: 413 });

  const verdict = await moderateImage(s);
  let status, reason;
  if (verdict.block) { status = "rejected"; reason = verdict.reason || "Von Fidolin abgelehnt."; }
  else if (verdict.undecided) { status = "pending"; reason = verdict.reason || "Wartet auf Prüfung."; }
  else { status = "approved"; reason = ""; }

  const id = addProfilePic(me.id, s, status, reason);
  logMod({ userId: me.id, kind: "avatar", decision: status, reason: reason || "Profilbild geprüft", by: verdict.by || "fidolin" });
  return NextResponse.json({ id, status, reason });
}
