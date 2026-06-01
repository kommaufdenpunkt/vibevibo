import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin";
import { getUserByUsername, buildEvidence } from "@/lib/db";

// Liefert ein vollständiges Beweis-Paket (JSON) zu einem User.
// Audit-Log, Fehlversuche, Geräte, Sanktionen, Meldungen.
// Gedacht für Strafanzeige / interne Untersuchung.
export async function GET(req, { params }) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "admin auth required" }, { status: 401 });
  const { username } = await params;
  const u = getUserByUsername(username);
  if (!u) return NextResponse.json({ error: "user not found" }, { status: 404 });
  const evidence = buildEvidence(u.id);
  const filename = `evidence_${u.username}_${new Date().toISOString().slice(0, 10)}.json`;
  return new NextResponse(JSON.stringify(evidence, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
