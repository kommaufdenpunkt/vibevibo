import { NextResponse } from "next/server";

// Admin-Panel NUR über die Subdomain admin.vibevibo.de erreichbar.
// - admin.vibevibo.de/...   -> intern auf /admin gemappt (Panel)
// - vibevibo.de/admin       -> gesperrt, leitet zur Startseite
export default function proxy(req) {
  const host = (req.headers.get("host") || "").toLowerCase();
  const url = req.nextUrl;
  const isAdminHost = host.startsWith("admin.");

  if (isAdminHost) {
    // Auf der Admin-Subdomain: alles (ausser API/Assets) auf /admin zeigen
    if (!url.pathname.startsWith("/admin") && !url.pathname.startsWith("/api")) {
      const u = url.clone();
      u.pathname = "/admin";
      return NextResponse.rewrite(u);
    }
    return NextResponse.next();
  }

  // Auf der Hauptdomain: /admin und /api/admin sind tabu -> weg damit
  if (url.pathname === "/admin" || url.pathname.startsWith("/admin/")) {
    const u = url.clone();
    u.pathname = "/";
    return NextResponse.redirect(u);
  }
  if (url.pathname.startsWith("/api/admin")) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon-192.png|icon-512.png|apple-icon.png|manifest.webmanifest|sw.js).*)",
  ],
};
