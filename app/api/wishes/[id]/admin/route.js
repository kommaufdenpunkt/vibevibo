import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin";
import { adminUpdateWish, getWish } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req, { params }) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Admin-Auth nötig." }, { status: 401 });
  const { id } = await params;
  let body = {};
  try { body = await req.json(); } catch {}
  try {
    adminUpdateWish(Number(id), {
      status: body?.status,
      adminReply: body?.adminReply,
      pinned: body?.pinned,
      deletedWish: body?.deletedWish,
    });
    if (body?.deletedWish) return NextResponse.json({ ok: true, deleted: true });
    return NextResponse.json({ ok: true, wish: getWish(Number(id)) });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Fehler" }, { status: 400 });
  }
}
