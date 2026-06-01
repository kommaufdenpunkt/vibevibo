import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { deleteProfilePic, setPrimaryPic } from "@/lib/db";

export async function DELETE(_req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { id } = await params;
  const ok = deleteProfilePic(Number(id), me.id);
  if (!ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  if (body.primary) {
    const ok = setPrimaryPic(Number(id), me.id);
    if (!ok) return NextResponse.json({ error: "nur freigegebene Bilder können Hauptbild werden" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
