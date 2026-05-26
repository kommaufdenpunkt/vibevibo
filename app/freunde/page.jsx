"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useMe } from "@/lib/useMe";
import { ColoredName } from "@/components/GenderAge";
import Avatar from "@/components/Avatar";

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
              {u.online && <span className="vv-online-dot" />}
              <ColoredName gender={u.gender} age={u.age} name={u.displayName} size="0.95em" />
            </span>
            <span className="vv-muted">{u.mood}</span>
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
