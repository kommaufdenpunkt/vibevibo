"use client";

// 💌 Komplimente-Inbox aufm eigenen Profil. Nutzt das nostalgische Karten-
// System (vv-nost-card) -> passt sich Skin UND Geschlecht automatisch an,
// statt hardcodiertem Pink. Markiert beim Laden automatisch als gesehen.

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

  const empty = items.length === 0;

  return (
    <div className="vv-nost-card vv-nost-card-pink" style={{ marginBottom: 12 }}>
      <div className="vv-nost-card-title">
        💌 Komplimente für dich{!empty && ` · ${items.length}`}
      </div>
      <div className="vv-nost-card-body">
        {empty ? (
          <div style={{ textAlign: "center", padding: "8px 6px 10px" }}>
            <div style={{ fontSize: 30, lineHeight: 1 }}>💌</div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: "#831843", marginTop: 6 }}>
              Noch keine Komplimente — aber das ändern wir!
            </div>
            <div style={{ fontSize: 12, color: "#9d174d", opacity: 0.9, marginTop: 3 }}>
              Mach selbst jemandem eins. Oft kommt dann auch eins zurück 🌸
            </div>
            <Link
              href="/freunde"
              style={{
                display: "inline-block",
                marginTop: 12,
                padding: "9px 16px",
                borderRadius: 999,
                fontWeight: 800,
                fontSize: 13,
                textDecoration: "none",
                color: "#fff",
                background: "linear-gradient(135deg,#ec4899,#be185d)",
                boxShadow: "0 3px 10px rgba(190,24,93,0.35)",
              }}
            >
              💖 Kompliment verschicken
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {items.slice(0, 8).map((c) => (
              <div
                key={c.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  background: "rgba(255,255,255,0.75)",
                  border: "1px solid #fbcfe8",
                  borderRadius: 10,
                  padding: "9px 11px",
                }}
              >
                <div style={{ fontSize: 22, lineHeight: 1 }}>{c.emoji}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: "#4a044e", lineHeight: 1.35 }}>{c.text}</div>
                  <div style={{ fontSize: 10.5, color: "#9d174d", marginTop: 3 }}>
                    {c.anonymous ? (
                      "🕶 anonym"
                    ) : (
                      <>
                        von{" "}
                        <Link
                          href={`/u/${c.fromUsername}`}
                          style={{ color: "#9d174d", fontWeight: 700 }}
                        >
                          {c.fromDisplayName || c.fromUsername}
                        </Link>
                      </>
                    )}
                    {" · "}
                    {relTime(c.createdAt)}
                  </div>
                </div>
              </div>
            ))}
            {items.length > 8 && (
              <div
                style={{
                  fontSize: 11,
                  color: "#9d174d",
                  textAlign: "center",
                  opacity: 0.85,
                  marginTop: 2,
                }}
              >
                … und {items.length - 8} weitere
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
