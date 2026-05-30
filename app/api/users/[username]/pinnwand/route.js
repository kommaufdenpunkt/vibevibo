import { NextResponse } from "next/server";
import { getUserByUsername, addPinnwand, getPinnwand, addNotification, notifyMentions, awardCredits } from "@/lib/db";
import { EARN } from "@/lib/credits";
import { getSessionUser } from "@/lib/auth";
import { checkTextPost, isMuted } from "@/lib/moderate";
import { moderateImage } from "@/lib/fidolin";

const MAX_IMG_BYTES = 700_000;
const IMG_RE = /^data:image\/(png|jpeg|jpg|webp);base64,/;

export async function POST(req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  if (isMuted(me.id)) return NextResponse.json({ error: "Du hast aktuell einen Kommunikationsbann und kannst nichts posten." }, { status: 403 });
  const { username } = await params;
  const target = getUserByUsername(username);
  if (!target) return NextResponse.json({ error: "not found" }, { status: 404 });
  const body = await req.json();
  const cleaned = String(body.text || "").trim().slice(0, 1000);
  const rawImage = body.image ? String(body.image) : "";
  if (!cleaned && !rawImage) return NextResponse.json({ error: "empty" }, { status: 400 });

  if (cleaned) {
    const verdict = await checkTextPost(me.id, "pinnwand", cleaned);
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
    if (v.undecided) imageNote = "Bild konnte nicht von der KI geprüft werden – nur Text gepostet.";
    else storedImage = rawImage;
  }

  const newId = addPinnwand(target.id, me.id, cleaned, storedImage);
  // Profil-Inhaber benachrichtigen (nicht bei Self-Post) + @-Markierte
  if (target.id !== me.id) {
    addNotification({ userId: target.id, actorId: me.id, type: "pinnwand", targetType: "pinnwand", targetId: newId, preview: cleaned || "📷 Foto" });
    // Credits für aktive Community-Beiträge
    // Anti-Multi-Account-Farming: ref ist der GEGENPART. Damit zählt der SAME_REF
    // Cooldown korrekt → max 1x Vibes pro Person und Tag, egal wie viele Posts.
    const isGruscheln = /gruschelt/i.test(cleaned);
    awardCredits(me.id, isGruscheln ? EARN.gruscheln_send : EARN.pinnwand_post,
      isGruscheln ? "gruscheln_send" : "pinnwand", { type: "to", id: target.id });
    awardCredits(target.id, isGruscheln ? EARN.gruscheln_recv : EARN.pinnwand_post,
      isGruscheln ? "gruscheln_recv" : "pinnwand", { type: "from", id: me.id });
  }
  notifyMentions(me.id, cleaned, "pinnwand", newId);

  return NextResponse.json({
    pinnwand: getPinnwand(target.id, { byUserId: me.id }),
    imageNote,
  });
}
