// Eigene Metadaten für die VIBO-Welt: hier zeigt der Browser/PWA das eigene
// Manifest, sodass „Mein VIBO" als separate App installiert werden kann.
export const metadata = {
  title: "Mein VIBO – Welt & Pflege",
  description: "Karte, Basar und Pflege — dein VIBO in der echten Welt.",
  manifest: "/karte/manifest.webmanifest",
  applicationName: "Mein VIBO",
  appleWebApp: {
    capable: true,
    title: "Mein VIBO",
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

export default function KarteLayout({ children }) {
  return children;
}
