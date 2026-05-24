import { NextResponse } from "next/server";

// Wenn die App über die Subdomain admin.vibevibo.de aufgerufen wird,
// zeige direkt das Admin-Panel (/admin) - ohne dass man /admin tippen muss.
// API-Routen und statische Assets bleiben unberührt.
export default function proxy(req) {
  const host = (req.headers.get("host") || "").toLowerCase();
  if (host.startsWith("admin.")) {
    const url = req.nextUrl.clone();
    if (!url.pathname.startsWith("/admin") && !url.pathname.startsWith("/api")) {
      url.pathname = "/admin";
      return NextResponse.rewrite(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon-192.png|icon-512.png|apple-icon.png|manifest.webmanifest|sw.js).*)",
  ],
};
