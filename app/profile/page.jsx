"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMe } from "@/lib/useMe";
import { api } from "@/lib/api";
import MyNostalgicProfile from "@/components/MyNostalgicProfile";

export default function MyProfilePage() {
  const { me, loading } = useMe();
  const router = useRouter();
  const [data, setData] = useState(null);

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

  if (loading || !me) return null;
  if (!data) return <div className="vv-card">Lädt...</div>;

  return (
    <MyNostalgicProfile
      profile={data.user}
      pinnwand={data.pinnwand}
      guestbook={data.guestbook}
      gifts={data.gifts}
      visitCount={data.visitCount}
      visitors={data.visitors}
      onChange={load}
    />
  );
}
