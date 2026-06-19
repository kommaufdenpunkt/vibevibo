import { NextResponse } from "next/server";
import { getMcpUser } from "@/lib/modAuth";
import { enableMcpTotp } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  const me = await getMcpUser();
  if (!me) return NextResponse.json({ error: "Mod-Login nötig." }, { status: 401 });
  let body = {};
  try { body = await req.json(); } catch {}
  const code = String(body?.code || "").replace(/\D/g, "");
  if (code.length !== 6) {
    return NextResponse.json({ error: "Bitte 6-stelligen Code eingeben." }, { status: 400 });
  }
  try {
    enableMcpTotp(me.id, code);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Code falsch" }, { status: 400 });
  }
}
