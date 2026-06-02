import { NextResponse } from "next/server";
import { fortuneOfTheDay } from "@/lib/fortune";

export async function GET() {
  return NextResponse.json({ fortune: fortuneOfTheDay() });
}
