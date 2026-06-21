// 🌍 Public-URL hinter Reverse-Proxy (Traefik/Coolify) erkennen.
// Sonst denkt Next.js der Origin sei localhost:3000 — kaputt für OAuth-Callbacks.
//
// Reihenfolge:
//   1. process.env.PUBLIC_BASE_URL (Override per ENV)
//   2. x-forwarded-host + x-forwarded-proto Header
//   3. Host-Header (Fallback)
//   4. req.url Origin (letzter Ausweg)
//
// Exportiert zwei Namen: getPublicOrigin und getPublicBaseUrl (alias) —
// beide tun das gleiche, je nach Aufrufer.

export function getPublicOrigin(req) {
  const fromEnv = process.env.PUBLIC_BASE_URL;
  if (fromEnv) return String(fromEnv).replace(/\/$/, "");

  if (req) {
    try {
      const fwdHost = req.headers?.get?.("x-forwarded-host");
      const fwdProto = req.headers?.get?.("x-forwarded-proto");
      if (fwdHost) {
        const proto = fwdProto || "https";
        return `${proto}://${fwdHost.split(",")[0].trim()}`;
      }
      const host = req.headers?.get?.("host");
      if (host && !host.startsWith("localhost")) {
        return `https://${host}`;
      }
    } catch {}

    try { return new URL(req.url).origin; } catch {}
  }

  // Letzter Fallback — wenn nichts anderes geht
  return "https://vibevibo.de";
}

// Alias für Kompatibilität mit existierendem Social-Auth-System
export const getPublicBaseUrl = getPublicOrigin;
