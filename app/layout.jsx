import "./globals.css";
import Layout from "@/components/Layout";
import PwaRegister from "@/components/PwaRegister";
import ScreenshotGuard from "@/components/ScreenshotGuard";
import MessageNotifier from "@/components/MessageNotifier";
import ChatOverlay from "@/components/ChatOverlay";
import PushSetup from "@/components/PushSetup";
import PopunderScript from "@/components/PopunderScript";
import SocialBarScript from "@/components/SocialBarScript";
import InPagePushScript from "@/components/InPagePushScript";
import LiveCallShell from "@/components/LiveCallShell";
import IdleGuard from "@/components/IdleGuard";
import MaintenanceGate from "@/components/MaintenanceGate";
import CookieConsentBanner from "@/components/CookieConsentBanner";
import { MeProvider } from "@/lib/useMe";
import { THEME_BOOTSTRAP } from "@/lib/useTheme";

export const metadata = {
  title: "VibeVibo - die nostalgische Community",
  description:
    "VibeVibo bringt das Gefühl von MySpace, SchülerVZ, Jappy, Lokalisten und wer-kennt-wen zurück. Profile mit Hintergrundmusik, Pinnwand, Geschenke, Fotos, Gruppen und Echtzeit-Messenger.",
  applicationName: "VibeVibo",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "VibeVibo",
    statusBarStyle: "black-translucent",
    startupImage: ["/icon-512.png"],
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/icon-192.png"],
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "VibeVibo",
    "msapplication-TileColor": "#ff3e9d",
    "msapplication-tap-highlight": "no",
  },
};

export const viewport = {
  themeColor: "#ff3e9d",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body>
        <MeProvider>
          <Layout>{children}</Layout>
          <PwaRegister />
          <ScreenshotGuard />
          <MessageNotifier />
          <ChatOverlay />
          <PushSetup />
          <PopunderScript />
          <SocialBarScript />
          <InPagePushScript />
          <LiveCallShell />
          <IdleGuard />
          <MaintenanceGate />
          <CookieConsentBanner />
        </MeProvider>
      </body>
    </html>
  );
}
