// POST /api/mcp/reports/:id/resolve  — Body: { status?: "resolved" | "dismissed" }
// Meldung als erledigt/abgewiesen markieren.

import { NextResponse } from "next/server";
import { getMcpUser } from "@/lib/modAuth";
import { resolveReport } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req, { params }) {
  const me = await getMcpUser();
  if (!me) return NextResponse.json({ error: "Mod-Login nötig." }, { status: 401 });

  const { id } = await params;
  const reportId = parseInt(id, 10);
  if (!Number.isInteger(reportId) || reportId <= 0) {
    return NextResponse.json({ error: "Ungültige Meldungs-ID." }, { status: 400 });
  }

  let body = {};
  try { body = await req.json(); } catch {}
  const status = body?.status === "dismissed" ? "dismissed" : "resolved";

  try {
    resolveReport(reportId, status);
    return NextResponse.json({ ok: true, reportId, status });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Aktion fehlgeschlagen." }, { status: 400 });
  }
}
