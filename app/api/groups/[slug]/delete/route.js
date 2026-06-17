import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import * as DB from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// POST — Owner löscht seine eigene Com komplett.
export async function POST(_req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { slug } = await params;
  const g = DB.getComsBySlug ? DB.getComsBySlug(slug) : DB.getGroup(slug);
  if (!g) return NextResponse.json({ error: "Com nicht gefunden" }, { status: 404 });

  const myRole = DB.getComsRole(g.id, me.id);
  if (myRole !== "owner") {
    return NextResponse.json({ error: "Nur der Owner kann die Com löschen." }, { status: 403 });
  }

  if (typeof DB.deleteComCompletely !== "function") {
    return NextResponse.json({ error: "Delete-Funktion nicht verfügbar (patch-com-delete fehlt)" }, { status: 503 });
  }

  try {
    const r = DB.deleteComCompletely(g.id, { ownerId: me.id });
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
