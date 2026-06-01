import { NextResponse } from "next/server";
import { getPublicKey, pushIsConfigured } from "@/lib/push";

export async function GET() {
  return NextResponse.json({
    publicKey: getPublicKey(),
    enabled: pushIsConfigured(),
  });
}
