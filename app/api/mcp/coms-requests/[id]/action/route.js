// POST /api/mcp/coms-requests/:id/action
// Body: { action: "approve" | "reject", note?: string }
//
// approve → Vibes abbuchen + Com umbenennen + System-DM
// reject  → keine Vibes + System-DM mit Begründung (note Pflicht)

import { NextResponse } from "next/server";
import { getMcpUser } from "@/lib/modAuth";
import { approveComRequest, rejectComRequest, getComRequestById } from "@/lib/comChangeRequests";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req, { params }) {
  const me = await getMcpUser();
  if (!me) return NextResponse.json({ error: "Mod-Login nötig." }, { status: 401 });

  const { id } = await params;
  const reqId = parseInt(id, 10);
  if (!Number.isInteger(reqId) || reqId <= 0) {
    return NextResponse.json({ error: "Ungültige Antrags-ID." }, { status: 400 });
  }

  let body = {};
  try { body = await req.json(); } catch {}
  const action = String(body?.action || "").toLowerCase();
  const note = body?.note ? String(body.note).trim().slice(0, 500) : null;

  const r = getComRequestById(reqId);
  if (!r) return NextResponse.json({ error: "Antrag nicht gefunden." }, { status: 404 });
  if (r.status !== "pending") return NextResponse.json({ error: "Antrag ist nicht mehr offen." }, { status: 409 });

  try {
    if (action === "approve") {
      const res = approveComRequest({ reqId, modId: me.id, decisionNote: note });
      return NextResponse.json(res);
    }
    if (action === "reject") {
      if (!note || note.length < 5) {
        return NextResponse.json({ error: "Begründung (min. 5 Zeichen) erforderlich beim Ablehnen." }, { status: 400 });
      }
      const res = rejectComRequest({ reqId, modId: me.id, decisionNote: note });
      return NextResponse.json(res);
    }
    return NextResponse.json({ error: "Unbekannte action (approve|reject)." }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Aktion fehlgeschlagen." }, { status: 400 });
  }
}
