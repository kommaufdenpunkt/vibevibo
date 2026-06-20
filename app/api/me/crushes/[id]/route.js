// 💕 Einzelnen Crush-Slot löschen
//
// DELETE → { ok }

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { removeSecretCrush } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(_req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { id } = await params;
  const crushId = Number(id);
  if (!crushId) return NextResponse.json({ error: "invalid id" }, { status: 400 });
  const ok = removeSecretCrush(me.id, crushId);
  if (!ok) return NextResponse.json({ error: "not found or forbidden" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
