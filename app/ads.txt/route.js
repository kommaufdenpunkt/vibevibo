import { getSetting } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// 📄 Dynamische ads.txt — Google AdSense verlangt diese Datei zur Verifikation
// der Publisher-ID. Wenn ADSENSE_PUB_ID gesetzt, wird der passende Eintrag
// zurückgegeben, sonst eine leere Datei (200 OK).
export async function GET() {
  let pubId = "";
  try { pubId = String(getSetting("ADSENSE_PUB_ID", "") || ""); } catch {}
  if (!pubId) pubId = process.env.ADSENSE_PUB_ID || "";
  // Format: domain, account-id, type, certification-authority-id
  // Google AdSense direct: f08c47fec0942fa0
  const lines = [];
  if (pubId) {
    // ADSENSE_PUB_ID hat Format "ca-pub-XXXXX" — wir brauchen nur "pub-XXXXX"
    const clean = pubId.replace(/^ca-/, "");
    lines.push(`google.com, ${clean}, DIRECT, f08c47fec0942fa0`);
  }
  const body = lines.length > 0 ? lines.join("\n") + "\n" : "# noch keine Werbe-Partner konfiguriert\n";
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
