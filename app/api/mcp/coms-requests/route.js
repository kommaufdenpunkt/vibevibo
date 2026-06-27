// GET /api/mcp/coms-requests?limit=50
// Liste aller offenen Coms-Namens-Anträge — für das Mod-Tool.

import { NextResponse } from "next/server";
import { getMcpUser } from "@/lib/modAuth";
import { listPendingComRequests, countPendingComRequests } from "@/lib/comChangeRequests";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req) {
  const me = await getMcpUser();
  if (!me) return NextResponse.json({ error: "Mod-Login nötig." }, { status: 401 });

  const url = new URL(req.url);
  const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "50", 10), 1), 200);

  try {
    const requests = listPendingComRequests({ limit });
    const total = countPendingComRequests();
    return NextResponse.json({ ok: true, requests, total });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Fehler beim Laden." }, { status: 500 });
  }
}
