import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

// Leichter Heartbeat-Endpoint: getSessionUser ruft intern touchUser auf,
// hält damit den last_seen / Online-Status aktuell.
export async function POST() {
  const user = await getSessionUser();
  return NextResponse.json({ online: !!user });
}
