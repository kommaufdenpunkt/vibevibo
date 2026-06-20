import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { hideCompliment, unhideCompliment } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST { action: "hide" | "unhide" } — nur Empfänger darf
export async function POST(req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth" }, { status: 401 });
  const { id } = await params;
  let body = {};
  try { body = await req.json(); } catch {}
  try {
    if (body?.action === "unhide") unhideCompliment(Number(id), me.id);
    else hideCompliment(Number(id), me.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Fehler" }, { status: 400 });
  }
}
