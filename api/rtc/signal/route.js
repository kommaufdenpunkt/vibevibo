import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getCall, isCallParticipant, publishRtc } from "@/lib/db";

// POST { callId, toUserId, type: 'offer'|'answer'|'ice', payload }
// Weiterleitung von WebRTC-Signaling über SSE. Server speichert NICHTS davon.
export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const callId = Number(body?.callId);
  const toUserId = Number(body?.toUserId);
  const type = String(body?.type || "");
  const payload = body?.payload;

  if (!callId || !toUserId || !type) return NextResponse.json({ error: "missing" }, { status: 400 });
  if (!["offer", "answer", "ice", "bye"].includes(type)) return NextResponse.json({ error: "invalid type" }, { status: 400 });

  const call = getCall(callId);
  if (!call || call.endedAt) return NextResponse.json({ error: "call beendet" }, { status: 410 });
  if (!isCallParticipant(callId, me.id)) return NextResponse.json({ error: "kein teilnehmer" }, { status: 403 });
  if (!isCallParticipant(callId, toUserId)) return NextResponse.json({ error: "ziel nicht im call" }, { status: 404 });

  // Payload-Größe begrenzen, damit niemand andere "Daten" durchschmuggelt
  const json = JSON.stringify(payload || {});
  if (json.length > 20_000) return NextResponse.json({ error: "payload zu groß" }, { status: 413 });

  publishRtc(toUserId, { callId, fromUserId: me.id, type, payload });
  return NextResponse.json({ ok: true });
}
