"use client";

// 🥠 Glückskeks des Tages + 🎂 Wer hat heute Geburtstag.
// Kleine nostalgische Startseiten-Widgets.

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { ColoredName } from "./GenderAge";
import OnlineName from "./OnlineName";

export function FortuneCookie() {
  const [f, setF] = useState(null);
  useEffect(() => { api.fortune().then((r) => setF(r.fortune)).catch(() => {}); }, []);
  if (!f) return null;
  return (
    <div className="vv-card" style={{
      background: "linear-gradient(135deg, #fef3c7, #fde68a)",
      border: "1px solid #f59e0b", padding: 12, color: "#7c2d12",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ fontSize: 30 }}>{f.emoji}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#92400e", marginBottom: 2 }}>
            🥠 GLÜCKSKEKS DES TAGES
          </div>
          <div style={{ fontSize: 13, fontStyle: "italic", lineHeight: 1.35 }}>
            „{f.text}"
          </div>
        </div>
      </div>
    </div>
  );
}

export function TodaysBirthdays() {
  const [list, setList] = useState(null);
  useEffect(() => { api.birthdays().then((r) => setList(r.birthdays)).catch(() => setList([])); }, []);
  if (!list || list.length === 0) return null;
  return (
    <div className="vv-card" style={{
      background: "linear-gradient(135deg, #fce7f3, #fbcfe8)",
      border: "1px solid #ec4899",
    }}>
      <h3 style={{ margin: "0 0 8px", fontSize: 15, color: "#831843" }}>
        🎂 Heute Geburtstag — gratulier mal!
      </h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {list.map((u) => (
          <Link key={u.id} href={`/u/${u.username}`}
            style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "5px 8px", background: "rgba(255,255,255,0.7)",
              borderRadius: 999, textDecoration: "none", fontSize: 12,
            }}>
            {u.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={u.avatarUrl} alt="" style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover" }} />
            ) : (
              <span style={{ fontSize: 18 }}>🎈</span>
            )}
            <OnlineName lastSeen={u.lastSeen}>
              <ColoredName gender={u.gender} age={u.age} name={u.displayName} nameColor={u.nameColor} />
            </OnlineName>
          </Link>
        ))}
      </div>
    </div>
  );
}
