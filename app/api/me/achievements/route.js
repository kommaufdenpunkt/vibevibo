import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import * as DB from "@/lib/db";
import { ACHIEVEMENTS } from "@/lib/achievements";

export const dynamic = "force-dynamic";

// GET = eigene Auszeichnungen + alle verfuegbaren (mit Status)
export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });

  if (typeof DB.listAchievements !== "function") {
    return NextResponse.json({
      error: "Achievements-Helper fehlt — patch-achievements.mjs auf Server ausführen",
    }, { status: 500 });
  }

  const earned = DB.listAchievements(me.id);
  const earnedSet = new Map(earned.map((e) => [e.slug, e]));

  // Liste aller Auszeichnungen mit Status fuer den User
  const all = Object.entries(ACHIEVEMENTS).map(([slug, def]) => {
    const e = earnedSet.get(slug);
    return {
      slug,
      ...def,
      earnedAt: e?.earnedAt || 0,
      claimedAt: e?.claimedAt || 0,
      earned: !!e,
      // Versteckte Auszeichnungen werden nur sichtbar wenn sie verdient wurden
      visible: !def.hidden || !!e,
    };
  });

  const visibleAll = all.filter((a) => a.visible);
  const earnedCount = earned.length;
  const totalCount = visibleAll.length;

  return NextResponse.json({
    achievements: visibleAll,
    stats: { earned: earnedCount, total: totalCount },
  });
}
