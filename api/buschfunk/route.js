import { NextResponse } from "next/server";
import { getBuschfunk } from "@/lib/db";

export async function GET() {
  return NextResponse.json({ events: getBuschfunk(30) });
}
