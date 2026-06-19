// 🤖 robots.txt via Next.js-Metadata-Konvention.
// Wichtig: Datei MUSS unter app/robots.js liegen (nicht .ts und nicht in einem Unterordner),
// damit Next.js 16 sie als robots-Metadata-File erkennt.
// AdSense-Crawler brauchen vollen Zugriff, sonst keine Werbung.

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://vibevibo.de";

export default function robots() {
  return {
    rules: [
      // AdSense-Bots — kritisch
      { userAgent: "Mediapartners-Google", allow: "/" },
      { userAgent: "AdsBot-Google", allow: "/" },
      { userAgent: "AdsBot-Google-Mobile", allow: "/" },
      { userAgent: "Google-AdSense-Crawler", allow: "/" },

      // Allgemeine Suchmaschinen — nur öffentliche Bereiche
      {
        userAgent: "*",
        allow: [
          "/",
          "/about",
          "/faq",
          "/hilfe",
          "/agb",
          "/datenschutz",
          "/impressum",
          "/neu",
        ],
        disallow: [
          "/api/",
          "/admin/",
          "/mcp/",
          "/messenger/",
          "/messenger",
          "/profile/edit",
          "/profile/skin",
          "/profile/status",
          "/profile/transactions",
          "/vibo/",
          "/login",
          "/register",
          "/installieren",
          "/_next/",
          "/u/",
          "/users/",
        ],
      },

      // KI-Scraper sperren
      { userAgent: "GPTBot", disallow: "/" },
      { userAgent: "ClaudeBot", disallow: "/" },
      { userAgent: "anthropic-ai", disallow: "/" },
      { userAgent: "CCBot", disallow: "/" },
      { userAgent: "Google-Extended", disallow: "/" },
      { userAgent: "PerplexityBot", disallow: "/" },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE.replace(/^https?:\/\//, ""),
  };
}
