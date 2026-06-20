import "./globals.css";
import Layout from "@/components/Layout";
import EdgePanels from "@/components/EdgePanels";
import PwaRegister from "@/components/PwaRegister";
import PwaInstallTracker from "@/components/PwaInstallTracker";
import MiniMusicDock from "@/components/MiniMusicDock";
import QuickDock from "@/components/QuickDock";
import GlobalAdFooter from "@/components/GlobalAdFooter";
import ScreenshotGuard from "@/components/ScreenshotGuard";
import MessageNotifier from "@/components/MessageNotifier";
import ChatOverlay from "@/components/ChatOverlay";
import PushSetup from "@/components/PushSetup";
import LiveCallShell from "@/components/LiveCallShell";
import IdleGuard from "@/components/IdleGuard";
import MaintenanceGate from "@/components/MaintenanceGate";
import CookieConsentBanner from "@/components/CookieConsentBanner";
import AdSenseLoader from "@/components/AdSenseLoader";
import NewsToast from "@/components/NewsToast";
import AchievementToast from "@/components/AchievementToast";
import DeleteCountdownBanner from "@/components/DeleteCountdownBanner";
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
    // 📢 Google AdSense Site-Verification — Publisher-ID hard-codiert
    "google-adsense-account": "ca-pub-5836349081678756",
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
        {/* ✨ Premium-Refinements: edle Typo, weichere Scroll-Animation, edle Focus-Rings */}
        <style dangerouslySetInnerHTML={{ __html: `
          * { -webkit-tap-highlight-color: transparent; }
          html, body {
            font-feature-settings: "tnum", "ss01", "kern";
            text-rendering: optimizeLegibility;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            scroll-behavior: smooth;
          }
          @media (prefers-reduced-motion: reduce) {
            *, *::before, *::after {
              animation-duration: 0.01ms !important;
              animation-iteration-count: 1 !important;
              transition-duration: 0.01ms !important;
              scroll-behavior: auto !important;
            }
          }
          /* Edle Fokus-Rings nur fuer Keyboard-Nutzer */
          :focus-visible {
            outline: 2px solid rgba(236, 72, 153, 0.6);
            outline-offset: 2px;
            border-radius: 4px;
          }
          /* Premium-Button-Klasse fuer Hover/Press */
          .vv-prem-btn {
            transition: transform 0.12s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.18s ease;
          }
          .vv-prem-btn:hover { transform: translateY(-1px); }
          .vv-prem-btn:active { transform: translateY(0) scale(0.98); }
          /* Premium-Tile mit Active-Lift */
          .vv-prem-tile { transition: transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s ease; }
          .vv-prem-tile:hover { transform: translateY(-2px) scale(1.012); }
          .vv-prem-tile:active { transform: translateY(0) scale(0.97); }
          /* Page-Mount-Animation */
          @keyframes vv-page-in {
            from { opacity: 0; transform: translateY(8px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          .vv-page-in { animation: vv-page-in 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        ` }} />
      </head>
      <body>
        <MeProvider>
          <Layout>{children}</Layout>
          <EdgePanels />
          <PwaRegister />
          <PwaInstallTracker />
          <MiniMusicDock />
          <QuickDock />
          <GlobalAdFooter />
          <ScreenshotGuard />
          <MessageNotifier />
          <ChatOverlay />
          <PushSetup />
          <LiveCallShell />
          <IdleGuard />
          <MaintenanceGate />
          <CookieConsentBanner />
          <AdSenseLoader />
          <NewsToast />
          <AchievementToast />
          <DeleteCountdownBanner />
        </MeProvider>
      </body>
    </html>
  );
}
