// GET /api/mcp/reports — offene Nachrichten-Meldungen (🚩) fürs Mod-Tool.

import { NextResponse } from "next/server";
import { getMcpUser } from "@/lib/modAuth";
import { listOpenReports, countOpenReports, getReportSnippet } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const me = await getMcpUser();
  if (!me) return NextResponse.json({ error: "Mod-Login nötig." }, { status: 401 });

  try {
    const rows = listOpenReports(80) || [];
    // Snippet (Kontext rund um die gemeldete Nachricht) defensiv dazu holen.
    const reports = rows.map((r) => {
      let snippet = null;
      try {
        if (r.message_id != null && typeof getReportSnippet === "function") {
          snippet = getReportSnippet(r.message_id, 4);
        }
      } catch {}
      return { ...r, snippet };
    });
    return NextResponse.json({ ok: true, reports, total: countOpenReports() });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Fehler beim Laden." }, { status: 500 });
  }
}
