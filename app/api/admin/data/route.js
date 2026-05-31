import { NextResponse } from "next/server";
import { isAdminRequest, adminEnabled } from "@/lib/admin";
import { listUsersByStatus, listBlockedIps, adminStats } from "@/lib/db";

export async function GET(req) {
  if (!adminEnabled()) return NextResponse.json({ error: "Admin-Bereich nicht konfiguriert (VV_ADMIN_PASSWORD fehlt)." }, { status: 503 });
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Falsches Admin-Passwort." }, { status: 401 });
  return NextResponse.json({
    stats: adminStats(),
    pending: listUsersByStatus("pending"),
    approved: listUsersByStatus("approved"),
    blocked: listUsersByStatus("blocked"),
    blockedIps: listBlockedIps(),
  });
}
