"use client";

// 👯 Freunde/Mitglieder im 2007er-Style — Hero, Filter-Chips, bunte Tiles.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useMe } from "@/lib/useMe";
import { ColoredName } from "@/components/GenderAge";
import Avatar from "@/components/Avatar";
import ActivityBars from "@/components/ActivityBars";
import OnlineName from "@/components/OnlineName";
import PremiumBadges from "@/components/PremiumBadges";
import { activityLevel, isOnlineActivity, formatLastActive } from "@/lib/activity";

export default function FriendsPage() {
  const { me } = useMe();
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("all"); // all|m|w
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [sortBy, setSortBy] = useState("active"); // active|new|name|rank

  useEffect(() => {
    const load = () => api.listUsers().then((d) => setUsers(d.users || [])).catch(() => {});
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, []);

  const list = useMemo(() => {
    const f = filter.trim().toLowerCase();
    let arr = users.filter((u) => {
      if (genderFilter !== "all" && u.gender !== genderFilter) return false;
      if (onlineOnly && !isOnlineActivity(u.lastSeen)) return false;
      if (f && !(
        u.username.toLowerCase().includes(f) ||
        (u.displayName || "").toLowerCase().includes(f) ||
        (u.mood || "").toLowerCase().includes(f) ||
        (u.city || "").toLowerCase().includes(f) ||
        (u.school || "").toLowerCase().includes(f)
      )) return false;
      return true;
    });
    if (sortBy === "active") {
      arr.sort((a, b) => {
        const la = activityLevel(a.lastSeen);
        const lb = activityLevel(b.lastSeen);
        if (la !== lb) return lb - la;
        return (b.lastSeen || 0) - (a.lastSeen || 0);
      });
    } else if (sortBy === "new") {
      arr.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } else if (sortBy === "name") {
      arr.sort((a, b) => (a.displayName || "").localeCompare(b.displayName || ""));
    } else if (sortBy === "rank") {
      arr.sort((a, b) => (b.rank || 0) - (a.rank || 0));
    }
    return arr;
  }, [users, filter, genderFilter, onlineOnly, sortBy]);

  const onlineCount = users.filter((u) => isOnlineActivity(u.lastSeen)).length;
  const mCount = users.filter((u) => u.gender === "m").length;
  const wCount = users.filter((u) => u.gender === "w").length;

  return (
    <div className="vv-friends-page">
      {/* ★ HERO ★ */}
      <div className="vv-friends-hero">
        <div className="vv-friends-hero-stars">
          <span>✿</span><span>★</span><span>♡</span><span>♥</span>
          <span>★</span><span>✿</span><span>✩</span><span>♡</span>
        </div>
        <div className="vv-friends-hero-emoji">👯</div>
        <h1 className="vv-friends-hero-title">★ MITGLIEDER & FREUNDE ★</h1>
        <div className="vv-friends-hero-sub">
          ✿ {users.length} VibeVibo-Member · {onlineCount} online · {mCount} ♂ + {wCount} ♀ ✿
        </div>
      </div>

      {/* Filter & Suche */}
      <div className="vv-friends-toolbar">
        <input
          className="vv-friends-search"
          placeholder="🔍 Name, @username, Mood, Stadt oder Schule…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <div className="vv-friends-chip-row">
          <span className="vv-friends-chip-label">👤 Geschlecht:</span>
          <button type="button"
            className={`vv-friends-chip${genderFilter === "all" ? " active" : ""}`}
            onClick={() => setGenderFilter("all")}>Alle</button>
          <button type="button"
            className={`vv-friends-chip vv-friends-chip-m${genderFilter === "m" ? " active" : ""}`}
            onClick={() => setGenderFilter("m")}>♂ Männer</button>
          <button type="button"
            className={`vv-friends-chip vv-friends-chip-w${genderFilter === "w" ? " active" : ""}`}
            onClick={() => setGenderFilter("w")}>♀ Frauen</button>
        </div>
        <div className="vv-friends-chip-row">
          <span className="vv-friends-chip-label">🔀 Sortieren:</span>
          <button type="button"
            className={`vv-friends-chip${sortBy === "active" ? " active" : ""}`}
            onClick={() => setSortBy("active")}>🟢 Aktiv</button>
          <button type="button"
            className={`vv-friends-chip${sortBy === "new" ? " active" : ""}`}
            onClick={() => setSortBy("new")}>🌟 Neu</button>
          <button type="button"
            className={`vv-friends-chip${sortBy === "rank" ? " active" : ""}`}
            onClick={() => setSortBy("rank")}>🏅 Rang</button>
          <button type="button"
            className={`vv-friends-chip${sortBy === "name" ? " active" : ""}`}
            onClick={() => setSortBy("name")}>🔤 Name</button>
        </div>
        <label className="vv-friends-online-toggle">
          <input type="checkbox" checked={onlineOnly} onChange={(e) => setOnlineOnly(e.target.checked)} />
          🟢 Nur Online-Mitglieder zeigen
        </label>
      </div>

      {/* Ergebnis-Stats */}
      <div className="vv-friends-result-bar">
        <b>{list.length}</b> {list.length === 1 ? "Treffer" : "Treffer"}
        {(filter || genderFilter !== "all" || onlineOnly) && (
          <button type="button" onClick={() => { setFilter(""); setGenderFilter("all"); setOnlineOnly(false); }}
            className="vv-friends-reset">✖ Filter zurücksetzen</button>
        )}
      </div>

      {/* Mitglieder-Grid */}
      <div className="vv-friends-grid-nost">
        {list.map((u) => {
          const online = isOnlineActivity(u.lastSeen);
          const g = u.gender === "m" ? "m" : u.gender === "w" ? "w" : "";
          return (
            <Link key={u.username} href={`/u/${u.username}`}
              className="vv-friends-tile" data-gender={g}>
              <div className="vv-friends-tile-avatar">
                <Avatar url={u.avatarUrl} name={u.displayName} className="vv-avatar" />
                {online && <span className="vv-friends-tile-dot" title="online" />}
              </div>
              <div className="vv-friends-tile-name">
                <OnlineName lastSeen={u.lastSeen}>
                  <ColoredName gender={u.gender} age={u.age} name={u.displayName} size="14px" />
                </OnlineName>
              </div>
              <div className="vv-friends-tile-meta">
                <ActivityBars lastSeen={u.lastSeen} size="xs" />
                {u.rank > 0 && (
                  <span className="vv-friends-tile-rank" style={{ borderColor: u.rankColor || "#a855f7", color: u.rankColor || "#a855f7" }}>
                    {u.rankEmoji || "🏅"} R{u.rank}
                  </span>
                )}
              </div>
              <div className="vv-friends-tile-mood">
                {online
                  ? (u.mood || "💚 online")
                  : `zuletzt ${formatLastActive(u.lastSeen)}`}
              </div>
              {(u.city || u.school) && (
                <div className="vv-friends-tile-loc">
                  {u.city && <span>📍 {u.city}</span>}
                  {u.school && <span>🏫 {u.school}</span>}
                </div>
              )}
              {(u.premiumBadges || []).length > 0 && (
                <div className="vv-friends-tile-badges">
                  <PremiumBadges badges={u.premiumBadges} size={14} gap={3} />
                </div>
              )}
            </Link>
          );
        })}
        {list.length === 0 && (
          <div className="vv-friends-empty">
            <div style={{ fontSize: 48, marginBottom: 8 }}>🥺</div>
            Nichts gefunden — probier andere Filter.
          </div>
        )}
      </div>

      {!me && (
        <div className="vv-friends-loginhint">
          ⓘ Du bist nicht eingeloggt — <Link href="/login">jetzt einloggen</Link>, dann kannst du gruscheln, schreiben und Geschenke verschicken.
        </div>
      )}

      <div className="vv-friends-footer">
        <span>★</span>
        <span>VibeVibo Mitglieder-Verzeichnis · alphabetisch · live · Glitzer-zertifiziert</span>
        <span>★</span>
      </div>
    </div>
  );
}
