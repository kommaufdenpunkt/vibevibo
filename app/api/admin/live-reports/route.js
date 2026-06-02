import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { listOpenLiveReports, resolveLiveReport, countActiveStrikes } from "@/lib/db";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "admin only" }, { status: 403 });
  const reports = listOpenLiveReports(100).map((r) => ({
    ...r,
    targetStrikeCount: countActiveStrikes(r.targetUserId),
  }));
  return NextResponse.json({ reports });
}

// POST { reportId, action: 'resolved' | 'dismissed' }
export async function POST(req) {
  if (!(await isAdmin())) return NextResponse.json({ error: "admin only" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const reportId = Number(body?.reportId);
  const action = body?.action === "dismissed" ? "dismissed" : "resolved";
  if (!reportId) return NextResponse.json({ error: "reportId fehlt" }, { status: 400 });
  resolveLiveReport(reportId, 0, action);
  return NextResponse.json({ ok: true });
}
