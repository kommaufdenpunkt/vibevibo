// Eigenes PWA-Manifest für VV Live — separat installierbar.
export const dynamic = "force-static";

export function GET() {
  const body = JSON.stringify({
    id: "/live/",
    name: "VV Live",
    short_name: "VV Live",
    description: "Solo & Multi-Live mit Video, Audio, Chat und Emotes.",
    start_url: "/live",
    scope: "/live/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui", "browser"],
    background_color: "#831843",
    theme_color: "#ec4899",
    orientation: "portrait",
    lang: "de",
    dir: "ltr",
    categories: ["entertainment", "social"],
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
