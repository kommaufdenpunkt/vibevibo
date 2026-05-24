import { NextResponse } from "next/server";
import { getUserByUsername, listPhotos, addPhoto, getAlbum } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

const MAX_PHOTO_BYTES = 1_200_000; // ~1.2 MB Base64

export async function GET(req, { params }) {
  const { username } = await params;
  const user = getUserByUsername(username);
  if (!user) return NextResponse.json({ error: "not found" }, { status: 404 });
  const { searchParams } = new URL(req.url);
  const albumId = searchParams.get("album");
  return NextResponse.json({
    photos: listPhotos(user.id, albumId ? Number(albumId) : null),
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
  const id = addPhoto(me.id, albumId ? Number(albumId) : null, dataUrl, String(caption || "").slice(0, 240));
  return NextResponse.json({ id });
}
