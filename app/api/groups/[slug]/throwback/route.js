import { NextResponse } from "next/server";
import * as DB from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET — Throwback-Posts dieser Com (nur wenn Feature freigeschaltet)
export async function GET(_req, { params }) {
  const { slug } = await params;
  const g = DB.getGroup(slug);
  if (!g) return NextResponse.json({ error: "Com nicht gefunden" }, { status: 404 });

  // Feature-Check
  if (typeof DB.isComFeatureUnlocked === "function" && !DB.isComFeatureUnlocked(g.id, "throwback")) {
    return NextResponse.json({ throwbacks: [], locked: true });
  }

  const posts = typeof DB.listComThrowbacks === "function"
    ? DB.listComThrowbacks(g.id, { minAgeDays: 30, limit: 8, preferAnniversary: true })
    : [];
  return NextResponse.json({ throwbacks: posts });
}
