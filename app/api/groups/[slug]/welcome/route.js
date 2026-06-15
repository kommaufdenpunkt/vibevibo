import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import * as DB from "@/lib/db";

export const dynamic = "force-dynamic";

// PATCH { text } — Owner setzt Willkommens-Post
export async function PATCH(req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { slug } = await params;
  const g = typeof DB.getComsBySlug === "function" ? DB.getComsBySlug(slug) : null;
  if (!g) return NextResponse.json({ error: "Com nicht gefunden" }, { status: 404 });
  const myRole = DB.getComsRole(g.id, me.id);
  if (myRole !== "owner") {
    return NextResponse.json({ error: "Nur der Owner kann den Willkommens-Post setzen." }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  try {
    DB.setComWelcomePost(g.id, body.text || "");
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
