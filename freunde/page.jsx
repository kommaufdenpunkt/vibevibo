"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useMe } from "@/lib/useMe";
import { ColoredName } from "@/components/GenderAge";
import Avatar from "@/components/Avatar";
import ActivityBars from "@/components/ActivityBars";
import OnlineName from "@/components/OnlineName";
import { activityLevel, isOnlineActivity, formatLastActive } from "@/lib/activity";

export default function FriendsPage() {
  const { me } = useMe();
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    const load = () => api.listUsers().then((d) => setUsers(d.users)).catch(() => {});
    load();
    const t = setInterval(load, 20000); // Online-Status live halten
    return () => clearInterval(t);
  }, []);

  const list = users.filter((u) => {
    if (!filter) return true;
    const f = filter.toLowerCase();
    return (
      u.username.toLowerCase().includes(f) ||
      (u.displayName || "").toLowerCase().includes(f) ||
      (u.mood || "").toLowerCase().includes(f)
    );
  }).sort((a, b) => {
    const la = activityLevel(a.lastSeen);
    const lb = activityLevel(b.lastSeen);
    if (la !== lb) return lb - la;
    return (b.lastSeen || 0) - (a.lastSeen || 0);
  });

  return (
    <div className="vv-card">
      <h2>👯 Mitglieder & Freunde</h2>
      <input
        className="vv-input"
        placeholder="🔍 Suchen nach Name, Username oder Mood..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      <div className="vv-friends-grid vv-mt-12">
        {list.map((u) => (
          <Link key={u.username} className="vv-friend-tile" href={`/u/${u.username}`}>
            <Avatar url={u.avatarUrl} name={u.displayName} className="vv-avatar vv-avatar-md" />
            <span className="vv-friend-name">
              <OnlineName lastSeen={u.lastSeen}>
                <ColoredName gender={u.gender} age={u.age} name={u.displayName} size="0.95em" />
              </OnlineName>
            </span>
            <ActivityBars lastSeen={u.lastSeen} size="xs" />
            <span className="vv-muted" style={{ fontSize: 11 }}>
              {isOnlineActivity(u.lastSeen) ? (u.mood || "online") : `zuletzt ${formatLastActive(u.lastSeen)}`}
            </span>
          </Link>
        ))}
        {list.length === 0 && <div className="vv-muted">Keine Treffer.</div>}
      </div>
      {!me && (
        <p className="vv-muted vv-mt-12">
          Du bist nicht eingeloggt - <Link href="/login">jetzt einloggen</Link>, dann kannst
          du gruscheln, schreiben und Geschenke verschicken.
        </p>
      )}
    </div>
  );
}
