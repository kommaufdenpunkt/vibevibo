import { NextResponse } from "next/server";
import * as DB from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET — Geburtstage der nächsten 7 Tage in dieser Com (Feature-Gate).
export async function GET(_req, { params }) {
  const { slug } = await params;
  const g = DB.getGroup(slug);
  if (!g) return NextResponse.json({ error: "Com nicht gefunden" }, { status: 404 });

  if (typeof DB.isComFeatureUnlocked === "function" && !DB.isComFeatureUnlocked(g.id, "birthday_calendar")) {
    return NextResponse.json({ birthdays: [], locked: true });
  }

  const birthdays = typeof DB.getUpcomingComBirthdays === "function"
    ? DB.getUpcomingComBirthdays(g.id, { daysAhead: 7 })
    : [];
  return NextResponse.json({ birthdays });
}
