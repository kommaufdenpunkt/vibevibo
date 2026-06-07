import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { listNearbyVibos } from "@/lib/db";

export async function GET(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const url = new URL(req.url);
  const lat = parseFloat(url.searchParams.get("lat") || "");
  const lng = parseFloat(url.searchParams.get("lng") || "");
  const radius = Math.min(1500, Math.max(50, parseInt(url.searchParams.get("radius") || "300", 10)));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat/lng erforderlich" }, { status: 400 });
  }
  return NextResponse.json({ ok: true, vibos: listNearbyVibos(me.id, lat, lng, radius) });
}
