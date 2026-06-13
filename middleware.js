// Middleware: alle Seiten nur eingeloggt. Wer nicht eingeloggt ist, landet auf /login.
// Whitelist: /login, /api/auth/*, /api/ping, /api/maintenance, /api/push/key,
//            /manifest.*, /sw.js, /icon-*.png, /apple-icon.png, /datenschutz, /impressum,
//            /_next/*, /favicon.ico
//
// Hinweis: Wir prüfen nur das Vorhandensein des Session-Cookies (nicht Validität),
// weil Middleware in der Edge-Runtime läuft und die SQLite-DB nicht erreichbar wäre.
// Die echte Auth-Prüfung passiert weiter über getSessionUser() in den Routen.

import { NextResponse } from "next/server";

const COOKIE = "vv_session";

// Alles was OHNE Session erreichbar bleiben muss
const PUBLIC_EXACT = new Set([
  "/login",
  "/datenschutz",
  "/impressum",
  "/favicon.ico",
  "/sw.js",
  "/manifest.webmanifest",
  "/robots.txt",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-icon.png",
  "/api/stripe/webhook",  // Stripe-Webhook hat Signatur-Auth statt Session
]);

const PUBLIC_PREFIX = [
  "/_next/",
  "/api/auth/",       // login/register/logout
  "/api/ping",        // health/presence ping
  "/api/maintenance", // wartungsfenster lesen
  "/api/push/key",    // VAPID public key zum subscriben
  "/api/admin/",      // admin-routes sichern sich selbst
];

export function middleware(req) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_EXACT.has(pathname)) return NextResponse.next();
  for (const p of PUBLIC_PREFIX) {
    if (pathname.startsWith(p)) return NextResponse.next();
  }
  if (pathname.endsWith("/manifest.webmanifest")) return NextResponse.next(); // sub-PWAs

  // Eingeloggt? Cookie da → durchlassen, sonst auf /login redirect.
  const session = req.cookies.get(COOKIE)?.value;
  if (session) return NextResponse.next();

  // Für API-Aufrufe: 401 statt Redirect (sonst kriegt das Frontend Redirect-HTML)
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "auth required" }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // Auf alle Seiten matchen, statische Dateien ausnehmen
  matcher: [
    "/((?!_next/static|_next/image|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff2?|ttf|otf|css|js|map)$).*)",
  ],
};
