import { NextResponse } from "next/server";
import { SHOP_ITEMS } from "@/lib/shop";

export async function GET() {
  return NextResponse.json({ items: SHOP_ITEMS });
}
