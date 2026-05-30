/** @type {import('next').NextConfig} */

// Sicherheits-Header — werden auf JEDE Antwort gesetzt.
// CSP ist bewusst pragmatisch: erlaubt Inline-Styles (wir nutzen viele style=-Props)
// und Inline-Scripte (Next.js braucht das für Hydration). Default-src ist 'self',
// alles andere wird explizit freigeschaltet (YouTube/Bild-Embeds, Web-Push).
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://proxycheck.io https://generativelanguage.googleapis.com",
  "frame-src https://www.youtube.com https://www.youtube-nocookie.com",
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
  { key: "Permissions-Policy", value: "geolocation=(), payment=(), usb=(), magnetometer=(), accelerometer=(), camera=(self), microphone=(self)" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "Content-Security-Policy", value: csp },
  // X-XSS-Protection ist deprecated und in modernen Browsern eher schädlich; weggelassen.
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
