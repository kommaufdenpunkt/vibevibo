"use client";

import { usePathname } from "next/navigation";
import Banner from "@/components/Banner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useMe } from "@/lib/useMe";

// Entscheidet ob Banner/Navbar gezeigt werden.
// - Landing (/) ohne Login: nur die nackte Landing
// - Messenger-Detail (/messenger/USERNAME oder /messenger/rooms/ID): vollflächig, kein Navbar/Footer
export default function Layout({ children }) {
  const { me, loading } = useMe();
  const pathname = usePathname();
  const isLanding = pathname === "/" && !me && !loading;
  const isMessengerDetail =
    !!pathname &&
    pathname.startsWith("/messenger/") &&
    pathname !== "/messenger/manifest.webmanifest";

  if (isLanding) {
    return (
      <div className="vv-landing-wrapper">
        {children}
        <Footer />
      </div>
    );
  }

  if (isMessengerDetail) {
    // Vollflächiger PWA-Modus: Chat-Seite kümmert sich um alles selbst.
    return <div className="vv-app-fullscreen">{children}</div>;
  }

  return (
    <div className="vv-page">
      <Banner />
      <Navbar />
      {children}
      <Footer />
    </div>
  );
}

