import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin";
import { computeEconomyHealth, runFidolinEconomyCheck, setEconomyMultiplier, getEconomyMultiplier } from "@/lib/economy";

// GET → aktuelle Wirtschafts-Gesundheit (read-only)
export async function GET(req) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const days = Number(new URL(req.url).searchParams.get("days") || 7);
  return NextResponse.json({ health: computeEconomyHealth(days) });
}

// POST { action: "apply" | "set", multiplier? } — anwenden oder manuell setzen
export async function POST(req) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "auth required" }, { status: 401 });
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
