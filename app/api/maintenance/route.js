import { NextResponse } from "next/server";
import { getMaintenanceMode, getMaintenanceMessage, getMarqueeText } from "@/lib/db";

// Öffentlicher Endpoint — alle Clients lesen Wartungsmodus + Marquee von hier.
export async function GET() {
  return NextResponse.json({
    maintenance: getMaintenanceMode(),
    message: getMaintenanceMessage(),
    marquee: getMarqueeText(),
  });
}
