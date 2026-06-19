import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin";
import { updateCustomGift, deleteCustomGift, setCustomGiftActive, getCustomGift } from "@/lib/db";

export const runtime = "nodejs";

export async function PATCH(req, { params }) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Admin-Auth nötig." }, { status: 401 });
  }
  const { id } = await params;
  let body = {};
  try { body = await req.json(); } catch {}
  try {
    if (body.toggleActive !== undefined) {
      setCustomGiftActive(Number(id), !!body.toggleActive);
    } else {
      updateCustomGift(Number(id), body);
    }
    return NextResponse.json({ ok: true, gift: getCustomGift(Number(id)) });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Fehler" }, { status: 400 });
  }
}

export async function DELETE(req, { params }) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Admin-Auth nötig." }, { status: 401 });
  }
  const { id } = await params;
  try {
    deleteCustomGift(Number(id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Fehler" }, { status: 400 });
  }
}
