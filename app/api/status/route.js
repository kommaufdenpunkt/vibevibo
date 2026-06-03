import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { updateUser, addStatusUpdate, notifyMentions, consumeBuschfunkBoost } from "@/lib/db";
import { moderateImage, moderateAudio } from "@/lib/fidolin";
import { checkTextPost, isMuted } from "@/lib/moderate";
import { STATUS_CATS } from "@/lib/status";
import { parseMediaUrl, serializeMedia } from "@/lib/media";

const MAX_IMG_BYTES   = 700_000;
const MAX_AUDIO_BYTES = 1_200_000;
const IMG_RE   = /^data:image\/(png|jpeg|jpg|webp);base64,/;
const AUDIO_RE = /^data:audio\/(webm|ogg|mp4|mpeg|mp3|wav|x-m4a|m4a);base64,/;

// Anti-Inflation: Allowlist aller vordefinierten Status (Format: "<emoji> <label>").
// Custom-Texte muessen ueber den Shop (custom_status, 50 ✨) gehen.
const STATUS_ALLOWLIST = new Set(
  STATUS_CATS.flatMap((c) => c.items.map(([em, lbl]) => `${em} ${lbl}`))
);

// Status setzen + optional Bild + optional Sprachnachricht + optional Musik-Link.
export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  if (isMuted(me.id)) return NextResponse.json({ error: "Du hast aktuell einen Kommunikationsbann." }, { status: 403 });

  const body = await req.json();
  const text = String(body.text || "").trim().slice(0, 280);
  const wantsPublic = !!body.public;
  const rawImage = body.image ? String(body.image) : "";
  const rawAudio = body.audio ? String(body.audio) : "";
  const musicUrl = body.musicUrl ? String(body.musicUrl) : "";

  // Anti-Inflation: nur leerer Text (=Status entfernen) ODER ein Status aus der
  // Allowlist ist hier ohne Vibes erlaubt. Custom-Text -> /api/premium/buy (custom_status).
  if (text && !STATUS_ALLOWLIST.has(text)) {
    return NextResponse.json({
      error: "Eigener Status-Text kostet 50 ✨ — bitte über /profile/status (Custom-Box) oder den Shop posten.",
    }, { status: 402 });
  }

  if (wantsPublic && text) {
    const verdict = await checkTextPost(me.id, "status", text);
    if (!verdict.ok) {
      return NextResponse.json({ error: `Fidolin hat das blockiert: ${verdict.reason}` }, { status: 422 });
    }
  }

  // Bild moderieren
  let imageNote = "";
  let storedImage = "";
  if (rawImage) {
    if (!IMG_RE.test(rawImage) || rawImage.length > MAX_IMG_BYTES) {
      return NextResponse.json({ error: "Ungültiges Bild (PNG/JPG/WEBP, max ~0.7 MB)." }, { status: 400 });
    }
    const v = await moderateImage(rawImage);
    if (v.block) return NextResponse.json({ error: `Fidolin hat das Bild abgelehnt: ${v.reason || "Verstoß"}` }, { status: 422 });
    if (v.undecided) imageNote = "Bild konnte nicht von der KI geprüft werden – nur Text gepostet.";
    else storedImage = rawImage;
  }

  // Audio moderieren (nur fuer Buschfunk-Posts, also wantsPublic)
  let audioNote = "";
  let storedAudio = "";
  if (rawAudio) {
    if (!AUDIO_RE.test(rawAudio) || rawAudio.length > MAX_AUDIO_BYTES) {
      return NextResponse.json({ error: "Ungültige Audio-Datei (WebM/OGG/MP3/M4A, max ~60 Sek)." }, { status: 400 });
    }
    const v = await moderateAudio(rawAudio);
    if (v.block) return NextResponse.json({ error: `Fidolin hat die Sprachnachricht abgelehnt: ${v.reason || "Verstoß"}` }, { status: 422 });
    if (v.undecided) audioNote = "Audio konnte nicht von der KI geprüft werden – nicht gepostet.";
    else storedAudio = rawAudio;
  }

  // Musik-Link parsen
  let mediaJson = "";
  let musicNote = "";
  if (musicUrl) {
    const parsed = parseMediaUrl(musicUrl);
    if (!parsed) musicNote = "Musik-Link nicht erkannt (nur YouTube/Spotify) – ignoriert.";
    else mediaJson = serializeMedia(parsed);
  }

  // Mood setzen (nur wenn text aus Allowlist oder leer)
  if (wantsPublic && text) updateUser(me.id, { mood: text });
  if (!wantsPublic) updateUser(me.id, { mood: text });

  let boostUsed = false;
  if (wantsPublic && (text || storedImage || storedAudio || mediaJson)) {
    if (body.boost === true) boostUsed = consumeBuschfunkBoost(me.id);
    addStatusUpdate(me.id, text, storedImage, {
      boostedHours: boostUsed ? 24 : 0,
      audioUrl: storedAudio,
      mediaJson,
    });
    if (text) notifyMentions(me.id, text, "status", null);
  }

  return NextResponse.json({
    ok: true, mood: text, hasImage: !!storedImage, hasAudio: !!storedAudio, hasMedia: !!mediaJson,
    imageNote, audioNote, musicNote, boosted: boostUsed,
  });
}
