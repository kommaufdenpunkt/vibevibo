import { NextResponse } from "next/server";
import { getUserByUsername, addGuestbookEntry, getGuestbookEntries, deleteGuestbookEntry, addNotification, notifyMentions, bumpQuestProgress } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { checkTextPost, isMuted } from "@/lib/moderate";
import { moderateImage } from "@/lib/fidolin";

const MAX_IMG_BYTES = 700_000;
const IMG_RE = /^data:image\/(png|jpeg|jpg|webp);base64,/;

export async function GET(_req, { params }) {
  const { username } = await params;
  const user = getUserByUsername(username);
  if (!user) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ entries: getGuestbookEntries(user.id) });
}

export async function POST(req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  if (isMuted(me.id)) return NextResponse.json({ error: "Du hast aktuell einen Kommunikationsbann." }, { status: 403 });
  const { username } = await params;
  const target = getUserByUsername(username);
  if (!target) return NextResponse.json({ error: "not found" }, { status: 404 });
  const body = await req.json();
  const cleaned = String(body?.text || "").trim().slice(0, 600);
  const rawImage = body?.image ? String(body.image) : "";
  if (!cleaned && !rawImage) return NextResponse.json({ error: "empty" }, { status: 400 });

  if (cleaned) {
    const verdict = await checkTextPost(me.id, "gaestebuch", cleaned);
    if (!verdict.ok) return NextResponse.json({ error: `Fidolin hat das blockiert: ${verdict.reason}` }, { status: 422 });
  }

  let storedImage = "";
  let imageNote = "";
  if (rawImage) {
    if (!IMG_RE.test(rawImage) || rawImage.length > MAX_IMG_BYTES) {
      return NextResponse.json({ error: "Ungültiges Bild (PNG/JPG/WEBP, max ~0.7 MB)." }, { status: 400 });
    }
    const v = await moderateImage(rawImage);
    if (v.block) return NextResponse.json({ error: `Fidolin hat das Bild abgelehnt: ${v.reason || "Verstoß"}` }, { status: 422 });
    if (v.undecided) imageNote = "Bild konnte nicht von der KI geprüft werden – nur Text gesendet.";
    else storedImage = rawImage;
  }
  if (!cleaned && !storedImage) {
    return NextResponse.json({ error: imageNote || "Nichts zu speichern." }, { status: 422 });
  }

  const newId = addGuestbookEntry(target.id, me.id, cleaned, storedImage);
  if (target.id !== me.id) {
    addNotification({ userId: target.id, actorId: me.id, type: "guestbook", targetType: "guestbook", targetId: newId, preview: cleaned || "📷 Bild" });
    try { bumpQuestProgress(me.id, "guestbook"); } catch {}
  }
  notifyMentions(me.id, cleaned, "guestbook", newId);

  return NextResponse.json({ entries: getGuestbookEntries(target.id), imageNote });
}

export async function DELETE(req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "no id" }, { status: 400 });
  const ok = deleteGuestbookEntry(id, me.id);
  if (!ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { username } = await params;
  const target = getUserByUsername(username);
  return NextResponse.json({ entries: target ? getGuestbookEntries(target.id) : [] });
}
