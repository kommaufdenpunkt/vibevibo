// 🗑 Account-Lösch-Endpunkt — User startet/bricht 24h Countdown ab.

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  requestAccountDeletion, cancelAccountDeletion, getDeletionStatus,
} from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth" }, { status: 401 });
  return NextResponse.json(getDeletionStatus(me.id));
}

// POST { action: "request" | "cancel" }
export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth" }, { status: 401 });
  let body = {};
  try { body = await req.json(); } catch {}
  const action = String(body?.action || "");
  try {
    if (action === "request") {
      const r = requestAccountDeletion(me.id);
      return NextResponse.json({ ok: true, ...r });
    }
    if (action === "cancel") {
      cancelAccountDeletion(me.id);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Unbekannte Action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Fehler" }, { status: 400 });
  }
}
