"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useMe } from "@/lib/useMe";

export default function FriendsPage() {
  const { me } = useMe();
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    api.listUsers().then((d) => setUsers(d.users)).catch(() => {});
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
            <div className="vv-avatar vv-avatar-md">{u.emoji}</div>
            <span className="vv-friend-name">
              {u.online && <span className="vv-online-dot" />}
              {u.displayName}
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
