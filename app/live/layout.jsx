// Eigene Metadaten für /live: hier zeigt der Browser/PWA das eigene Live-Manifest,
// damit „VV Live" als separate App installiert werden kann.
export const metadata = {
  title: "VV Live — Solo, Multi-Couch & Emotes",
  description: "Live gehen wie damals — mit Couch, Chat und Emotes die fliegen.",
  manifest: "/live/manifest.webmanifest",
  applicationName: "VV Live",
  appleWebApp: {
    capable: true,
    title: "VV Live",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
};

export const viewport = {
  themeColor: "#ec4899",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function LiveLayout({ children }) {
  return children;
}
