// 💑 Eigene Partnerschafts-Anfrage zurückziehen.
// POST { requestId }

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { cancelPartnershipRequest } from "@/lib/db";

export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const requestId = Number(body?.requestId);
  if (!requestId) return NextResponse.json({ error: "requestId fehlt" }, { status: 400 });
  try {
    return NextResponse.json(cancelPartnershipRequest(me.id, requestId));
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
