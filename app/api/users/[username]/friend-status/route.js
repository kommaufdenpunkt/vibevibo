import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getUserByUsername, friendRequestStatus } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { username } = await params;
  const target = getUserByUsername(String(username).toLowerCase());
  if (!target) return NextResponse.json({ status: "none" });
  return NextResponse.json({ status: friendRequestStatus(me.id, target.id) });
}
