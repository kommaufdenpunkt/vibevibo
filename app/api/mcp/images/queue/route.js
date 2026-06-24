// GET /api/mcp/images/queue?limit=50&offset=0
// Listet pending Bilder + alle Templates + Counts.

import { NextResponse } from "next/server";
import { getMcpUser } from "@/lib/modAuth";
import { listPendingImages, countPendingImages, listRejectionTemplates } from "@/lib/imageModeration";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req) {
  const me = await getMcpUser();
  if (!me) return NextResponse.json({ error: "Mod-Login nötig." }, { status: 401 });

  const url = new URL(req.url);
  const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "50", 10), 1), 200);
  const offset = Math.max(parseInt(url.searchParams.get("offset") || "0", 10), 0);

  const images = listPendingImages({ limit, offset });
  const total = countPendingImages();
  const templates = listRejectionTemplates();

  return NextResponse.json({ ok: true, images, total, templates });
}
