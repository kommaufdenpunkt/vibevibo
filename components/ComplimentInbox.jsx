"use client";

// 💌 Komplimente-Inbox aufm eigenen Profil. Zeigt zuletzt empfangene Komplimente,
// markiert beim Laden automatisch als gesehen (Backend).

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { relTime } from "@/lib/format";

export default function ComplimentInbox() {
  const [items, setItems] = useState(null);

  useEffect(() => {
    api.complimentInbox().then((r) => setItems(r.items || [])).catch(() => setItems([]));
  }, []);

  if (items === null) return null;

  return (
    <div className="vv-card" style={{
      background: "linear-gradient(135deg, #fce7f3, #fbcfe8)",
      border: "1px solid #ec4899",
    }}>
      <h3 style={{ marginTop: 0, color: "#831843" }}>💌 Komplimente für dich</h3>
      {items.length === 0 ? (
        <div style={{ fontSize: 13, color: "#831843", opacity: 0.7 }}>
          Noch keine Komplimente. Schick selbst eines an jemanden — vielleicht kommt eines zurück 🌸
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {items.slice(0, 8).map((c) => (
            <div key={c.id} style={{
              background: "rgba(255,255,255,0.7)",
              borderRadius: 10, padding: "9px 11px",
              display: "flex", alignItems: "start", gap: 10,
            }}>
              <div style={{ fontSize: 22, lineHeight: 1 }}>{c.emoji}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: "#831843", lineHeight: 1.35 }}>{c.text}</div>
                <div style={{ fontSize: 10, color: "#9d174d", marginTop: 3 }}>
                  {c.anonymous ? "🕶 anonym" : (
                    <>von <Link href={`/u/${c.fromUsername}`} style={{ color: "#9d174d" }}>{c.fromDisplayName || c.fromUsername}</Link></>
                  )}
                  {" · "}{relTime(c.createdAt)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
