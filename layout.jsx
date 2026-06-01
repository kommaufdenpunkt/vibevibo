import "./globals.css";
import Layout from "@/components/Layout";
import InstallPrompt from "@/components/InstallPrompt";
import ScreenshotGuard from "@/components/ScreenshotGuard";
import MessageNotifier from "@/components/MessageNotifier";
import ChatOverlay from "@/components/ChatOverlay";
import InstallHelp from "@/components/InstallHelp";
import PushSetup from "@/components/PushSetup";
import LiveCallShell from "@/components/LiveCallShell";
import IdleGuard from "@/components/IdleGuard";
import { MeProvider } from "@/lib/useMe";
import { THEME_BOOTSTRAP } from "@/lib/useTheme";

export const metadata = {
  title: "VibeVibo - die nostalgische Community",
  description:
    "VibeVibo bringt das Gefühl von MySpace, SchülerVZ, Jappy, Lokalisten und wer-kennt-wen zurück. Profile mit Hintergrundmusik, Pinnwand, Geschenke, Fotos, Gruppen und Echtzeit-Messenger.",
  applicationName: "VibeVibo",
  appleWebApp: {
    capable: true,
    title: "VibeVibo",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
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
          <InstallPrompt />
          <ScreenshotGuard />
          <MessageNotifier />
          <ChatOverlay />
          <InstallHelp />
          <PushSetup />
          <LiveCallShell />
          <IdleGuard />
        </MeProvider>
      </body>
    </html>
  );
}
