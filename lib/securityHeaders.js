// 🛡 Security-Headers — wird in middleware.js auf jede Response angewendet.
//
// Header-Pakete:
//   • HSTS — HTTPS-Only erzwingen (auch für Subdomains, preload-fähig)
//   • X-Frame-Options — Clickjacking-Schutz (DENY für MCP, SAMEORIGIN sonst)
//   • X-Content-Type-Options — kein MIME-Sniffing
//   • Referrer-Policy — keine Referrer-Leaks
//   • Permissions-Policy — Browser-APIs einschränken
//   • CSP — Skript-Quellen einschränken (strict für MCP, permissiv für Main)

const HSTS = "max-age=63072000; includeSubDomains; preload";

const COMMON_HEADERS = {
  "Strict-Transport-Security": HSTS,
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Permitted-Cross-Domain-Policies": "none",
  "Permissions-Policy": [
    "geolocation=(self)",
    "microphone=(self)",
    "camera=(self)",
    "payment=(self)",
    "fullscreen=(self)",
    "interest-cohort=()",
    "browsing-topics=()",
    "magnetometer=()",
    "gyroscope=()",
    "accelerometer=()",
  ].join(", "),
};

// CSP für Main-Site — bewusst tolerant (AdSense + Google Fonts + Inline-Scripts erlaubt).
// Wer es härter will, kann später Nonces einsetzen.
const CSP_MAIN = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://pagead2.googlesyndication.com https://*.googlesyndication.com https://*.google.com https://*.googletagservices.com https://*.googleadservices.com https://*.doubleclick.net",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: data:",
  "connect-src 'self' https://pagead2.googlesyndication.com https://*.googlesyndication.com https://*.google.com https://*.doubleclick.net wss: https:",
  "frame-src 'self' https://*.googlesyndication.com https://*.doubleclick.net https://*.google.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "upgrade-insecure-requests",
].join("; ");

// CSP für MCP — strenger: KEINE Drittanbieter außer Google Fonts.
// KEIN unsafe-eval, KEIN AdSense, KEIN Tracking.
const CSP_MCP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "media-src 'self' blob: data:",
  "connect-src 'self'",
  "frame-src 'none'",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

/**
 * Wendet Security-Headers auf eine NextResponse an.
 * @param {NextResponse} res
 * @param {{ isMcp?: boolean, isApi?: boolean }} opts
 */
export function applySecurityHeaders(res, { isMcp = false, isApi = false } = {}) {
  if (!res || !res.headers) return res;
  for (const [k, v] of Object.entries(COMMON_HEADERS)) {
    res.headers.set(k, v);
  }
  // X-Frame: MCP komplett dicht, sonst nur same-origin
  res.headers.set("X-Frame-Options", isMcp ? "DENY" : "SAMEORIGIN");
  // CSP: nur auf HTML-Responses sinnvoll, nicht auf API-JSON
  if (!isApi) {
    res.headers.set("Content-Security-Policy", isMcp ? CSP_MCP : CSP_MAIN);
  }
  // Spezial für MCP: kein Caching, keine Referrer, kein Indexing
  if (isMcp) {
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.headers.set("Pragma", "no-cache");
    res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    res.headers.set("Referrer-Policy", "no-referrer");
  }
  return res;
}
