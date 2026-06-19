// 🤖 robots.txt — als Route-Handler (gleicher Pattern wie ads.txt + sitemap.xml).
//
// AdSense-Crawler MUSS Mediapartners-Google + AdsBot-Google freien Zugang haben.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://vibevibo.de";

export async function GET() {
  const lines = [
    "# 🤖 VibeVibo robots.txt",
    "",
    "# AdSense + Werbe-Crawler — VOLLER ZUGRIFF (sonst kann keine Werbung ausgespielt werden)",
    "User-agent: Mediapartners-Google",
    "Allow: /",
    "",
    "User-agent: AdsBot-Google",
    "Allow: /",
    "",
    "User-agent: AdsBot-Google-Mobile",
    "Allow: /",
    "",
    "User-agent: Google-AdSense-Crawler",
    "Allow: /",
    "",
    "# Allgemeine Suchmaschinen — nur öffentliche Seiten",
    "User-agent: *",
    "Allow: /",
    "Allow: /about",
    "Allow: /faq",
    "Allow: /hilfe",
    "Allow: /agb",
    "Allow: /datenschutz",
    "Allow: /impressum",
    "Allow: /neu",
    "Disallow: /api/",
    "Disallow: /admin/",
    "Disallow: /mcp/",
    "Disallow: /messenger/",
    "Disallow: /messenger",
    "Disallow: /profile/edit",
    "Disallow: /profile/skin",
    "Disallow: /profile/status",
    "Disallow: /profile/transactions",
    "Disallow: /vibo/",
    "Disallow: /login",
    "Disallow: /register",
    "Disallow: /installieren",
    "Disallow: /_next/",
    "Disallow: /u/",
    "Disallow: /users/",
    "",
    "# KI-Scraper sperren (ohne Erlaubnis kein Training)",
    "User-agent: GPTBot",
    "Disallow: /",
    "",
    "User-agent: ClaudeBot",
    "Disallow: /",
    "",
    "User-agent: anthropic-ai",
    "Disallow: /",
    "",
    "User-agent: CCBot",
    "Disallow: /",
    "",
    "User-agent: Google-Extended",
    "Disallow: /",
    "",
    "User-agent: PerplexityBot",
    "Disallow: /",
    "",
    `Sitemap: ${BASE}/sitemap.xml`,
    "",
  ];
  return new Response(lines.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
