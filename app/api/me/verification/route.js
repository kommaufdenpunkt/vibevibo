import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import * as DB from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET — eigener Verifizierungs-Status
export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const st = typeof DB.getVerificationStatus === "function"
    ? DB.getVerificationStatus(me.id)
    : { status: "none", verifiedGender: false, voiceScore: 0, verifiedAt: 0 };
  return NextResponse.json({ ...st, gender: me.gender || "" });
}
