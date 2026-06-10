// Liefert die oeffentlich erreichbare Base-URL (Protokoll + Host) eines Requests.
// Reverse-Proxy hinter Coolify/Traefik: req.url zeigt auf localhost:3000.
// Daher: ENV-Override > x-forwarded-* Header > req.url Fallback.
export function getPublicBaseUrl(req) {
  const env = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || process.env.PUBLIC_URL;
  if (env) return String(env).replace(/\/$/, "");

  const headers = req?.headers;
  if (headers) {
    const proto = headers.get("x-forwarded-proto") || "https";
    const host = headers.get("x-forwarded-host") || headers.get("host");
    if (host) return `${proto}://${host}`;
  }

  try {
    const u = new URL(req.url);
    return `${u.protocol}//${u.host}`;
  } catch {
    return "";
  }
}
