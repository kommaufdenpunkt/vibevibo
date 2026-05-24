import { NextResponse } from "next/server";
import { listGroups, createGroup, getMyGroups } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const me = await getSessionUser();
  return NextResponse.json({
    groups: listGroups(),
    mine: me ? getMyGroups(me.id) : [],
  });
}

export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  try {
    const { slug, name, description, emoji } = await req.json();
    const g = createGroup({ slug, name, description, emoji, ownerId: me.id });
    return NextResponse.json({ group: g });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
