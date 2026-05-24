"use client";

import { usePathname } from "next/navigation";
import Banner from "@/components/Banner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useMe } from "@/lib/useMe";

// Entscheidet ob Banner/Navbar gezeigt werden.
// Auf der Landing (/) ohne Login: nur die nackte Landing, ohne Page-Container.
export default function Layout({ children }) {
  const { me, loading } = useMe();
  const pathname = usePathname();
  const isLanding = pathname === "/" && !me && !loading;

  if (isLanding) {
    return (
      <div className="vv-landing-wrapper">
        {children}
        <Footer />
      </div>
    );
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
