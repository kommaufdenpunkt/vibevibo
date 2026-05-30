import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin";
import { listAllSeasonEvents, upsertSeasonEvent, deleteSeasonEvent } from "@/lib/db";

export async function GET(req) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "admin auth required" }, { status: 401 });
  return NextResponse.json({ events: listAllSeasonEvents() });
}

// POST { id?, slug, name, description, emoji, multiplier (50-500), startsAt, endsAt, enabled }
export async function POST(req) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "admin auth required" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (!body?.slug || !body?.name || !body?.startsAt || !body?.endsAt) {
    return NextResponse.json({ error: "slug, name, startsAt, endsAt nötig" }, { status: 400 });
  }
  const id = upsertSeasonEvent(body);
  return NextResponse.json({ ok: true, id });
}

// DELETE ?id=42
export async function DELETE(req) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "admin auth required" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "id nötig" }, { status: 400 });
  deleteSeasonEvent(id);
  return NextResponse.json({ ok: true });
}
