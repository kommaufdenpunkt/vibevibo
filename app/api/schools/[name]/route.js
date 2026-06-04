import { NextResponse } from "next/server";
import { usersBySchool, isOnline } from "@/lib/db";

// GET /api/schools/[name]
// Liefert alle Mitglieder einer Schule.
export async function GET(_req, { params }) {
  const { name } = await params;
  const decoded = decodeURIComponent(name || "");
  if (!decoded.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });
  const users = usersBySchool(decoded).map((u) => ({ ...u, online: isOnline(u.lastSeen) }));
  return NextResponse.json({ school: decoded, users });
}
