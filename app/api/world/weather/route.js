import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { fetchWeather } from "@/lib/weather";

// GET /api/world/weather?lat=..&lng=.. — aktuelles Wetter + bevorzugte Spezies
export async function GET(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat/lng nötig" }, { status: 400 });
  }
  const w = await fetchWeather(lat, lng);
  if (!w) return NextResponse.json({ weather: null });
  return NextResponse.json({ weather: w });
}
