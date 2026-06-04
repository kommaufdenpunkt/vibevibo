export default function manifest() {
  return {
    name: "VibeVibo - die nostalgische Community",
    short_name: "VibeVibo",
    description:
      "Die kleine, persönliche Community für alle, die das Internet von früher vermissen.",
    start_url: "/",
    scope: "/",
    id: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui", "browser"],
    background_color: "#0a0420",
    theme_color: "#ff3e9d",
    orientation: "portrait",
    lang: "de",
    dir: "ltr",
    categories: ["social", "lifestyle", "entertainment"],
    prefer_related_applications: false,
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      {
        name: "Messenger",
        short_name: "Messenger",
        description: "Direkt zum VibeVibo-Messenger",
        url: "/messenger",
        icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Mein VIBO",
        short_name: "VIBO",
        description: "Karte, Basar & Pflege",
        url: "/karte",
        icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Live",
        short_name: "Live",
        description: "Solo & Multi-Live, Chat, Emotes",
        url: "/live",
        icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Mein Profil",
        short_name: "Profil",
        url: "/profile",
        icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
