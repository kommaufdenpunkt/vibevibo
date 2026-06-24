// GET /api/mcp/images/queue?limit=50&offset=0&tab=pending|auto_rejects
// Pending: Mod-Queue.
// auto_rejects: Bilder die Fidolin direkt geblockt hat (zur Sichtkontrolle / Override).

import { NextResponse } from "next/server";
import { getMcpUser } from "@/lib/modAuth";
import {
  listPendingImages, countPendingImages, listRejectionTemplates,
  listFidolinAutoRejects, countFidolinAutoRejects,
} from "@/lib/imageModeration";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req) {
  const me = await getMcpUser();
  if (!me) return NextResponse.json({ error: "Mod-Login nötig." }, { status: 401 });

  const url = new URL(req.url);
  const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "50", 10), 1), 200);
  const offset = Math.max(parseInt(url.searchParams.get("offset") || "0", 10), 0);
  const tab = String(url.searchParams.get("tab") || "pending").toLowerCase();

  const templates = listRejectionTemplates();
  const pendingTotal = countPendingImages();
  const autoRejectTotal = countFidolinAutoRejects();

  if (tab === "auto_rejects") {
    const entries = listFidolinAutoRejects({ limit, offset });
    return NextResponse.json({
      ok: true, tab, entries, templates,
      total: autoRejectTotal,
      counts: { pending: pendingTotal, autoRejects: autoRejectTotal },
    });
  }

  // default: pending
  const images = listPendingImages({ limit, offset });
  return NextResponse.json({
    ok: true, tab: "pending", images, templates,
    total: pendingTotal,
    counts: { pending: pendingTotal, autoRejects: autoRejectTotal },
  });
}
