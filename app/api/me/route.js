import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { complimentsUnreadCount, complimentsReceivedCount } from "@/lib/db";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ user: null });
  // Komplimente-Counter: total empfangen (fuers Profil) + ungelesen (fuers Badge)
  const complimentsTotal = complimentsReceivedCount(user.id);
  const complimentsUnread = complimentsUnreadCount(user.id);
  return NextResponse.json({ user: { ...user, complimentsTotal, complimentsUnread } });
}
