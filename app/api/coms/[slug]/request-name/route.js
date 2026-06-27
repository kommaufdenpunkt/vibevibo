// POST /api/coms/:slug/request-name
// Body: { newName: string, reason?: string }
//
// Com-OWNER stellt einen Antrag auf Namensänderung. Vibes werden NICHT sofort
// abgezogen — erst bei Mod-Genehmigung (400 ✨). Der Antrag landet im Mod-Tool
// /mcp/coms-requests.

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getComsBySlug } from "@/lib/db";
import { enqueueChangeRequest, getDefaultCost } from "@/lib/comChangeRequests";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Bitte einloggen." }, { status: 401 });

  const { slug } = await params;
  const com = getComsBySlug(String(slug || ""));
  if (!com) return NextResponse.json({ error: "Com nicht gefunden." }, { status: 404 });

  // Nur der Owner darf einen Namens-Antrag stellen.
  if (Number(com.owner_id) !== Number(me.id)) {
    return NextResponse.json({ error: "Nur die Besitzer:in der Com kann das beantragen." }, { status: 403 });
  }

  let body = {};
  try { body = await req.json(); } catch {}
  const newName = String(body?.newName || "").trim();
  const reason = body?.reason ? String(body.reason).trim().slice(0, 500) : null;

  if (newName.length < 2) return NextResponse.json({ error: "Neuer Name min. 2 Zeichen." }, { status: 400 });
  if (newName.length > 40) return NextResponse.json({ error: "Neuer Name max. 40 Zeichen." }, { status: 400 });
  if (newName === com.name) return NextResponse.json({ error: "Das ist schon der aktuelle Name." }, { status: 400 });

  try {
    const res = enqueueChangeRequest({
      comId: com.id,
      comSlug: com.slug,
      requestedByUserId: me.id,
      requestType: "rename",
      oldValue: com.name,
      newValue: newName,
      reason,
    });
    return NextResponse.json({
      ok: true,
      requestId: res.id,
      cost: res.cost ?? getDefaultCost("rename"),
      message: "Antrag eingereicht — wird vom Team geprüft.",
    });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Antrag fehlgeschlagen." }, { status: 400 });
  }
}
