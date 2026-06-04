"use client";

// 🥠 Glückskeks des Tages + 🎂 Wer hat heute Geburtstag + 🏅 Mitglied-Nr.-Badge.
// Kleine nostalgische Startseiten-Widgets im 2000er-Stil.

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { ColoredName } from "./GenderAge";
import OnlineName from "./OnlineName";
import { useMe } from "@/lib/useMe";

// Klassischer "Mitglied Nr. X seit Y" Badge — 2000er-Foren-Stil.
// Pure Anzeige: zeigt nur was es ueber den User schon im Profil gibt (id + createdAt).
export function MemberSince() {
  const { me } = useMe();
  if (!me?.id) return null;
  const num = String(me.id).padStart(5, "0");
  const date = me.createdAt ? new Date(me.createdAt) : null;
  const seit = date ? date.toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" }) : null;
  // Tage-on-Board: kleiner Spielerei-Counter
  const days = date ? Math.max(1, Math.floor((Date.now() - date.getTime()) / 86400000)) : null;
  return (
    <div style={{
      background: "repeating-linear-gradient(45deg, #fef3c7, #fef3c7 8px, #fde68a 8px, #fde68a 16px)",
      border: "2px ridge #f59e0b", borderRadius: 10, padding: "10px 12px",
      marginBottom: 12, fontFamily: "Courier New, monospace", color: "#7c2d12",
      boxShadow: "3px 3px 0 rgba(180,83,9,0.35)",
    }}>
      <div style={{ fontSize: 11, fontWeight: 800, marginBottom: 2, color: "#92400e", letterSpacing: 0.5 }}>
        🏅 OFFIZIELLES VIBE★VIBO MITGLIEDS-ZERTIFIKAT
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 20, fontWeight: 900, color: "#831843" }}>Mitglied #{num}</span>
        {seit && <span style={{ fontSize: 12 }}>· seit <b>{seit}</b></span>}
        {days && <span style={{ fontSize: 11, opacity: 0.75 }}>({days} Tage on board)</span>}
      </div>
    </div>
  );
}

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
