import { NextResponse } from "next/server";
import { isAdmin, adminEnabled } from "@/lib/admin";
import { setUserStatus, deleteUser, getUserByUsername, blockIp } from "@/lib/db";

// Aktionen auf einen Wartelisten-/User-Eintrag: approve | reject | block
export async function POST(req) {
  if (!adminEnabled()) return NextResponse.json({ error: "admin disabled" }, { status: 503 });
  if (!(await isAdmin())) return NextResponse.json({ error: "auth required" }, { status: 401 });

  const { username, action, ip } = await req.json();
  const user = getUserByUsername(username);
  if (!user) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (action === "approve") {
    setUserStatus(user.id, "approved");
  } else if (action === "block") {
    setUserStatus(user.id, "blocked");
    if (ip) blockIp(ip, `User ${username} gesperrt`);
  } else if (action === "reject") {
    if (ip) blockIp(ip, `Anmeldung ${username} abgelehnt`);
    deleteUser(user.id);
  } else {
    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
