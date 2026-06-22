// 👥 Members-Browse API — öffentliche Mitglieder-Liste.
//
// GET ?q=...&filter=all|online|new|vip|birthday&page=1
//   → { members, total, page, pageSize, hasMore }

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { listMembersForBrowse } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

export async function GET(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });

  const url = new URL(req.url);
  const q = url.searchParams.get("q") || "";
  const filter = url.searchParams.get("filter") || "all";
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const offset = (page - 1) * PAGE_SIZE;

  const { rows, total } = listMembersForBrowse({
    meId: me.id, q, filter, limit: PAGE_SIZE, offset,
  });

  return NextResponse.json({
    members: rows,
    total,
    page,
    pageSize: PAGE_SIZE,
    hasMore: offset + rows.length < total,
  });
}
