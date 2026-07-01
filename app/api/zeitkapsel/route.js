// ⏳ Zeitkapsel-API — GET: eigene Kapseln (Text nur nach Ablauf) · POST: neue anlegen
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import * as vvdb from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Bitte einloggen." }, { status: 401 });
  const capsules = (typeof vvdb.zkForUser === "function") ? vvdb.zkForUser(me.id) : [];
  return NextResponse.json({ ok: true, capsules });
}

export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Bitte einloggen." }, { status: 401 });
  if (typeof vvdb.zkCreate !== "function") return NextResponse.json({ error: "Zeitkapsel nicht verfügbar." }, { status: 500 });
  let b = {};
  try { b = await req.json(); } catch {}
  const r = vvdb.zkCreate(me.id, b?.message, b?.deliverAt);
  if (!r || !r.ok) return NextResponse.json({ error: r?.error || "Fehler." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
