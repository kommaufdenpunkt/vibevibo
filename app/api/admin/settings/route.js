import { NextResponse } from "next/server";
import { isAdminRequest, adminEnabled } from "@/lib/admin";
import { listSettings, setSetting, getSetting } from "@/lib/db";

const ALLOWED_KEYS = new Set([
  "maintenance_mode",     // "1" oder ""
  "maintenance_message",  // freier Text
  "marquee_text",          // freier Text für Startseiten-Lauftext
]);

export async function GET(req) {
  if (!adminEnabled()) return NextResponse.json({ error: "Admin nicht konfiguriert." }, { status: 503 });
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const all = listSettings();
  // Nur whitelisted Keys ausliefern + Defaults
  const map = Object.fromEntries(all.filter((s) => ALLOWED_KEYS.has(s.key)).map((s) => [s.key, s.value || ""]));
  return NextResponse.json({
    maintenance_mode: map.maintenance_mode === "1",
    maintenance_message: map.maintenance_message ?? "Wir sind kurz weg — gleich wieder da.",
    marquee_text: map.marquee_text ?? "",
  });
}

export async function POST(req) {
  if (!adminEnabled()) return NextResponse.json({ error: "Admin nicht konfiguriert." }, { status: 503 });
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const updates = {};
  for (const k of Object.keys(body || {})) {
    if (!ALLOWED_KEYS.has(k)) continue;
    let v = body[k];
    if (k === "maintenance_mode") v = v ? "1" : "";
    else v = String(v ?? "").slice(0, 2000);
    setSetting(k, v);
    updates[k] = v;
  }
  return NextResponse.json({ ok: true, updates });
}
