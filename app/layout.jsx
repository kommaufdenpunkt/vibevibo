import "./globals.css";
import Layout from "@/components/Layout";
import InstallPrompt from "@/components/InstallPrompt";
import ScreenshotGuard from "@/components/ScreenshotGuard";
import MessageNotifier from "@/components/MessageNotifier";
import ChatOverlay from "@/components/ChatOverlay";
import InstallHelp from "@/components/InstallHelp";
import PushSetup from "@/components/PushSetup";
import { MeProvider } from "@/lib/useMe";

export const metadata = {
  title: "VibeVibo - die nostalgische Community",
  description:
    "VibeVibo bringt das Gefühl von MySpace, SchülerVZ, Jappy, Lokalisten und wer-kennt-wen zurück. Profile mit Hintergrundmusik, Pinnwand, Geschenke, Fotos, Gruppen und Echtzeit-Messenger.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body>
        <MeProvider>
          <Layout>{children}</Layout>
          <InstallPrompt />
          <ScreenshotGuard />
          <MessageNotifier />
          <ChatOverlay />
          <InstallHelp />
          <PushSetup />
        </MeProvider>
      </body>
    </html>
  );
}
