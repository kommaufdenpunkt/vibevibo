// Eigenes PWA-Manifest fuer die Spiele-Lobby (separat installierbar).
export const dynamic = "force-static";

export function GET() {
  const body = JSON.stringify({
    id: "/spiele/",
    name: "VibeVibo Spiele",
    short_name: "VV Spiele",
    description: "Live spielen mit Freunden — Würfel, UNO, Mensch ärgere dich, Kniffel & mehr. Audio+Video läuft nebenbei.",
    start_url: "/spiele",
    scope: "/spiele/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui", "browser"],
    background_color: "#1e3a8a",
    theme_color: "#f97316",
    orientation: "portrait",
    lang: "de",
    dir: "ltr",
    categories: ["games", "social", "entertainment"],
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
