"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Banner from "@/components/Banner";
import Navbar from "@/components/Navbar";
import EdgePanels from "@/components/EdgePanels";
import StatusStrip from "@/components/StatusStrip";
import Footer from "@/components/Footer";
import { useMe } from "@/lib/useMe";

// Entscheidet ob Banner/Navbar gezeigt werden.
// - Landing (/) ohne Login: nur die nackte Landing
// - Messenger AUF MOBILE: vollflächig PWA (position:fixed inset:0)
// - Messenger AUF DESKTOP: in vv-page eingebettet wie andere Seiten,
//   Höhe begrenzt damit Banner+Footer drumherum sichtbar bleiben
export default function Layout({ children }) {
  const { me, loading } = useMe();
  const pathname = usePathname();
  const isLanding = pathname === "/" && !me && !loading;
  const isMessengerApp =
    !!pathname &&
    pathname.startsWith("/messenger") &&
    pathname !== "/messenger/manifest.webmanifest";

  // SSR-default: mobile (sicher). Nach Mount korrekt.
  const [isMobile, setIsMobile] = useState(true);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 900);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (isLanding) {
    return (
      <div className="vv-landing-wrapper">
        {children}
        <Footer />
      </div>
    );
  }

  if (isMessengerApp && isMobile) {
    // Vollflächige Mobile-PWA — Inhalt regelt alles selbst
    return <div className="vv-app-fullscreen">{children}</div>;
  }

  if (isMessengerApp) {
    // Desktop: Standard-Chrome drum, Messenger-Inhalt in Container mit fester Höhe
    return (
      <div className="vv-page">
        <Banner />
        <Navbar />
        <StatusStrip />
        <div className="vv-messenger-desktop-frame">{children}</div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="vv-page">
      <Banner />
      <Navbar />
        <StatusStrip />
      {children}
      <EdgePanels />
      <Footer />
    </div>
  );
}

