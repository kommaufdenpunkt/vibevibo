import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { claimQuest } from "@/lib/db";

// POST { id }
export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  try {
    const r = claimQuest(me.id, Number(body?.id));
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
