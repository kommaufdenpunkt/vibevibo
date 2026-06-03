import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { listWaters } from "@/lib/fishing";

// GET /api/world/waters?lat=&lng=&r=
// Liefert Gewaesser in der Naehe (Seen, Teiche, Fluesse, Pools).
export async function GET(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const url = new URL(req.url);
  const lat = parseFloat(url.searchParams.get("lat") || "");
  const lng = parseFloat(url.searchParams.get("lng") || "");
  const r = Math.min(2000, Math.max(100, parseInt(url.searchParams.get("r") || "600", 10) || 600));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat/lng erforderlich" }, { status: 400 });
  }
  const waters = await listWaters(lat, lng, r);
  if (waters === null) return NextResponse.json({ waters: [], overpassDown: true });
  return NextResponse.json({ waters });
}
