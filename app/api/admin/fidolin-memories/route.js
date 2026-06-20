// 🎀 Admin-API für Fidolin-Erinnerungs-Posts
//
// GET    → { memories: [...] }
// POST   { id?, month, day, anniYear, category, emoji, content, active } → upsert
// DELETE ?id=123 → entfernen
// PATCH  ?id=123 { active: true|false } → aktivieren/deaktivieren

import { NextResponse } from "next/server";
import { isAdminRequest, adminEnabled } from "@/lib/admin";
import {
  listAllFidolinMemories,
  upsertFidolinMemory,
  toggleFidolinMemoryActive,
  deleteFidolinMemory,
} from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function guard(req) {
  if (!adminEnabled()) return NextResponse.json({ error: "admin disabled" }, { status: 503 });
  if (!isAdminRequest(req)) return NextResponse.json({ error: "auth required" }, { status: 401 });
  return null;
}

export async function GET(req) {
  const g = guard(req); if (g) return g;
  return NextResponse.json({ memories: listAllFidolinMemories() });
}

export async function POST(req) {
  const g = guard(req); if (g) return g;
  let body = {};
  try { body = await req.json(); } catch {}
  try {
    const id = upsertFidolinMemory({
      id: body?.id || null,
      month: Number(body?.month) || 0,
      day: Number(body?.day) || 0,
      anniYear: Number(body?.anniYear) || 0,
      category: String(body?.category || "general"),
      emoji: String(body?.emoji || "📅"),
      content: String(body?.content || ""),
      active: body?.active !== false ? 1 : 0,
    });
    return NextResponse.json({ ok: true, id, memories: listAllFidolinMemories() });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export async function PATCH(req) {
  const g = guard(req); if (g) return g;
  const url = new URL(req.url);
  const id = Number(url.searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "id fehlt" }, { status: 400 });
  let body = {};
  try { body = await req.json(); } catch {}
  toggleFidolinMemoryActive(id, !!body?.active);
  return NextResponse.json({ ok: true, memories: listAllFidolinMemories() });
}

export async function DELETE(req) {
  const g = guard(req); if (g) return g;
  const url = new URL(req.url);
  const id = Number(url.searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "id fehlt" }, { status: 400 });
  deleteFidolinMemory(id);
  return NextResponse.json({ ok: true, memories: listAllFidolinMemories() });
}
