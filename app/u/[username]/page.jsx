"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import ProfileView from "@/components/ProfileView";

export default function PublicProfilePage() {
  const params = useParams();
  const username = decodeURIComponent(params.username || "");
  const [data, setData] = useState(undefined); // undefined=loading, null=notfound

  const load = useCallback(async () => {
    try {
      const d = await api.getUser(username);
      setData(d);
    } catch (e) {
      if (e.status === 404) setData(null);
      else throw e;
    }
  }, [username]);

  useEffect(() => { load(); }, [load]);

  // Profilbesuch registrieren (Backend ignoriert Selbstbesuche & Spam)
  useEffect(() => {
    if (username) api.recordVisit(username).catch(() => {});
  }, [username]);

  if (data === undefined) return <div className="vv-card">Lädt...</div>;
  if (data === null) {
    return (
      <div className="vv-card">
        <h2>👻 Profil nicht gefunden</h2>
        <p>Den User „{username}" kennen wir leider nicht.</p>
        <Link href="/freunde" className="vv-btn">← Zur Mitgliederliste</Link>
      </div>
    );
  }

  return (
    <ProfileView
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
