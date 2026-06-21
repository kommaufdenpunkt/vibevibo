// 🌍 Public-URL hinter Reverse-Proxy (Traefik/Coolify) erkennen.
// Sonst denkt Next.js der Origin sei localhost:3000 — kaputt für OAuth-Callbacks.
//
// Reihenfolge:
//   1. process.env.PUBLIC_BASE_URL (Override per ENV)
//   2. x-forwarded-host + x-forwarded-proto Header
//   3. Host-Header (Fallback)
//   4. req.url Origin (letzter Ausweg)

export function getPublicOrigin(req) {
  const fromEnv = process.env.PUBLIC_BASE_URL;
  if (fromEnv) return String(fromEnv).replace(/\/$/, "");

  try {
    const fwdHost = req.headers.get("x-forwarded-host");
    const fwdProto = req.headers.get("x-forwarded-proto");
    if (fwdHost) {
      const proto = fwdProto || "https";
      return `${proto}://${fwdHost.split(",")[0].trim()}`;
    }
    const host = req.headers.get("host");
    if (host && !host.startsWith("localhost")) {
      return `https://${host}`;
    }
  } catch {}

  try { return new URL(req.url).origin; } catch {}
  return "https://vibevibo.de";
}
