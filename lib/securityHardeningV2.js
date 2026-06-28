// 🛡 Security-Hardening V2 — additive Layer ÜBER lib/securityHeaders.js.
// Wird in middleware.js NACH applySecurityHeaders aufgerufen — überschreibt
// ggf. existing Headers mit strengeren Werten.
//
// SETZT:
//   • Strict-Transport-Security (HSTS preload-ready, 2 Jahre, alle Subdomains)
//   • Content-Security-Policy (strict für MCP/admin, looser für main)
//   • X-Frame-Options DENY (kein Clickjacking)
//   • X-Content-Type-Options nosniff
//   • Referrer-Policy strict-origin-when-cross-origin
//   • Cross-Origin-Opener-Policy same-origin (Spectre-Schutz)
//   • Cross-Origin-Resource-Policy same-site
//   • X-Permitted-Cross-Domain-Policies none (alte Flash/PDF-Sache)
//   • X-DNS-Prefetch-Control off (für MCP/admin: kein DNS-Leak)
//   • Cache-Control für API: no-store (verhindert Cache von sensiblen Antworten)

const HSTS = "max-age=63072000; includeSubDomains; preload";

const CSP_MCP_ADMIN = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'", // Next.js braucht 'unsafe-inline' für SSR-Hydration
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: https: blob:",
  "media-src 'self' blob:",
  "connect-src 'self'",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join("; ");

const CSP_MAIN = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://pagead2.googlesyndication.com https://*.google.com https://*.gstatic.com https://*.googlesyndication.com https://*.doubleclick.net https://www.youtube.com https://s.ytimg.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: https: blob:",
  "media-src 'self' https: blob:",
  "connect-src 'self' https:",
  "frame-src 'self' https://*.google.com https://googleads.g.doubleclick.net https://*.googlesyndication.com https://www.youtube.com https://www.youtube-nocookie.com",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join("; ");

export function applyHardeningV2(res, { isMcp = false, isApi = false, isAdmin = false } = {}) {
  if (!res?.headers?.set) return res;
  const h = res.headers;

  // 1) HSTS — alle Antworten
  h.set("Strict-Transport-Security", HSTS);

  // 2) CSP — verschieden je nach Bereich
  const strict = isMcp || isAdmin;
  h.set("Content-Security-Policy", strict ? CSP_MCP_ADMIN : CSP_MAIN);

  // 3) Anti-Clickjacking
  h.set("X-Frame-Options", strict ? "DENY" : "SAMEORIGIN");

  // 4) MIME-Sniffing aus
  h.set("X-Content-Type-Options", "nosniff");

  // 5) Referrer minimal
  h.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // 6) Cross-Origin Isolation (Spectre)
  h.set("Cross-Origin-Opener-Policy", "same-origin");
  h.set("Cross-Origin-Resource-Policy", "same-site");

  // 7) Legacy / Misc
  h.set("X-Permitted-Cross-Domain-Policies", "none");
  h.set("X-Download-Options", "noopen"); // Legacy IE — schadet nicht

  // 8) DNS-Prefetch im sensiblen Bereich aus
  if (strict) {
    h.set("X-DNS-Prefetch-Control", "off");
  }

  // 9) API-Responses: NIEMALS cachen (sensitive Daten könnten geleakt werden)
  if (isApi) {
    h.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
    h.set("Pragma", "no-cache");
    h.set("Expires", "0");
    h.set("Surrogate-Control", "no-store");
  }

  return res;
}
