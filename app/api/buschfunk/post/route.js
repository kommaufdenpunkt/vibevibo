// 📌 Typisierter Buschfunk-Post — Zitat/Gefühl/Erinnerung/etc.
//
// POST { postType, text, image?, mediaUrl?, setStatus? } → { ok, postId, postType }
//
// Optionen:
//   image     — data:image/...;base64,... (max ~700KB nach Compression)
//   mediaUrl  — YouTube/Spotify-Link (wird via parseMediaUrl validiert)
//   setStatus — bool, wenn true & postType=feeling → Mood auf Profil setzen
//
// Sicherheits-Pipeline: Auth → Mute → Burst → Fidolin (Text + Bild) → Insert
// → Bildertool-Queue (für menschliche Sicht-Prüfung durch Mods)

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  addTypedStatusUpdate, notifyMentions, logUserAction, checkBurstSpam,
  updateUser, POST_TYPE_ALLOWED,
} from "@/lib/db";
import { checkTextPost, isMuted } from "@/lib/moderate";
import { moderateImage } from "@/lib/fidolin";
import { parseMediaUrl, serializeMedia } from "@/lib/media";
import { enqueueImageForReview } from "@/lib/imageModeration";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN_LEN = 2;
const MAX_LEN = 280;
const MAX_IMG_BYTES = 900_000;
const IMG_RE = /^data:image\/(png|jpeg|jpg|webp);base64,/;

export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  if (isMuted(me.id)) return NextResponse.json({ error: "Du hast aktuell einen Kommunikationsbann." }, { status: 403 });

  const burst = checkBurstSpam(me.id, "post");
  if (burst.burst) {
    return NextResponse.json({
      error: `⚡ Zu schnell! Du hast in ${Math.round(burst.windowMs / 1000)}s schon ${burst.count} Posts geschrieben. Kurz Luft holen.`,
    }, { status: 429 });
  }

  let body = {};
  try { body = await req.json(); } catch {}
  const postType = String(body?.postType || "free").toLowerCase();
  const text = String(body?.text || "").trim().slice(0, MAX_LEN);
  const rawImage = body?.image ? String(body.image) : "";
  const rawMediaUrl = body?.mediaUrl ? String(body.mediaUrl).slice(0, 400) : "";
  const setStatus = body?.setStatus === true;

  if (!POST_TYPE_ALLOWED.includes(postType)) {
    return NextResponse.json({ error: "Ungültiger Post-Typ." }, { status: 400 });
  }
  if (text.length < MIN_LEN) {
    return NextResponse.json({ error: `Mindestens ${MIN_LEN} Zeichen.` }, { status: 400 });
  }

  // Fidolin Text-Moderation
  const verdict = await checkTextPost(me.id, "buschfunk", text);
  if (!verdict.ok) {
    return NextResponse.json({ error: `Fidolin hat das blockiert: ${verdict.reason}` }, { status: 422 });
  }

  // Bild prüfen
  let storedImage = "";
  let imageNote = "";
  if (rawImage) {
    if (!IMG_RE.test(rawImage) || rawImage.length > MAX_IMG_BYTES) {
      return NextResponse.json({ error: "Ungültiges Bild (PNG/JPG/WEBP, max ~0.9 MB)." }, { status: 400 });
    }
    const v = await moderateImage(rawImage);
    if (v.block) return NextResponse.json({ error: `Fidolin hat das Bild abgelehnt: ${v.reason || "Verstoß"}` }, { status: 422 });
    if (v.undecided) imageNote = "Bild konnte nicht von der KI geprüft werden – nur Text gepostet.";
    else storedImage = rawImage;
  }

  // Media-Link parsen (YouTube/Spotify)
  let mediaJson = "";
  let musicNote = "";
  if (rawMediaUrl) {
    const parsed = parseMediaUrl(rawMediaUrl);
    if (!parsed) musicNote = "Musik-Link nicht erkannt (nur YouTube/Spotify) – ignoriert.";
    else mediaJson = serializeMedia(parsed);
  }

  logUserAction(me.id, "post");

  const result = addTypedStatusUpdate(me.id, postType, text, {
    imageUrl: storedImage,
    mediaJson,
  });
  if (!result?.id) {
    return NextResponse.json({ error: "Konnte nicht gespeichert werden." }, { status: 500 });
  }

  // 🖼 Bildertool-Integration: jedes Buschfunk-Bild geht zusätzlich in die Mod-Queue
  // damit ein Mensch das Bild prüft (Fidolin hat es nur grob durchgewunken).
  // fidolinAuto=false weil Fidolin nicht geblockt hat — Mod sichtet es regulär.
  if (storedImage) {
    try {
      enqueueImageForReview({
        imageUrl: storedImage,
        sourceType: "buschfunk",
        sourceRef: String(result.id),
        uploadedByUserId: me.id,
        fidolinAuto: false,
      });
    } catch (e) {
      // Queue-Fehler darf den Post nicht abbrechen.
      console.error("[buschfunk.post] enqueueImageForReview fehlgeschlagen:", e.message);
    }
  }

  // Mentions
  try { notifyMentions(me.id, text, "status", result.id); } catch {}

  // 🎭 Bei Gefühl-Post + setStatus → auch User-Status (Mood) updaten
  if (postType === "feeling" && setStatus) {
    try { updateUser(me.id, { mood: text.slice(0, 80) }); } catch {}
  }

  return NextResponse.json({
    ok: true,
    postId: result.id,
    postType: result.postType,
    imageNote,
    musicNote,
  });
}
