// GET /api/admin/broadcast/list — letzte Broadcasts mit Stats. Admin-only.

import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/adminAuth";
import { listRecentBroadcasts } from "@/lib/broadcast";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const me = await getAdminUser();
  if (!me) {
    return NextResponse.json({ error: "Admin-Login nötig." }, { status: 401 });
  }
  const broadcasts = listRecentBroadcasts({ limit: 100 });
  return NextResponse.json({ ok: true, broadcasts });
}
