import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { listLinkedAccounts, unlinkAccount } from "@/lib/db";
import { isProviderConfigured, PROVIDER_LABELS } from "@/lib/socialAuth";

// GET /api/me/linked — meine verknuepften Accounts + welche Provider verfuegbar
export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const linked = listLinkedAccounts(me.id);
  const available = ["facebook", "instagram", "snapchat"].map((p) => ({
    provider: p,
    label: PROVIDER_LABELS[p],
    configured: isProviderConfigured(p),
    linked: linked.some((l) => l.provider === p),
  }));
  return NextResponse.json({ linked, available });
}

// DELETE /api/me/linked?provider=facebook — Entkoppeln
export async function DELETE(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const url = new URL(req.url);
  const provider = url.searchParams.get("provider");
  if (!["facebook", "instagram", "snapchat"].includes(provider)) {
    return NextResponse.json({ error: "invalid provider" }, { status: 400 });
  }
  unlinkAccount(me.id, provider);
  return NextResponse.json({ ok: true });
}
