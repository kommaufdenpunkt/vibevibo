import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { updateUserLocation } from "@/lib/db";

// POST { lat, lng, accuracy } – User meldet seinen aktuellen Standort.
// Wird beim Pickup vom Server gegen die Item-Position geprüft.
export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const lat = Number(body?.lat);
  const lng = Number(body?.lng);
  const accuracy = Number(body?.accuracy) || 0;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "ungültige Koordinaten" }, { status: 400 });
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json({ error: "Koordinaten außerhalb gültiger Bereiche" }, { status: 400 });
  }
  updateUserLocation(me.id, lat, lng, accuracy);
  return NextResponse.json({ ok: true });
}
