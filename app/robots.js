// 🤖 robots.txt — dynamisch generiert.
// Ziel: AdSense-Bots, Googlebot, Bingbot etc. sollen NUR die fertigen
// Public-Pages crawlen. Mod-Bereich, Admin-Bereich, API-Routes, halbfertige
// "Coming-Soon"-Pages bleiben außen vor → wirken nicht mehr wie "Low Quality"
// in AdSense-Reviews.

export default function robots() {
  const base = "https://vibevibo.de";

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/about",
          "/faq",
          "/hilfe",
          "/neu",
          "/agb",
          "/datenschutz",
          "/impressum",
          "/installieren",
          "/coms",
          "/coms/", // alle einzelnen Coms-Pages
          "/profile/", // öffentliche Profil-Seiten
        ],
        disallow: [
          // 🔒 Mod-Bereich — komplett raus, alle Subpaths
          "/mcp",
          "/mcp/",
          // 🔒 Admin-Bereich (legacy /admin/* — neue Site läuft auf admin.vibevibo.de)
          "/admin",
          "/admin/",
          "/adminpanel",
          "/adminpanel/",
          // 🔒 APIs — nie crawlen
          "/api/",
          // 🔒 Halbfertige Bereiche (vermeidet "Under-Construction"-Eindruck)
          "/wuensche",
          "/system-nachrichten",
          // 🔒 Private Routen die Auth brauchen
          "/messenger",
          "/messenger/",
          "/freunde",
          "/vibo",
          "/vibo/",
          "/crushes",
          "/blockierte",
          "/erinnerungen",
          "/live",
          "/live/",
          "/profile/transactions",
          "/profile/status",
          "/shop",
          "/shop/",
          "/vibes-verdienen",
          // 🔒 Next.js Internals
          "/_next/",
        ],
      },
      {
        // 💸 AdSense-Bot bekommt zusätzliche Whitelist für saubere Auswertung
        userAgent: "Mediapartners-Google",
        allow: [
          "/",
          "/about",
          "/faq",
          "/hilfe",
          "/agb",
          "/datenschutz",
          "/impressum",
          "/coms",
          "/coms/",
          "/profile/",
        ],
        disallow: [
          "/mcp/", "/admin/", "/adminpanel/", "/api/",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
