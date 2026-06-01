import { NextResponse } from "next/server";
import { listUsers, isOnline } from "@/lib/db";

export async function GET() {
  const users = listUsers().map((u) => ({ ...u, online: isOnline(u.lastSeen) }));
  return NextResponse.json({ users });
}
