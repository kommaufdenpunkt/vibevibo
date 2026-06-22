import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  getUserByUsername, friendRequestStatus,
  hasUserBlocked,
} from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { username } = await params;
  const target = getUserByUsername(String(username).toLowerCase());
  if (!target) return NextResponse.json({ status: "none" });

  const iBlock = hasUserBlocked(me.id, target.id);
  const blockedByThem = hasUserBlocked(target.id, me.id);

  return NextResponse.json({
    status: (iBlock || blockedByThem) ? "blocked" : friendRequestStatus(me.id, target.id),
    userId: target.id,
    iBlock,
    blockedByThem,
  });
}
