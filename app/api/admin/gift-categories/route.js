import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin";
import {
  listGiftCategories, addGiftCategory, updateGiftCategory, deleteGiftCategory,
} from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Admin-Auth nötig." }, { status: 401 });
  }
  return NextResponse.json({ categories: listGiftCategories() });
}

export async function POST(req) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Admin-Auth nötig." }, { status: 401 });
  }
  let body = {};
  try { body = await req.json(); } catch {}
  try {
    const action = String(body.action || "add");
    if (action === "add") {
      const code = addGiftCategory({
        code: body.code, label: body.label,
        emoji: body.emoji, sortOrder: Number(body.sortOrder) || 100,
      });
      return NextResponse.json({ ok: true, code });
    }
    if (action === "update" && body.id) {
      updateGiftCategory(Number(body.id), {
        label: body.label, emoji: body.emoji,
        sortOrder: body.sortOrder !== undefined ? Number(body.sortOrder) : undefined,
      });
      return NextResponse.json({ ok: true });
    }
    if (action === "delete" && body.id) {
      deleteGiftCategory(Number(body.id));
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Unbekannte Action." }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Fehler" }, { status: 400 });
  }
}
