import { NextResponse } from "next/server";
import { isAdminRequest, adminEnabled } from "@/lib/admin";
import { setUserStatus, deleteUser, getUserByUsername, blockIp, audit, adminResetPassword } from "@/lib/db";
import { resetRateLimit } from "@/lib/rateLimit";

// Aktionen auf einen Wartelisten-/User-Eintrag: approve | reject | block | reset_password
export async function POST(req) {
  if (!adminEnabled()) return NextResponse.json({ error: "admin disabled" }, { status: 503 });
  if (!isAdminRequest(req)) return NextResponse.json({ error: "auth required" }, { status: 401 });

  const { username, action, ip, newPassword } = await req.json();
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
  } else if (action === "reset_password") {
    try {
      adminResetPassword(user.id, newPassword);
    } catch (e) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    audit({ userId: user.id, action: "admin.password_reset", detail: `target=${username}` });
    return NextResponse.json({ ok: true, message: `Passwort für ${username} zurückgesetzt.` });
  } else if (action === "unlock_login") {
    // Räumt ALLE Login-Rate-Limit-Buckets dieses Users + die im Body übergebene IP.
    // Username-bucket existiert evtl. gar nicht, IP-bucket aber sehr wahrscheinlich.
    resetRateLimit(`login:user:${user.username}`);
    if (ip) resetRateLimit(`login:ip:${ip}`);
    audit({ userId: user.id, action: "admin.login_unlock", detail: `target=${username},ip=${ip || "(none)"}` });
    return NextResponse.json({ ok: true, message: `Login-Sperre für ${username} aufgehoben.` });
  } else {
    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
