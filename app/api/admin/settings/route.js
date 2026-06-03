import { NextResponse } from "next/server";
import { isAdminRequest, adminEnabled } from "@/lib/admin";
import { listSettings, setSetting } from "@/lib/db";

const ALLOWED_KEYS = new Set([
  "maintenance_mode",     // "1" oder ""
  "maintenance_message",  // freier Text
  "marquee_text",          // freier Text für Startseiten-Lauftext
  // Werbe-Konfiguration (DB-overrides — ENV bleibt Fallback)
  "ADSENSE_CLIENT",        // ca-pub-XXXXXXXXXXXXXXXX
  "ADS_PROVIDER",          // simulator|adgate|pollfish|gam
  "ADS_SECRET_ADGATE",     // Adgate Webhook-Secret
  "ADS_SECRET_POLLFISH",   // Pollfish Webhook-Secret
  "ADS_SECRET_GAM",        // Google Ad Manager SSV-Secret
]);

const SECRET_KEYS = new Set(["ADS_SECRET_ADGATE", "ADS_SECRET_POLLFISH", "ADS_SECRET_GAM"]);

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
  // Effektive Werte: DB > ENV. Secrets werden gemaskt zurueckgegeben.
  const eff = (k) => map[k] || process.env[k] || "";
  return NextResponse.json({
    maintenance_mode: map.maintenance_mode === "1",
    maintenance_message: map.maintenance_message ?? "Wir sind kurz weg — gleich wieder da.",
    marquee_text: map.marquee_text ?? "",

    // Werbung
    adsense_client: eff("ADSENSE_CLIENT"),
    ads_provider: eff("ADS_PROVIDER") || "simulator",
    ads_secret_adgate_mask:   maskSecret(eff("ADS_SECRET_ADGATE")),
    ads_secret_pollfish_mask: maskSecret(eff("ADS_SECRET_POLLFISH")),
    ads_secret_gam_mask:      maskSecret(eff("ADS_SECRET_GAM")),
    // Quelle pro Key (db|env|none) — hilft beim Debugging
    sources: Object.fromEntries(["ADSENSE_CLIENT","ADS_PROVIDER","ADS_SECRET_ADGATE","ADS_SECRET_POLLFISH","ADS_SECRET_GAM"]
      .map((k) => [k, map[k] ? "db" : (process.env[k] ? "env" : "none")])),
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
    // Secret leer-setzen heisst loeschen (faellt zurueck auf ENV)
    if (SECRET_KEYS.has(k) && v === "***unchanged***") continue; // UI: Marker fuer "nicht aendern"
    setSetting(k, v);
    updates[k] = SECRET_KEYS.has(k) ? "(secret aktualisiert)" : v;
  }
  return NextResponse.json({ ok: true, updates });
}
