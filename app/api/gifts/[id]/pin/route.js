import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { pinGift, unpinGift } from "@/lib/db";

// POST   — Geschenk pinnen (max 6 pro Vitrine)
// DELETE — Geschenk wieder freigeben
export async function POST(_req, ctx) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { id } = await ctx.params;
  try {
    const ok = pinGift(me.id, Number(id));
    if (!ok) return NextResponse.json({ error: "Geschenk nicht gefunden." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export async function DELETE(_req, ctx) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { id } = await ctx.params;
  const ok = unpinGift(me.id, Number(id));
  if (!ok) return NextResponse.json({ error: "Geschenk nicht gefunden." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
