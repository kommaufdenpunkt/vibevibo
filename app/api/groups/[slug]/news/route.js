import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import * as DB from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET — News-Liste. Versteckt Fidolin-hidden für normale Member.
export async function GET(_req, { params }) {
  const me = await getSessionUser();
  const { slug } = await params;
  const g = DB.getComsBySlug(slug);
  if (!g) return NextResponse.json({ error: "Com nicht gefunden" }, { status: 404 });
  const myRole = me ? DB.getComsRole(g.id, me.id) : null;
  const isMod = myRole === "owner" || myRole === "mod";

  let news = DB.listComNews(g.id, { limit: 20 });
  // Hidden-Posts nur für Officer/Owner sichtbar
  if (!isMod) {
    news = news.filter((n) => n.fidolinAction !== "hide");
  }
  // Hint-Markierungen nur für Officer/Owner ausgeben
  news = news.map((n) => {
    if (!isMod && (n.fidolinAction === "hint" || n.fidolinAction === "mark")) {
      return { ...n, fidolinAction: "none", fidolinScore: 0 };
    }
    return n;
  });

  return NextResponse.json({ news, isMod });
}
