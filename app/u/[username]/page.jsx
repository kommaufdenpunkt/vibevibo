"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import NostalgicProfileView from "@/components/NostalgicProfileView";

export default function PublicProfilePage() {
  const params = useParams();
  const username = decodeURIComponent(params.username || "");
  const [data, setData] = useState(undefined);

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

  useEffect(() => {
    if (username) api.recordVisit(username).catch(() => {});
  }, [username]);

  async function unblock() {
    try { await api.unblockUser(username); load(); }
    catch (e) { alert(e.message); }
  }

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
  if (data.blocked) {
    return (
      <div className="vv-card" style={{ textAlign: "center", padding: 30, maxWidth: 480, margin: "40px auto" }}>
        <div style={{ fontSize: 56 }}>🚫</div>
        <h2 style={{ color: "#7f1d1d" }}>Profil nicht erreichbar</h2>
        {data.block?.byMe ? (
          <>
            <p style={{ color: "#444" }}>
              Du hast <strong>@{username}</strong> blockiert. Solange die Sperre besteht,
              koennt ihr euch nicht schreiben, keine Pinnwand-Posts, keine Komplimente,
              keine Geschenke austauschen.
            </p>
            <button type="button" onClick={unblock} className="vv-btn vv-btn-pink">
              🔓 Sperre aufheben
            </button>
          </>
        ) : (
          <p style={{ color: "#444" }}>
            Dieses Profil ist fuer dich nicht zugaenglich.
          </p>
        )}
        <div style={{ marginTop: 14 }}>
          <Link href="/freunde" className="vv-btn">← Mitgliederliste</Link>
        </div>
      </div>
    );
  }

  return (
    <NostalgicProfileView
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
