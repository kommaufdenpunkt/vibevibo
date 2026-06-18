import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin";
import * as DB from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET ?status=suspicious|verified|rejected|pending — Liste mit Verifikations-Status
export async function GET(req) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "admin only" }, { status: 403 });
  }
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const list = typeof DB.listVerificationCandidates === "function"
    ? DB.listVerificationCandidates({ status: status || null, limit: 200 })
    : [];

  // Sample-Details auf Wunsch (?userId=)
  const userId = url.searchParams.get("userId");
  if (userId) {
    const samples = typeof DB.listVoiceSamples === "function"
      ? DB.listVoiceSamples(Number(userId), { limit: 20 }) : [];
    return NextResponse.json({ samples });
  }

  return NextResponse.json({ list });
}

// POST { userId, action: "verify"|"reject"|"reset", reason } — Admin-Override
export async function POST(req) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "admin only" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const userId = Number(body.userId);
  const action = String(body.action || "");
  const reason = String(body.reason || "").slice(0, 280);
  if (!userId) return NextResponse.json({ error: "userId fehlt" }, { status: 400 });

  if (typeof DB.adminSetVerification !== "function") {
    return NextResponse.json({ error: "Helper fehlt — Patch noch nicht eingespielt" }, { status: 500 });
  }

  let result;
  if (action === "verify") {
    result = DB.adminSetVerification(userId, { status: "verified", verifiedGender: true, reason });
  } else if (action === "reject") {
    result = DB.adminSetVerification(userId, { status: "rejected", verifiedGender: false, reason });
  } else if (action === "reset") {
    result = DB.adminSetVerification(userId, { status: "none", verifiedGender: false, reason });
  } else {
    return NextResponse.json({ error: "Unbekannte Aktion" }, { status: 400 });
  }
  return NextResponse.json({ ok: true, result });
}
