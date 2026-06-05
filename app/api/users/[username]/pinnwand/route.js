import { NextResponse } from "next/server";
import { getUserByUsername, addPinnwand, getPinnwand, addNotification, notifyMentions, awardCredits, userRow, getUserById, bumpXP } from "@/lib/db";
import { EARN } from "@/lib/credits";
import { getSessionUser } from "@/lib/auth";
import { checkTextPost, isMuted } from "@/lib/moderate";
import { moderateImage, moderateAudio } from "@/lib/fidolin";
import { parseMediaUrl, serializeMedia } from "@/lib/media";
import { sendPushToUser } from "@/lib/push";

const MAX_IMG_BYTES   = 700_000;
const MAX_AUDIO_BYTES = 1_200_000; // ~60 Sek Opus/WebM Base64
const IMG_RE   = /^data:image\/(png|jpeg|jpg|webp);base64,/;
const AUDIO_RE = /^data:audio\/(webm|ogg|mp4|mpeg|mp3|wav|x-m4a|m4a);base64,/;

export async function POST(req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  if (isMuted(me.id)) return NextResponse.json({ error: "Du hast aktuell einen Kommunikationsbann und kannst nichts posten." }, { status: 403 });
  const { username } = await params;
  const target = getUserByUsername(username);
  if (!target) return NextResponse.json({ error: "not found" }, { status: 404 });
  const body = await req.json();
  const cleaned  = String(body.text || "").trim().slice(0, 1000);
  const rawImage = body.image ? String(body.image) : "";
  const rawAudio = body.audio ? String(body.audio) : "";
  const musicUrl = body.musicUrl ? String(body.musicUrl) : "";

  if (!cleaned && !rawImage && !rawAudio && !musicUrl) {
    return NextResponse.json({ error: "empty" }, { status: 400 });
  }

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

  let storedAudio = "";
  let audioNote = "";
  if (rawAudio) {
    if (!AUDIO_RE.test(rawAudio) || rawAudio.length > MAX_AUDIO_BYTES) {
      return NextResponse.json({ error: "Ungültige Audio-Datei (WebM/OGG/MP3/M4A, max ~60 Sek)." }, { status: 400 });
    }
    const v = await moderateAudio(rawAudio);
    if (v.block) return NextResponse.json({ error: `Fidolin hat die Sprachnachricht abgelehnt: ${v.reason || "Verstoß"}` }, { status: 422 });
    if (v.undecided) audioNote = "Audio konnte nicht von der KI geprüft werden – nicht gepostet.";
    else storedAudio = rawAudio;
  }

  let mediaJson = "";
  let musicNote = "";
  if (musicUrl) {
    const parsed = parseMediaUrl(musicUrl);
    if (!parsed) musicNote = "Musik-Link nicht erkannt (nur YouTube/Spotify erlaubt) – ignoriert.";
    else mediaJson = serializeMedia(parsed);
  }

  const newId = addPinnwand(target.id, me.id, cleaned, storedImage, storedAudio, mediaJson);
  // Profil-Inhaber benachrichtigen (nicht bei Self-Post) + @-Markierte
  if (target.id !== me.id) {
    const preview = cleaned || (storedAudio ? "🎤 Sprachnachricht" : (storedImage ? "📷 Foto" : (mediaJson ? "🎵 Musik" : "")));
    addNotification({ userId: target.id, actorId: me.id, type: "pinnwand", targetType: "pinnwand", targetId: newId, preview });
    const isGruscheln = /gruschelt/i.test(cleaned);
    awardCredits(me.id, isGruscheln ? EARN.gruscheln_send : EARN.pinnwand_post,
      isGruscheln ? "gruscheln_send" : "pinnwand", { type: "to", id: target.id });
    awardCredits(target.id, isGruscheln ? EARN.gruscheln_recv : EARN.pinnwand_post,
      isGruscheln ? "gruscheln_recv" : "pinnwand", { type: "from", id: me.id });
    try { bumpXP(me.id, "pinnwand_post"); } catch {}
    const sender = userRow(getUserById(me.id));
    sendPushToUser(target.id, {
      title: isGruscheln
        ? `🫶 ${sender?.displayName || me.username} hat dich gegruschelt!`
        : `📌 ${sender?.displayName || me.username} schrieb auf deine Wand`,
      body: preview.slice(0, 140),
      url: `/u/${target.username}`,
      tag: `wall-${me.id}-${target.id}`,
      kind: "message",
      fromUsername: me.username,
      fromDisplayName: sender?.displayName || me.username,
      fromUserId: me.id,
    }).catch(() => {});
  }
  notifyMentions(me.id, cleaned, "pinnwand", newId);

  return NextResponse.json({
    pinnwand: getPinnwand(target.id, { byUserId: me.id }),
    imageNote, audioNote, musicNote,
  });
}
