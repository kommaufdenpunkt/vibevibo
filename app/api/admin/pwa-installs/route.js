import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin";
import { listPwaInstalls } from "@/lib/db";

// GET /api/admin/pwa-installs — Liste aller PWA-Installations (admin only)
export async function GET(req) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const rows = listPwaInstalls();
  return NextResponse.json({ installs: rows });
}
