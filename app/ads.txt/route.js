// 📄 ads.txt — AdSense-Inhaberschaft + Monetarisierung.
// Google crawlt https://vibevibo.de/ads.txt direkt (kein JS, kein Consent-Gate),
// daher die zuverlässigste Bestätigungsmethode.
//
// Format: <ad-system>, <publisher-id>, <relationship>, <cert-authority-id>
// Die Cert-Authority-ID f08c47fec0942fa0 ist Googles fester Wert (für alle gleich).

export const dynamic = "force-static";
export const runtime = "nodejs";

const PUBLISHER = "pub-5836349081678756";

export async function GET() {
  const body = `google.com, ${PUBLISHER}, DIRECT, f08c47fec0942fa0\n`;
  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
