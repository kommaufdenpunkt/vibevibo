import { NextResponse } from "next/server";
import { getUserByUsername, listAlbums, createAlbum } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET(_req, { params }) {
  const { username } = await params;
  const user = getUserByUsername(username);
  if (!user) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ albums: listAlbums(user.id) });
}

export async function POST(req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { username } = await params;
  if (username.toLowerCase() !== me.username) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { name } = await req.json();
  const cleaned = String(name || "").trim().slice(0, 80);
  if (!cleaned) return NextResponse.json({ error: "name required" }, { status: 400 });
  const id = createAlbum(me.id, cleaned);
  return NextResponse.json({ albums: listAlbums(me.id), createdId: id });
}
