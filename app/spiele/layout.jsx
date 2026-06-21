// Eigene Metadaten fuer die Spiele-PWA: Browser/PWA verwendet hier
// das Spiele-Manifest, sodass die App separat als VibeVibo Spiele installiert
// werden kann (eigenes Icon, orange Splash, eigener Scope /spiele/).
export const metadata = {
  title: "VibeVibo Spiele",
  description: "Live spielen mit Freunden — Würfel, UNO, Mensch ärgere dich & mehr.",
  manifest: "/spiele/manifest.webmanifest",
  applicationName: "VV Spiele",
  appleWebApp: {
    capable: true,
    title: "VV Spiele",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
};

export const viewport = {
  themeColor: "#f97316",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function SpieleLayout({ children }) {
  return children;
}
