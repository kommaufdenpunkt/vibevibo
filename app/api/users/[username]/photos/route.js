import { NextResponse } from "next/server";
import { getUserByUsername, listPhotos, addPhoto, getAlbum, logMod } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { moderateImage } from "@/lib/fidolin";
import { enqueueImageForReview, rejectImage } from "@/lib/imageModeration";

const MAX_PHOTO_BYTES = 1_200_000; // ~1.2 MB Base64

export async function GET(req, { params }) {
  const { username } = await params;
  const user = getUserByUsername(username);
  if (!user) return NextResponse.json({ error: "not found" }, { status: 404 });
  const me = await getSessionUser();
  const owner = !!(me && me.username === user.username);
  const { searchParams } = new URL(req.url);
  const albumId = searchParams.get("album");
  return NextResponse.json({
    // Besucher sehen nur freigegebene Fotos; der Eigentümer sieht alle (mit Status)
    photos: listPhotos(user.id, albumId ? Number(albumId) : null, { approvedOnly: !owner }),
    owner,
  });
}

export async function POST(req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { username } = await params;
  if (username.toLowerCase() !== me.username) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { dataUrl, caption, albumId } = await req.json();
  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/")) {
    return NextResponse.json({ error: "invalid image" }, { status: 400 });
  }
  if (dataUrl.length > MAX_PHOTO_BYTES) {
    return NextResponse.json({ error: "image too large (max ~1MB)" }, { status: 413 });
  }
  if (albumId) {
    const a = getAlbum(Number(albumId));
    if (!a || a.user_id !== me.id) return NextResponse.json({ error: "album not yours" }, { status: 403 });
  }

  // Fidolin prüft jedes Foto
  const verdict = await moderateImage(dataUrl);
  let status, reason;
  if (verdict.block) { status = "rejected"; reason = verdict.reason || "Von Fidolin abgelehnt."; }
  else if (verdict.undecided) { status = "pending"; reason = verdict.reason || "Wartet auf Prüfung."; }
  else { status = "approved"; reason = ""; }

  const id = addPhoto(me.id, albumId ? Number(albumId) : null, dataUrl, String(caption || "").slice(0, 240), status, reason);
  logMod({ userId: me.id, kind: "foto", decision: status, reason: reason || "Foto geprüft", by: verdict.by || "fidolin" });

  // 🖼 Bildertool-Integration: jedes Foto wandert in die Mod-Queue.
  // → Wenn Fidolin schon geblockt hat: direkt als rejected eintragen +
  //   orange System-DM an den User mit Begründung.
  // → Sonst: pending, Mod sichtet im Bildertool-Feed.
  try {
    const queueId = enqueueImageForReview({
      imageUrl: dataUrl,
      sourceType: "profile",
      sourceRef: String(id),
      uploadedByUserId: me.id,
      fidolinAuto: status === "rejected",
    });
    if (status === "rejected") {
      try {
        rejectImage({
          queueId,
          modId: 0, // 0 = automatisch durch Fidolin (System)
          reasonCode: "inappropriate",
          customReasonText: reason,
        });
      } catch (e) {
        console.error("[photos.upload] auto-reject queue entry fehlgeschlagen:", e.message);
      }
    }
  } catch (e) {
    // Queue-Fehler darf den Upload niemals abbrechen.
    console.error("[photos.upload] enqueueImageForReview fehlgeschlagen:", e.message);
  }

  return NextResponse.json({ id, status, reason });
}
