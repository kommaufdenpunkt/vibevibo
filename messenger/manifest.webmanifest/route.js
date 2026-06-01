// Eigenes PWA-Manifest fuer den Messenger (separat installierbar).
export const dynamic = "force-static";

export function GET() {
  const body = JSON.stringify({
    id: "/messenger/",
    name: "VibeVibo Messenger",
    short_name: "VV Messenger",
    description: "Schreiben wie damals – ICQ-Oh-Oh inklusive.",
    start_url: "/messenger",
    scope: "/messenger/",
    display: "standalone",
    background_color: "#1f5fa8",
    theme_color: "#2d7dd2",
    orientation: "portrait",
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
