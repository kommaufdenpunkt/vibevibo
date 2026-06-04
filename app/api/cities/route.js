import { NextResponse } from "next/server";
import { listCities } from "@/lib/db";

export async function GET() {
  return NextResponse.json({ cities: listCities() });
}
