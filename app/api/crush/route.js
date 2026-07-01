// 💘 Heimlich-verknallt-API — GET: eigene Übersicht · POST: wählen/entfernen
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import * as vvdb from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Bitte einloggen." }, { status: 401 });
  const data = (typeof vvdb.crushOverview === "function")
    ? vvdb.crushOverview(me.id)
    : { picks: [], matches: [], secretAdmirers: 0, max: 5 };
  return NextResponse.json({ ok: true, ...data });
}

export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Bitte einloggen." }, { status: 401 });
  let b = {};
  try { b = await req.json(); } catch {}
  const action = b?.action;
  const username = b?.username;
  if (action === "remove") {
    if (typeof vvdb.crushRemove !== "function") return NextResponse.json({ error: "Nicht verfügbar." }, { status: 500 });
    const r = vvdb.crushRemove(me.id, username);
    if (!r || !r.ok) return NextResponse.json({ error: r?.error || "Fehler." }, { status: 400 });
    return NextResponse.json({ ok: true });
  }
  if (typeof vvdb.crushAdd !== "function") return NextResponse.json({ error: "Nicht verfügbar." }, { status: 500 });
  const r = vvdb.crushAdd(me.id, username);
  if (!r || !r.ok) return NextResponse.json({ error: r?.error || "Fehler." }, { status: 400 });
  return NextResponse.json({ ok: true, matched: !!r.matched, target: r.target });
}
