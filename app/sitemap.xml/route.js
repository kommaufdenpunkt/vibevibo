export const dynamic = "force-dynamic";

// 📄 Statische Sitemap mit allen öffentlichen Seiten.
// Hilft AdSense/Suchmaschinen die Inhalte zu finden.
export async function GET() {
  const base = "https://vibevibo.de";
  const urls = [
    { loc: "/", changefreq: "daily", priority: 1.0 },
    { loc: "/about", changefreq: "monthly", priority: 0.8 },
    { loc: "/faq", changefreq: "monthly", priority: 0.7 },
    { loc: "/hilfe", changefreq: "monthly", priority: 0.7 },
    { loc: "/neu", changefreq: "weekly", priority: 0.6 },
    { loc: "/datenschutz", changefreq: "yearly", priority: 0.3 },
    { loc: "/impressum", changefreq: "yearly", priority: 0.3 },
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${base}${u.loc}</loc><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`).join("\n")}
</urlset>`;
  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
