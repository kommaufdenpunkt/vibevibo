"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { relTime } from "@/lib/format";
import { findGift } from "@/lib/gifts";

function renderEvent(ev, i) {
  const actor = (
    <Link href={`/u/${ev.actor.username}`}><strong>{ev.actor.displayName}</strong> {ev.actor.emoji}</Link>
  );
  let icon = "✨";
  let text = null;

  if (ev.type === "pinnwand") {
    icon = "📌";
    text = <>{actor} schrieb an <Link href={`/u/${ev.target.username}`}>{ev.target.displayName}</Link>: „{truncate(ev.detail, 50)}"</>;
  } else if (ev.type === "gift") {
    const g = findGift(ev.gift);
    icon = g?.icon || "🎁";
    text = <>{actor} schenkte <Link href={`/u/${ev.target.username}`}>{ev.target.displayName}</Link> {g ? `${g.icon} ${g.name}` : "ein Geschenk"}</>;
  } else if (ev.type === "grouppost") {
    icon = "🏘️";
    text = <>{actor} postete in <Link href={`/gruppen/${ev.group.slug}`}>{ev.group.name}</Link>: „{truncate(ev.detail, 45)}"</>;
  } else if (ev.type === "newuser") {
    icon = "🎉";
    text = <>{actor} ist neu bei VibeVibo - sag Hallo!</>;
  }

  return (
    <div className="vv-feed-item" key={i}>
      <div className="vv-buschfunk-icon">{icon}</div>
      <div>
        <div>{text}</div>
        <div className="vv-feed-meta">{relTime(ev.at)}</div>
      </div>
    </div>
  );
}

function truncate(s, n) {
  if (!s) return "";
  return s.length > n ? s.slice(0, n) + "…" : s;
}

export default function Buschfunk() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const load = () => api.buschfunk().then((d) => setEvents(d.events)).catch(() => {});
    load();
    const t = setInterval(load, 25000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="vv-card">
      <h2>📣 Buschfunk</h2>
      {events.length === 0 ? (
        <div className="vv-muted vv-center" style={{ padding: "16px 0" }}>
          Noch nichts los. Schreib jemandem auf die Pinnwand!
        </div>
      ) : (
        events.map((ev, i) => renderEvent(ev, i))
      )}
    </div>
  );
}
