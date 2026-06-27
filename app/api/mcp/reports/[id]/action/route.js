// POST /api/mcp/reports/:id/action
// Body: { action: "claim" | "release" | "resolve", resolution?: string }
// Pull/Lock-Workflow für mcp_reports.

import { NextResponse } from "next/server";
import { getMcpUser } from "@/lib/modAuth";
import { claimMcpReport, releaseMcpReport, resolveMcpReport } from "@/lib/db";

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
  const action = String(body?.action || "").toLowerCase();
  const resolution = body?.resolution ? String(body.resolution).slice(0, 100) : "erledigt";

  try {
    if (action === "claim") {
      const report = claimMcpReport(reportId, me.id);
      return NextResponse.json({ ok: true, report });
    }
    if (action === "release") {
      const ok = releaseMcpReport(reportId, me.id);
      return NextResponse.json({ ok });
    }
    if (action === "resolve") {
      const report = resolveMcpReport(reportId, me.id, resolution);
      return NextResponse.json({ ok: true, report });
    }
    return NextResponse.json({ error: "Unbekannte action (claim|release|resolve)." }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Aktion fehlgeschlagen." }, { status: 409 });
  }
}
