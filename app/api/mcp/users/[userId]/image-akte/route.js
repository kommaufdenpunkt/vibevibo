// GET /api/mcp/users/:userId/image-akte
// Bild-Akte eines Users: alle abgelehnten Bilder mit Grund + Datum.
// Nur für Mods+. Akte-Audit-Trail wird HIER NICHT geprüft — Caller (UI) muss
// vorher /api/mcp/akte/log-access aufrufen (siehe AkteAccessGate).

import { NextResponse } from "next/server";
import { getMcpUser } from "@/lib/modAuth";
import { listAkteForUser, countAkteForUser } from "@/lib/imageModeration";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req, { params }) {
  const me = await getMcpUser();
  if (!me) return NextResponse.json({ error: "Mod-Login nötig." }, { status: 401 });

  const { userId: userIdRaw } = await params;
  const userId = parseInt(userIdRaw, 10);
  if (!Number.isInteger(userId) || userId <= 0) {
    return NextResponse.json({ error: "Ungültige User-ID." }, { status: 400 });
  }

  const entries = listAkteForUser(userId, { limit: 200 });
  const total = countAkteForUser(userId);

  return NextResponse.json({ ok: true, entries, total, userId });
}
