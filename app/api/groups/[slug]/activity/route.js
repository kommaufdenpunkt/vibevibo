import { NextResponse } from "next/server";
import * as DB from "@/lib/db";

export const dynamic = "force-dynamic";

// GET — letzte Aktivitäten in der Com (Threads, Joins, Wall-Posts gemerged)
export async function GET(_req, { params }) {
  const { slug } = await params;
  const g = typeof DB.getComsBySlug === "function" ? DB.getComsBySlug(slug) : null;
  if (!g) return NextResponse.json({ error: "Com nicht gefunden" }, { status: 404 });
  const activity = DB.getComActivity(g.id, { limit: 12 });
  return NextResponse.json({ activity });
}
