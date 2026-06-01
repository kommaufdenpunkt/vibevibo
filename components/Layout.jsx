"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Banner from "@/components/Banner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useMe } from "@/lib/useMe";

// Entscheidet ob Banner/Navbar gezeigt werden.
// - Landing (/) ohne Login: nur die nackte Landing
// - Messenger AUF MOBILE: vollflächig PWA-Style (kein Navbar/Footer)
// - Messenger AUF DESKTOP: ganz normal eingebettet wie andere Seiten
export default function Layout({ children }) {
  const { me, loading } = useMe();
  const pathname = usePathname();
  const isLanding = pathname === "/" && !me && !loading;
  const isMessenger =
    !!pathname &&
    pathname.startsWith("/messenger") &&
    pathname !== "/messenger/manifest.webmanifest";

  // Mobile = <900px Bildschirmbreite. SSR rendert konservativ Mobile,
  // nach Mount wird's korrigiert falls Desktop (kurzer Flash auf Desktop ok).
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

  if (isMessenger && isMobile) {
    // Vollflächiger PWA-Modus auf Mobile
    return <div className="vv-app-fullscreen">{children}</div>;
  }

  // Standard-Layout für alle anderen Seiten (inkl. Messenger auf Desktop)
  return (
    <div className="vv-page">
      <Banner />
      <Navbar />
      {children}
      <Footer />
    </div>
  );
}

