// 💕 Flirt-Modus an/aus (für Swipe-Feature).
// POST { enabled: boolean }

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { setFlirtEnabled } from "@/lib/db";

export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const enabled = body?.enabled !== false;
  const r = setFlirtEnabled(me.id, enabled);
  return NextResponse.json({ ok: true, ...r });
}
