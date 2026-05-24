import { NextResponse } from "next/server";
import { getUserByUsername, recordVisit } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function POST(_req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ ok: false });
  const { username } = await params;
  const target = getUserByUsername(username);
  if (!target) return NextResponse.json({ ok: false });
  recordVisit(target.id, me.id);
  return NextResponse.json({ ok: true });
}
