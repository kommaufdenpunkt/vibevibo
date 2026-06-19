// 🛡 CSRF-Schutz via Double-Submit-Cookie-Pattern.
// ⚠ EDGE-SAFE: keine Node-only Imports (kein `node:crypto`, kein `next/headers`).
//
// Funktioniert so:
//   1. Middleware setzt bei jeder Response einen `vv_csrf`-Cookie (NICHT httpOnly,
//      damit JS ihn lesen kann) — pro Browser-Session konstant.
//   2. State-Changes (POST/PUT/DELETE/PATCH) MÜSSEN den gleichen Wert im Header
//      `x-csrf-token` mitschicken.
//   3. Server prüft Cookie === Header. Wenn nicht → 403.
//
// Sichere Methoden (GET, HEAD, OPTIONS) brauchen keinen Token.

export const CSRF_COOKIE = "vv_csrf";
export const CSRF_HEADER = "x-csrf-token";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const CSRF_EXEMPT_PREFIXES = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/_internal/",
  "/api/stripe/webhook",
  "/api/ping",
];

// Web-Crypto-API (in Edge UND Node verfügbar) statt node:crypto
export function generateCsrfToken() {
  const bytes = new Uint8Array(24);
  // globalThis.crypto ist sowohl in Edge-Runtime als auch in Node 19+ verfügbar
  globalThis.crypto.getRandomValues(bytes);
  // base64url (ohne Padding) — manuell, da btoa() existiert in Edge
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

export function ensureCsrfCookie(req, res) {
  const existing = req.cookies?.get?.(CSRF_COOKIE)?.value;
  if (existing && existing.length >= 16) return existing;
  const token = generateCsrfToken();
  res.cookies.set(CSRF_COOKIE, token, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return token;
}

export function verifyCsrf(req) {
  const method = (req.method || "GET").toUpperCase();
  if (SAFE_METHODS.has(method)) return { ok: true, reason: "" };

  let path = "/";
  try { path = new URL(req.url).pathname; } catch {}
  for (const p of CSRF_EXEMPT_PREFIXES) {
    if (path.startsWith(p)) return { ok: true, reason: "exempt" };
  }

  const cookieHeader = req.headers.get("cookie") || "";
  const m = cookieHeader.match(new RegExp("(?:^|;\\s*)" + CSRF_COOKIE + "=([^;]+)"));
  const cookieTok = m ? decodeURIComponent(m[1]) : "";
  const hdrTok = req.headers.get(CSRF_HEADER) || "";

  if (!cookieTok || !hdrTok) return { ok: false, reason: "CSRF-Token fehlt." };
  if (cookieTok.length !== hdrTok.length) return { ok: false, reason: "CSRF-Token ungültig." };
  // Konstante-Zeit-Vergleich
  let diff = 0;
  for (let i = 0; i < cookieTok.length; i++) {
    diff |= cookieTok.charCodeAt(i) ^ hdrTok.charCodeAt(i);
  }
  if (diff !== 0) return { ok: false, reason: "CSRF-Token ungültig." };
  return { ok: true, reason: "" };
}

export function verifyOrigin(req, allowed = ["https://vibevibo.de", "https://mcp.vibevibo.de"]) {
  const method = (req.method || "GET").toUpperCase();
  if (SAFE_METHODS.has(method)) return { ok: true };

  const origin = req.headers.get("origin") || "";
  const referer = req.headers.get("referer") || "";
  const host = req.headers.get("host") || "";

  if (origin) {
    try {
      const o = new URL(origin);
      if (o.host === host) return { ok: true };
      if (allowed.some((a) => origin.startsWith(a))) return { ok: true };
    } catch {}
    return { ok: false, reason: "Origin nicht erlaubt." };
  }
  if (referer) {
    try {
      const r = new URL(referer);
      if (r.host === host) return { ok: true };
      if (allowed.some((a) => referer.startsWith(a))) return { ok: true };
    } catch {}
    return { ok: false, reason: "Referer nicht erlaubt." };
  }
  if (process.env.NODE_ENV === "production") {
    return { ok: false, reason: "Origin/Referer fehlt." };
  }
  return { ok: true };
}
