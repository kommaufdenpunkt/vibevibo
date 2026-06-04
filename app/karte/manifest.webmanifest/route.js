// Eigenes PWA-Manifest für die VIBO-Welt (Karte/Basar/Pflege) — separat installierbar.
export const dynamic = "force-static";

export function GET() {
  const body = JSON.stringify({
    id: "/karte/",
    name: "Mein VIBO",
    short_name: "Mein VIBO",
    description: "Karte, Pflege & Basar für dein VIBO — Tamagotchi trifft echte Welt.",
    start_url: "/karte",
    scope: "/karte/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui", "browser"],
    background_color: "#0a0420",
    theme_color: "#ec4899",
    orientation: "portrait",
    lang: "de",
    dir: "ltr",
    categories: ["games", "lifestyle"],
    prefer_related_applications: false,
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  });
  return new Response(body, {
    headers: { "Content-Type": "application/manifest+json", "Cache-Control": "no-cache" },
  });
}
