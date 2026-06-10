import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { listMyBlocks } from "@/lib/db";

// GET /api/me/blocks — meine Sperrliste
export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  return NextResponse.json({ blocks: listMyBlocks(me.id) });
}
