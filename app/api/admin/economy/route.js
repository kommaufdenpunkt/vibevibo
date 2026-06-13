import { NextResponse } from "next/server";
import { checkAdminPassword } from "@/lib/admin";
import { computeEconomyHealth, runFidolinEconomyCheck, setEconomyMultiplier, getEconomyMultiplier } from "@/lib/economy";

export const dynamic = "force-dynamic";

// Auth: Header ODER ?pw= Query-Param (Admin-Page navigiert mit ?pw=...)
function authOk(req, url) {
  const pwHeader = req.headers.get("x-admin-password") || "";
  if (pwHeader && checkAdminPassword(pwHeader)) return true;
  const pwQuery = url.searchParams.get("pw") || "";
  if (pwQuery && checkAdminPassword(pwQuery)) return true;
  return false;
}

// GET → aktuelle Wirtschafts-Gesundheit (read-only)
export async function GET(req) {
  const url = new URL(req.url);
  if (!authOk(req, url)) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const days = Number(url.searchParams.get("days") || 7);
  try {
    return NextResponse.json({ health: computeEconomyHealth(days) });
  } catch (e) {
    return NextResponse.json({ error: "compute error", detail: String(e?.message || e) }, { status: 500 });
  }
}

// POST { action: "apply" | "set", multiplier? } — anwenden oder manuell setzen
export async function POST(req) {
  const url = new URL(req.url);
  if (!authOk(req, url)) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const action = String(body?.action || "").trim();

  if (action === "apply") {
    const result = runFidolinEconomyCheck("admin");
    return NextResponse.json({ ok: true, result });
  }
  if (action === "set") {
    const m = Number(body?.multiplier);
    if (!Number.isFinite(m)) return NextResponse.json({ error: "multiplier required" }, { status: 400 });
    const applied = setEconomyMultiplier(m);
    return NextResponse.json({ ok: true, multiplier: applied });
  }
  if (action === "reset") {
    const applied = setEconomyMultiplier(1.0);
    return NextResponse.json({ ok: true, multiplier: applied });
  }
  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
