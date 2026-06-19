import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { listCatalogGifts, listGiftCategories } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const url = new URL(req.url);
  const search = url.searchParams.get("q") || "";
  const categoryCode = url.searchParams.get("cat") || "";
  const filter = url.searchParams.get("filter") || "all";
  const gifts = listCatalogGifts({ search, categoryCode, filter, limit: 300 });
  const categories = listGiftCategories();
  return NextResponse.json({ gifts, categories });
}
