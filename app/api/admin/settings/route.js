import { NextResponse } from "next/server";
import { isAdminRequest, adminEnabled } from "@/lib/admin";
import { listSettings, setSetting } from "@/lib/db";

const ALLOWED_KEYS = new Set([
  // Wartung + Marquee
  "maintenance_mode",
  "maintenance_message",
  "marquee_text",

  // Display-Werbung (Banner)
  "DISPLAY_PROVIDER",        // off|adsense|ezoic|adsterra
  "ADSENSE_PUB_ID",          // ca-pub-1234567890123456
  "ADSENSE_AUTO_ADS",        // "1"|"0" — Auto-Ads global einblenden
  "EZOIC_SITE_ID",
  "ADSTERRA_ZONE_ID",

  // Earning-Provider (Reward-Hub) — Komma-Liste der aktiven IDs
  "EARNING_PROVIDERS_ACTIVE", // "simulator,cpx,bitlabs"

  // Webhook-Secrets je Provider
  "ADS_SECRET_CPX",
  "ADS_SECRET_BITLABS",
  "ADS_SECRET_AYET",
  "ADS_SECRET_POLLFISH",
  "ADS_SECRET_ADGATE",
  "ADS_SECRET_GAM",
]);

const SECRET_KEYS = new Set([
  "ADS_SECRET_CPX", "ADS_SECRET_BITLABS", "ADS_SECRET_AYET",
  "ADS_SECRET_POLLFISH", "ADS_SECRET_ADGATE", "ADS_SECRET_GAM",
]);

const PROVIDER_IDS = ["cpx", "bitlabs", "ayet", "pollfish", "adgate", "gam"];

function maskSecret(v) {
  if (!v) return "";
  if (v.length <= 6) return "•".repeat(v.length);
  return v.slice(0, 3) + "•".repeat(Math.min(20, v.length - 6)) + v.slice(-3);
}

export async function GET(req) {
  if (!adminEnabled()) return NextResponse.json({ error: "Admin nicht konfiguriert." }, { status: 503 });
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const all = listSettings();
  const map = Object.fromEntries(all.filter((s) => ALLOWED_KEYS.has(s.key)).map((s) => [s.key, s.value || ""]));
  const eff = (k) => map[k] || process.env[k] || "";

  // Per-Provider Secret-Masken bauen
  const secretMasks = {};
  for (const id of PROVIDER_IDS) {
    secretMasks[`ads_secret_${id}_mask`] = maskSecret(eff(`ADS_SECRET_${id.toUpperCase()}`));
  }

  // Sources fuer alle relevanten Keys
  const sourceKeys = [
    "DISPLAY_PROVIDER", "ADSENSE_PUB_ID", "ADSENSE_AUTO_ADS",
    "EZOIC_SITE_ID", "ADSTERRA_ZONE_ID",
    "EARNING_PROVIDERS_ACTIVE",
    ...PROVIDER_IDS.map((id) => `ADS_SECRET_${id.toUpperCase()}`),
  ];

  return NextResponse.json({
    maintenance_mode: map.maintenance_mode === "1",
    maintenance_message: map.maintenance_message ?? "Wir sind kurz weg — gleich wieder da.",
    marquee_text: map.marquee_text ?? "",

    // Display
    display_provider: eff("DISPLAY_PROVIDER") || "off",
    ezoic_site_id: eff("EZOIC_SITE_ID"),
    adsterra_zone_id: eff("ADSTERRA_ZONE_ID"),

    // Earning
    earning_providers_active: eff("EARNING_PROVIDERS_ACTIVE") || "simulator",

    // Secret-Masken
    ...secretMasks,

    sources: Object.fromEntries(sourceKeys.map((k) => [k, map[k] ? "db" : (process.env[k] ? "env" : "none")])),
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
    else v = String(v ?? "").trim().slice(0, 2000);
    if (SECRET_KEYS.has(k) && v === "***unchanged***") continue;
    setSetting(k, v);
    updates[k] = SECRET_KEYS.has(k) ? "(secret aktualisiert)" : v;
  }
  return NextResponse.json({ ok: true, updates });
}
