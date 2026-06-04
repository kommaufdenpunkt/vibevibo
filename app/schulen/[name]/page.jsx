"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { use } from "react";
import Avatar from "@/components/Avatar";
import { ColoredName } from "@/components/GenderAge";
import OnlineName from "@/components/OnlineName";

export default function SchulePage({ params }) {
  const { name } = use(params);
  const decoded = decodeURIComponent(name);
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch(`/api/schools/${encodeURIComponent(decoded)}`)
      .then((r) => r.json()).then(setData);
  }, [decoded]);

  return (
    <div className="vv-card">
      <Link href="/schulen" style={{ fontSize: 13 }}>← Alle Schulen</Link>
      <h2 style={{ margin: "8px 0 4px" }}>🏫 {decoded}</h2>
      {data === null && <div className="vv-muted">Lade Mitglieder…</div>}
      {data && data.users && (
        <>
          <div className="vv-muted" style={{ fontSize: 13, marginBottom: 14 }}>
            {data.users.length} {data.users.length === 1 ? "Mitglied" : "Mitglieder"} aus dieser Schule
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
            {data.users.map((u) => (
              <Link key={u.id} href={`/u/${u.username}`}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: 10,
                  borderRadius: 10, background: "rgba(255,255,255,0.06)",
                  textDecoration: "none", border: "1px solid rgba(255,255,255,0.1)",
                }}>
                <Avatar url={u.avatarUrl} name={u.displayName} className="vv-avatar vv-avatar-sm" />
                <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                  <OnlineName lastSeen={u.lastSeen}>
                    <ColoredName gender={u.gender} age={u.age} name={u.displayName} />
                  </OnlineName>
                  {u.mood && <div style={{ fontSize: 11, opacity: 0.7, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.mood}</div>}
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
