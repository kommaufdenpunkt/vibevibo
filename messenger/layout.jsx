// Eigene Metadaten fuer den Messenger-Bereich: Browser/PWA verwendet hier
// das Messenger-Manifest, sodass der Nutzer den Messenger als separate App
// installieren kann (eigenes Icon, eigener Name, eigener Theme).
export const metadata = {
  title: "VibeVibo Messenger",
  description: "Schreiben wie damals – ICQ-Oh-Oh inklusive.",
  manifest: "/messenger/manifest.webmanifest",
  applicationName: "VV Messenger",
  appleWebApp: {
    capable: true,
    title: "VV Messenger",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
};

export const viewport = {
  themeColor: "#2d7dd2",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function MessengerLayout({ children }) {
  return children;
}
