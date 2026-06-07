"use client";

import VibesNavBadge from "@/components/VibesNavBadge";
import NotificationsBell from "@/components/NotificationsBell";
import { useMe } from "@/lib/useMe";

export default function Banner() {
  const { me } = useMe();
  return (
    <div className="vv-banner">
      <div className="vv-logo">
        Vibe<span className="vv-logo-dot">★</span>Vibo
      </div>
      <div className="vv-slogan">
        ✿ deine Erinnerungen, deine Community, dein Vibe ✿
      </div>
      {me && (
        <div className="vv-banner-status">
          <VibesNavBadge />
          <NotificationsBell />
        </div>
      )}
    </div>
  );
}
