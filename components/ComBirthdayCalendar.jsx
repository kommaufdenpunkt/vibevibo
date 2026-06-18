"use client";

// 🎂 Geburtstagskalender für Coms — zeigt anstehende Geburtstage der nächsten 7 Tage.
// „Glückwunsch senden" verschickt eine vorgefertigte DM via /api/messages.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

export default function ComBirthdayCalendar({ slug, themeColor = "#ec4899" }) {
  const [birthdays, setBirthdays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [sentTo, setSentTo] = useState({}); // username -> true wenn schon gewünscht

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/groups/${encodeURIComponent(slug)}/birthdays`, { credentials: "include" });
      if (!r.ok) return;
      const d = await r.json();
      setBirthdays(d.birthdays || []);
    } catch {}
    finally { setLoading(false); }
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  async function congratulate(username, displayName) {
    const name = displayName || username;
    const text = `🎂 Alles Gute zum Geburtstag, ${name}! 🎉`;
    try {
      const r = await fetch("/api/messages", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: username, text }),
      });
      if (r.ok) setSentTo((prev) => ({ ...prev, [username]: true }));
      else alert("Konnte Glückwunsch nicht senden — vielleicht hat die Person DMs blockiert.");
    } catch {
      alert("Netzwerk-Fehler.");
    }
  }

  if (loading) return null;
  if (birthdays.length === 0) return null;

  return (
    <div style={{
      background: "linear-gradient(135deg, rgba(255,255,255,0.96), rgba(252,231,243,0.96))",
      borderRadius: 14, padding: 12, marginBottom: 12,
      border: `2px solid ${themeColor}55`,
      boxShadow: "0 4px 12px rgba(236,72,153,0.12)",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8, marginBottom: 10,
        cursor: "pointer",
      }} onClick={() => setCollapsed((c) => !c)}>
        <span style={{ fontSize: 24 }}>🎂</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#831843" }}>
            Geburtstage diese Woche · {birthdays.length}
          </div>
          <div style={{ fontSize: 11, color: "#9d174d" }}>
            Wer hat in den nächsten 7 Tagen Geburtstag in der Com?
          </div>
        </div>
        <span style={{ fontSize: 18, color: "#9d174d" }}>{collapsed ? "▸" : "▾"}</span>
      </div>

      {!collapsed && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {birthdays.map((b) => {
            const label = b.daysUntil === 0
              ? "🎉 Heute!"
              : b.daysUntil === 1
              ? "Morgen"
              : `In ${b.daysUntil} Tagen`;
            const dateLabel = `${String(b.birthDay).padStart(2,"0")}.${String(b.birthMonth).padStart(2,"0")}.`;
            const wished = sentTo[b.username];
            return (
              <div key={b.userId} style={{
                background: "rgba(255,255,255,0.85)",
                padding: 10, borderRadius: 10,
                display: "flex", alignItems: "center", gap: 10,
                border: b.daysUntil === 0 ? `2px solid ${themeColor}` : "1px solid rgba(146,64,14,0.12)",
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: "50%",
                  background: b.avatarUrl ? `url(${b.avatarUrl}) center/cover` : "#f9a8d4",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18,
                }}>
                  {!b.avatarUrl && (b.emoji || "👤")}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Link href={`/u/${b.username}`} style={{
                    fontSize: 14, fontWeight: 700, color: "#831843",
                    textDecoration: "none",
                  }}>
                    {b.displayName || `@${b.username}`}
                  </Link>
                  <div style={{ fontSize: 11, color: "#9d174d" }}>
                    {label} · wird {b.turningAge} · {dateLabel}
                  </div>
                </div>
                {b.daysUntil === 0 && !wished && (
                  <button onClick={() => congratulate(b.username, b.displayName)} style={{
                    padding: "6px 12px", borderRadius: 999,
                    border: "none", cursor: "pointer", fontFamily: "inherit",
                    background: themeColor, color: "#fff",
                    fontSize: 12, fontWeight: 800,
                  }}>🎁 Glückwunsch</button>
                )}
                {b.daysUntil === 0 && wished && (
                  <span style={{
                    padding: "4px 10px", borderRadius: 999,
                    background: "#dcfce7", color: "#166534",
                    fontSize: 11, fontWeight: 800,
                  }}>✓ Gewünscht</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
