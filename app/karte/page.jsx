"use client";

import Link from "next/link";
import { useMe } from "@/lib/useMe";
import WorldMap from "@/components/WorldMap";
import PwaInfo from "@/components/PwaInfo";
import InstallNow from "@/components/InstallNow";

export default function KartePage() {
  const { me, loading } = useMe();
  if (loading) return null;
  if (!me) return (
    <div className="vv-card" style={{ textAlign: "center", padding: 30 }}>
      <h2>🗺️ Realitätskarte</h2>
      <p>Du musst eingeloggt sein, um die Karte zu nutzen.</p>
      <Link href="/login" className="vv-btn-big vv-btn-big-pink">Zum Login</Link>
    </div>
  );
  return (
    <>
      <InstallNow appName="Mein VIBO" appEmoji="🐾" appColor="#ec4899" />
      <PwaInfo id="pwa-vibo" appName="Mein VIBO" appEmoji="🐾"
        appPurpose="dein VIBO + die Realitätskarte" />
      <div className="vv-card" style={{ padding: 0, overflow: "hidden" }}>
        <WorldMap />
      </div>
    </>
  );
}
