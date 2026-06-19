import { NextResponse } from "next/server";
import { getMcpUser } from "@/lib/modAuth";
import { setupMcpTotp } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const me = await getMcpUser();
  if (!me) return NextResponse.json({ error: "Mod-Login nötig." }, { status: 401 });
  try {
    const { secret, otpauthUrl } = setupMcpTotp(me.id);
    return NextResponse.json({ ok: true, secret, otpauthUrl });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Fehler" }, { status: 400 });
  }
}
