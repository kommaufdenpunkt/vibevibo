import { NextResponse } from "next/server";
import { getBuschfunk } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const me = await getSessionUser();
  return NextResponse.json({ events: getBuschfunk(30, me?.id || null) });
}
