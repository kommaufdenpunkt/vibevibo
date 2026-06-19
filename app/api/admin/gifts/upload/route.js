import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin";
import { addCustomGift } from "@/lib/db";

// POST /api/admin/gifts/upload
// Body: { code, name, description, categoryCode, price, imageDataUrl,
//         isLimited, limitQty, isSeasonal, seasonStart, seasonEnd, sortOrder }
//
// Auth: Header `x-admin-password` ODER `?pw=`
export const runtime = "nodejs";

export async function POST(req) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Admin-Auth nötig." }, { status: 401 });
  }
  let body = {};
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Body muss JSON sein." }, { status: 400 });
  }
  try {
    const id = addCustomGift({
      code:          String(body.code || "").trim(),
      name:          String(body.name || "").trim(),
      description:   String(body.description || "").trim(),
      categoryCode:  String(body.categoryCode || ""),
      price:         Number(body.price) || 5,
      imageUrl:      String(body.imageDataUrl || ""),
      isLimited:     !!body.isLimited,
      limitQty:      Number(body.limitQty) || 0,
      isSeasonal:    !!body.isSeasonal,
      seasonStart:   Number(body.seasonStart) || 0,
      seasonEnd:     Number(body.seasonEnd) || 0,
      sortOrder:     Number(body.sortOrder) || 100,
    });
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Fehler" }, { status: 400 });
  }
}
