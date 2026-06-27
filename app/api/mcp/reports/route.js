// GET /api/mcp/reports — kategorisierte Meldungen (mcp_reports) fürs Mod-Tool.
// Liefert offene + die vom aktuellen Mod übernommenen ("meine"), zusammengeführt.
// Kategorien & Zähler berechnet der Client aus dieser Liste.

import { NextResponse } from "next/server";
import { getMcpUser } from "@/lib/modAuth";
import { listMcpReports } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const me = await getMcpUser();
  if (!me) return NextResponse.json({ error: "Mod-Login nötig." }, { status: 401 });

  try {
    const open = listMcpReports({ status: "open", limit: 200 }) || [];
    const mine = listMcpReports({ status: "mine", byModId: me.id, limit: 200 }) || [];
    const map = new Map();
    for (const r of [...mine, ...open]) map.set(r.id, r); // mine zuerst, open ergänzt
    const reports = [...map.values()].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return NextResponse.json({ ok: true, reports, meId: me.id });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Fehler beim Laden." }, { status: 500 });
  }
}
