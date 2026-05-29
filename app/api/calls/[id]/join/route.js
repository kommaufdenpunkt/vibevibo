import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { joinCall, getCall, getCallParticipants, publishToUser } from "@/lib/db";

export async function POST(_req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { id } = await params;
  const callId = Number(id);
  try {
    const call = joinCall(callId, me.id);
    // Allen anderen aktiven Teilnehmern „Neuer Peer ist da"
    const meInfo = { id: me.id, username: me.username, displayName: me.displayName, avatarUrl: me.avatarUrl || "" };
    for (const p of getCallParticipants(callId)) {
      if (p.id === me.id) continue;
      publishToUser(p.id, "call-peer-joined", { callId, peer: meInfo });
    }
    return NextResponse.json({ call, iceServers: defaultIceServers() });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "fehler" }, { status: 400 });
  }
}

function defaultIceServers() {
  // Öffentliche Google-STUN-Server – für die meisten Verbindungen ausreichend.
  // Bei NAT-Problemen kann später ein eigenes TURN konfiguriert werden (ENV).
  const servers = [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }];
  if (process.env.TURN_URL) {
    servers.push({
      urls: String(process.env.TURN_URL).split(",").map((s) => s.trim()),
      username: process.env.TURN_USERNAME || "",
      credential: process.env.TURN_PASSWORD || "",
    });
  }
  return servers;
}
