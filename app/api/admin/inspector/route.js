import { NextResponse } from "next/server";
import { isAdminRequest, adminEnabled } from "@/lib/admin";
import { searchUsers, getUserInspection } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET ?q=foo → Suche
// GET ?id=123 → Inspektion eines Users
export async function GET(req) {
  if (!adminEnabled()) return NextResponse.json({ error: "admin disabled" }, { status: 503 });
  if (!isAdminRequest(req)) return NextResponse.json({ error: "auth required" }, { status: 401 });

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const q = url.searchParams.get("q");

  if (id) {
    const data = getUserInspection(Number(id));
    if (!data) return NextResponse.json({ error: "user not found" }, { status: 404 });
    return NextResponse.json(data);
  }

  const users = searchUsers({ q: q || "", limit: 50 });
  return NextResponse.json({ users });
}
