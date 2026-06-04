import { NextResponse } from "next/server";
import { listSchools } from "@/lib/db";

// GET /api/schools/list?city=Berlin
// Liefert alle Schulen (mit Mitgliederzahl), sortiert nach Anzahl. Filter optional nach Stadt.
export async function GET(req) {
  const url = new URL(req.url);
  const city = url.searchParams.get("city") || "";
  const schools = listSchools({ city, limit: 300 });
  return NextResponse.json({ schools });
}
