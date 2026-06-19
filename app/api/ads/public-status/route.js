import { NextResponse } from "next/server";
import { getDisplayConfig } from "@/lib/ads";

// 📢 Public-Variante des /api/ads/status-Endpoints — KEIN Login nötig.
// Liefert ausschließlich die Display-Provider-Konfiguration (Pub-ID, Provider,
// Auto-Ads-Flag) — KEINE User-spezifischen Daten.
//
// Wird vom AdSenseLoader gerufen, wenn der Besucher NICHT eingeloggt ist
// (anonyme Public-Pages wie /about, /faq, /agb).
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const display = getDisplayConfig();
  return NextResponse.json({
    config: { display },
    public: true,
  }, {
    headers: {
      "Cache-Control": "public, max-age=300", // 5 Min Cache, da public
    },
  });
}
