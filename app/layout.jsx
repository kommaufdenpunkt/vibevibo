import "./globals.css";
import Layout from "@/components/Layout";
import InstallPrompt from "@/components/InstallPrompt";
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
        </MeProvider>
      </body>
    </html>
  );
}
