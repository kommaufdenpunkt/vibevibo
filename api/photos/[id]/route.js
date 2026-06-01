import { NextResponse } from "next/server";
import { deletePhoto } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function DELETE(_req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { id } = await params;
  const ok = deletePhoto(Number(id), me.id);
  if (!ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return NextResponse.json({ ok: true });
}
