import { NextResponse } from "next/server";
import { listUsers, isOnline, blockedUserIdsFor } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const me = await getSessionUser();
  const blocked = me ? blockedUserIdsFor(me.id) : new Set();
  const users = listUsers()
    .filter((u) => !blocked.has(u.id))
    .map((u) => ({ ...u, online: isOnline(u.lastSeen) }));
  return NextResponse.json({ users });
}
