import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { updateUser, addStatusUpdate, notifyMentions } from "@/lib/db";
import { moderateImage } from "@/lib/fidolin";
import { checkTextPost, isMuted } from "@/lib/moderate";

const MAX_IMG_BYTES = 700_000;
const IMG_RE = /^data:image\/(png|jpeg|jpg|webp);base64,/;

// Status setzen + optional Bild dazu (oeffentlich in den Buschfunk).
export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  if (isMuted(me.id)) return NextResponse.json({ error: "Du hast aktuell einen Kommunikationsbann." }, { status: 403 });

  const body = await req.json();
  const text = String(body.text || "").trim().slice(0, 280);
  const wantsPublic = !!body.public;
  const rawImage = body.image ? String(body.image) : "";

  // Bei freier Posting-Box (oeffentlich) den Text strikt mit Fidolin pruefen.
  // Beim Mood-Setzen ohne Posten (privat) ueberspringen wir die Textpruefung
  // (vorgefertigte Status werden ja nicht von Nutzern getippt).
  if (wantsPublic && text) {
    const verdict = await checkTextPost(me.id, "status", text);
    if (!verdict.ok) {
      return NextResponse.json({ error: `Fidolin hat das blockiert: ${verdict.reason}` }, { status: 422 });
    }
  }

  // Bild moderieren – nur freigegebene Bilder werden gespeichert.
  let imageNote = "";
  let storedImage = "";
  if (rawImage) {
    if (!IMG_RE.test(rawImage) || rawImage.length > MAX_IMG_BYTES) {
      return NextResponse.json({ error: "Ungültiges Bild (PNG/JPG/WEBP, max ~0.7 MB)." }, { status: 400 });
    }
    const v = await moderateImage(rawImage);
    if (v.block) {
      return NextResponse.json({ error: `Fidolin hat das Bild abgelehnt: ${v.reason || "Verstoß"}` }, { status: 422 });
    }
    if (v.undecided) {
      // KI nicht verfuegbar / unsicher -> Bild verwerfen, nur Text posten.
      imageNote = "Bild konnte nicht von der KI geprüft werden – nur Text gepostet.";
    } else {
      storedImage = rawImage;
    }
  }

  // Mood setzen, wenn der Post oeffentlich ist (so wie bisher).
  if (wantsPublic && text) updateUser(me.id, { mood: text });
  // Bei stillem Setzen (vorgefertigt, !public) wie bisher: nur mood schreiben.
  if (!wantsPublic) updateUser(me.id, { mood: text });

  if (wantsPublic && (text || storedImage)) {
    addStatusUpdate(me.id, text, storedImage);
    if (text) notifyMentions(me.id, text, "status", null);
  }

  return NextResponse.json({ ok: true, mood: text, hasImage: !!storedImage, imageNote });
}
