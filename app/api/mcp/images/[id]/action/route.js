// POST /api/mcp/images/:id/action
// Body: { action: 'approve' | 'reject', reasonCode?, customText? }

import { NextResponse } from "next/server";
import { getMcpUser } from "@/lib/modAuth";
import { approveImage, rejectImage, getPendingImageById } from "@/lib/imageModeration";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req, { params }) {
  const me = await getMcpUser();
  if (!me) return NextResponse.json({ error: "Mod-Login nötig." }, { status: 401 });

  const { id } = await params;
  const queueId = parseInt(id, 10);
  if (!Number.isInteger(queueId) || queueId <= 0) {
    return NextResponse.json({ error: "Ungültige Bild-ID." }, { status: 400 });
  }

  let body = {};
  try { body = await req.json(); } catch {}
  const action = String(body?.action || "").toLowerCase();

  // Existenz prüfen
  const img = getPendingImageById(queueId);
  if (!img) return NextResponse.json({ error: "Bild nicht gefunden." }, { status: 404 });

  if (action === "approve") {
    const ok = approveImage({ queueId, modId: me.id });
    if (!ok) return NextResponse.json({ error: "Approve fehlgeschlagen (schon reviewed?)." }, { status: 409 });
    return NextResponse.json({ ok: true, action: "approved" });
  }

  if (action === "reject") {
    const reasonCode = String(body?.reasonCode || "").trim();
    const customText = body?.customText ? String(body.customText).trim() : null;
    if (!reasonCode) return NextResponse.json({ error: "reasonCode Pflicht bei reject." }, { status: 400 });
    if (reasonCode === "other" && (!customText || customText.length < 5)) {
      return NextResponse.json({ error: "Bei 'Sonstiges' brauchst du einen Begründungs-Text (min 5 Zeichen)." }, { status: 400 });
    }
    try {
      rejectImage({ queueId, modId: me.id, reasonCode, customReasonText: customText });
      return NextResponse.json({ ok: true, action: "rejected", reasonCode });
    } catch (e) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Unbekannte action (erwartet: approve | reject)." }, { status: 400 });
}
