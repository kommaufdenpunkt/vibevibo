// 💑 Familienstand + Partner setzen (Konsens-basiert).
// POST { status, partnerUsername?, announceBuschfunk? }
//   status: "" | single | taken | engaged | married | complicated | open
//   partnerUsername: nur relevant bei taken/engaged/married
//   announceBuschfunk: postet bei Wechsel automatisch in den Buschfunk

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  setRelationshipStatus, getPartnerInfo, getUserById, userRow,
  addStatusUpdate, bumpXP,
} from "@/lib/db";

const STATUS_LABEL = {
  single:      "💚 Single",
  taken:       "💕 vergeben",
  engaged:     "💍 verlobt",
  married:     "💒 verheiratet",
  complicated: "🤯 es ist kompliziert",
  open:        "🌈 offene Beziehung",
};

export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const body = await req.json().catch(() => ({}));

  const status = String(body?.status || "").trim();
  const partnerUsername = String(body?.partnerUsername || "").trim();
  const announce = !!body?.announceBuschfunk;

  try {
    const res = setRelationshipStatus(me.id, status, partnerUsername);
    const info = getPartnerInfo(me.id);

    // Buschfunk-Auto-Post wenn gewünscht
    if (announce) {
      const label = STATUS_LABEL[res.status] || res.status;
      let text = `${label} ✨`;
      if (info.partner) {
        if (info.mutual) text = `${label} mit @${info.partner.username} ✨💞`;
        else text = `${label} mit @${info.partner.username} (einseitig 🥺 — warte auf gegenseitige Verlinkung)`;
      }
      try { addStatusUpdate(me.id, text, "", { boostedHours: 0 }); } catch {}
    }

    try { bumpXP(me.id, "status_set"); } catch {}

    return NextResponse.json({
      ok: true,
      status: res.status,
      partner: info.partner,
      mutual: info.mutual,
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const info = getPartnerInfo(me.id);
  return NextResponse.json({
    status: me.relationshipStatus || "",
    partner: info.partner,
    mutual: info.mutual,
  });
}
