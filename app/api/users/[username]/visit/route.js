import { NextResponse } from "next/server";
import { getUserByUsername, recordVisit } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { shouldRecordVisit } from "@/lib/privacy";

export async function POST(_req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ ok: false });
  const { username } = await params;
  const target = getUserByUsername(username);
  if (!target) return NextResponse.json({ ok: false });

  // 🛡 Privatsphaere-Check: hide_visits / shield_mode
  if (!shouldRecordVisit(target.id)) {
    return NextResponse.json({ ok: true, hidden: true });
  }

  recordVisit(target.id, me.id);
  return NextResponse.json({ ok: true });
}
