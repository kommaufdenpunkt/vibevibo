"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMe } from "@/lib/useMe";
import { api } from "@/lib/api";
import MyNostalgicProfile from "@/components/MyNostalgicProfile";
import OnboardingModal from "@/components/OnboardingModal";

export default function MyProfilePage() {
  const { me, loading } = useMe();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const load = useCallback(async () => {
    if (!me) return;
    const d = await api.getUser(me.username);
    setData(d);
  }, [me]);

  useEffect(() => {
    if (loading) return;
    if (!me) {
      router.push("/login");
      return;
    }
    load();
  }, [me, loading, router, load]);

  // Onboarding-Modal: bei erstem Profil-Besuch (localStorage-Flag pro User),
  // ODER wenn URL ?onboarding=1 / ?tour=1 (Tutorial nochmal anzeigen).
  // window.location.search statt useSearchParams() — sonst Suspense-Pflicht beim Build.
  useEffect(() => {
    if (!me || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const forceShow = params.get("onboarding") === "1" || params.get("tour") === "1";
    if (forceShow) {
      try { localStorage.removeItem(`vv-onboarded-${me.id}`); } catch {}
      setShowOnboarding(true);
      return;
    }
    try {
      const k = `vv-onboarded-${me.id}`;
      if (!localStorage.getItem(k)) setShowOnboarding(true);
    } catch {}
  }, [me]);

  if (loading || !me) return null;
  if (!data) return <div className="vv-card">Lädt...</div>;

  return (
    <>
      <MyNostalgicProfile
        profile={data.user}
        pinnwand={data.pinnwand}
        guestbook={data.guestbook}
        gifts={data.gifts}
        visitCount={data.visitCount}
        visitors={data.visitors}
        onChange={load}
      />
      {showOnboarding && (
        <OnboardingModal user={me} onClose={() => { setShowOnboarding(false); load(); }} />
      )}
    </>
  );
}
