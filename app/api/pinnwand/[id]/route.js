import { NextResponse } from "next/server";
import { deletePinnwandEntry } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function DELETE(_req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { id } = await params;
  const ok = deletePinnwandEntry(Number(id), me.id);
  if (!ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return NextResponse.json({ ok: true });
}
