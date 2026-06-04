/** @type {import('next').NextConfig} */

// Sicherheits-Header — werden auf JEDE Antwort gesetzt.
// CSP erlaubt explizit alle Drittanbieter-Quellen die wir tatsaechlich nutzen:
// - Leaflet via unpkg
// - Karten-Tiles (CartoDB, OSM)
// - YouTube/Spotify Embeds
// - Werbeanbieter (Ezoic/Adsterra) + Survey/Offerwall-Provider
const csp = [
  "default-src 'self'",

  // Skripte: Leaflet, Werbe-SDKs, Provider
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'" +
    " https://unpkg.com" +                                  // Leaflet
    " https://www.ezojs.com https://*.ezoic.net" +          // Ezoic
    " https://*.profitableratecpm.com" +                    // Adsterra
    " https://offers.pollfish.com" +                        // Pollfish
    " https://offers.cpx-research.com" +                    // CPX Research
    " https://*.bitlabs.ai" +                               // Bitlabs
    " https://*.ayetstudios.com" +                          // AyetStudios
    " https://*.adgaterewards.com",                          // Adgate

  // Styles: Leaflet-CSS
  "style-src 'self' 'unsafe-inline' https://unpkg.com",

  // Bilder: Karten-Tiles + Werbung + alles HTTPS
  "img-src 'self' data: blob: https:",

  // Audio/Video: lokale + data/blob
  "media-src 'self' data: blob:",

  "font-src 'self' data:",

  // XHR/Fetch: Karten-Tiles (mehrere Anbieter als Fallback) + APIs
  "connect-src 'self'" +
    " https://proxycheck.io" +
    " https://generativelanguage.googleapis.com" +
    " https://api.pwnedpasswords.com" +
    " https://*.tile.openstreetmap.org" +
    " https://tile.openstreetmap.org" +
    " https://*.tile.openstreetmap.de" +
    " https://tile.openstreetmap.de" +
    " https://*.tile.openstreetmap.fr" +
    " https://tile.openstreetmap.fr" +
    " https://cartodb-basemaps-a.global.ssl.fastly.net" +
    " https://cartodb-basemaps-b.global.ssl.fastly.net" +
    " https://cartodb-basemaps-c.global.ssl.fastly.net" +
    " https://cartodb-basemaps-d.global.ssl.fastly.net" +
    " https://server.arcgisonline.com" +
    " https://overpass-api.de" +
    " https://api.open-meteo.com" +
    " https://*.ezoic.net" +
    " https://*.bitlabs.ai",

  // Iframes: YouTube + Spotify + Werbung
  "frame-src" +
    " https://www.youtube.com" +
    " https://www.youtube-nocookie.com" +
    " https://open.spotify.com" +
    " https://*.ezoic.net" +
    " https://offers.pollfish.com" +
    " https://*.bitlabs.ai" +
    " https://*.ayetstudios.com" +
    " https://*.adgaterewards.com" +
    " https://offers.cpx-research.com",

  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "geolocation=(self), payment=(), usb=(), magnetometer=(), accelerometer=(), camera=(self), microphone=(self)" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "Content-Security-Policy", value: csp },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
    ];
  },
};

module.exports = nextConfig;
