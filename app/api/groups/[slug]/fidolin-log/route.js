import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import * as DB from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET — Fidolin-Log nur für Officer/Owner
export async function GET(_req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { slug } = await params;
  const g = DB.getComsBySlug(slug);
  if (!g) return NextResponse.json({ error: "Com nicht gefunden" }, { status: 404 });
  const myRole = DB.getComsRole(g.id, me.id);
  if (myRole !== "owner" && myRole !== "mod") {
    return NextResponse.json({ error: "Nur Officer/Owner können das Fidolin-Log sehen." }, { status: 403 });
  }
  const log = DB.listFidolinLog(g.id, { limit: 100 });
  return NextResponse.json({ log });
}
