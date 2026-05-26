"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { relTime } from "@/lib/format";
import { findGift } from "@/lib/gifts";
import { ColoredName } from "./GenderAge";

// Farbe des Zeitstrahl-Punkts je Ereignis-Typ
const NODE_COLOR = {
  pinnwand: "#ff8fd0",
  gift: "#ffd23f",
  grouppost: "#7ec8ff",
  newuser: "#8be28b",
  newpic: "#c79bff",
  status: "#ff6fae",
};

function renderEvent(ev, i, isLast) {
  const actor = (
    <Link href={`/u/${ev.actor.username}`} style={{ textDecoration: "none" }}>
      <ColoredName gender={ev.actor.gender} age={ev.actor.age} name={ev.actor.displayName} />
    </Link>
  );
  let icon = "✨";
  let text = null;

  if (ev.type === "pinnwand") {
    icon = "📌";
    text = <>{actor} schrieb an <Link href={`/u/${ev.target.username}`}>{ev.target.displayName}</Link>: „{truncate(ev.detail, 60)}"</>;
  } else if (ev.type === "gift") {
    const g = findGift(ev.gift);
    icon = g?.icon || "🎁";
    text = <>{actor} schenkte <Link href={`/u/${ev.target.username}`}>{ev.target.displayName}</Link> {g ? `${g.icon} ${g.name}` : "ein Geschenk"}</>;
  } else if (ev.type === "grouppost") {
    icon = "🏘️";
    text = <>{actor} postete in <Link href={`/gruppen/${ev.group.slug}`}>{ev.group.name}</Link>: „{truncate(ev.detail, 55)}"</>;
  } else if (ev.type === "newuser") {
    icon = "🎉";
    text = <>{actor} ist neu bei VibeVibo – sag Hallo!</>;
  } else if (ev.type === "newpic") {
    icon = "🖼️";
    text = <>{actor} hat ein neues Profilbild!</>;
  } else if (ev.type === "status") {
    icon = "💬";
    text = <>{actor} ist jetzt: <strong>{ev.detail}</strong></>;
  }

  return (
    <div key={i} style={{ position: "relative", display: "flex", gap: 10, paddingBottom: isLast ? 0 : 14 }}>
      {/* Zeitstrahl-Linie */}
      {!isLast && <div style={{ position: "absolute", left: 14, top: 30, bottom: 0, width: 2, background: "#ececf3" }} />}
      {/* Knoten */}
      <div style={{
        zIndex: 1, width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
        background: "#fff", border: `2px solid ${NODE_COLOR[ev.type] || "#ddd"}`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15,
      }}>{icon}</div>
      {/* Inhalt */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, lineHeight: 1.45 }}>{text}</div>
        <div style={{ fontSize: 11, color: "#9a9aa8", marginTop: 2 }}>{relTime(ev.at)}</div>
      </div>
      {ev.type === "newpic" && ev.picUrl && (
        <Link href={`/u/${ev.actor.username}`} style={{ flexShrink: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ev.picUrl} alt="" style={{ width: 42, height: 42, borderRadius: 8, objectFit: "cover" }} />
        </Link>
      )}
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
      <h2 style={{ marginTop: 0 }}>📰 Neuigkeiten</h2>
      <div className="vv-muted" style={{ fontSize: 12, marginBottom: 12 }}>Wer hat was, wann &amp; wo gemacht – deine Timeline</div>
      {events.length === 0 ? (
        <div className="vv-muted vv-center" style={{ padding: "16px 0" }}>
          Noch nichts los. Schreib jemandem auf die Pinnwand!
        </div>
      ) : (
        <div>
          {events.map((ev, i) => renderEvent(ev, i, i === events.length - 1))}
        </div>
      )}
    </div>
  );
}
