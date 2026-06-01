"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import HelpCard from "./HelpCard";

export default function QuestPanel() {
  const [quests, setQuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState("");
  const [busy, setBusy] = useState(0);

  const load = useCallback(async () => {
    try { const r = await api.quests(); setQuests(r.quests || []); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function claim(id) {
    setBusy(id);
    try {
      const r = await api.questClaim(id);
      setFlash(`+${r.reward} ✨ kassiert!`);
      setTimeout(() => setFlash(""), 3000);
      await load();
    } catch (e) {
      setFlash(`⚠ ${e.message}`);
      setTimeout(() => setFlash(""), 3000);
    } finally { setBusy(0); }
  }

  if (loading) return null;
  if (!quests.length) return null;

  return (
    <div style={{ padding: 14 }}>
      <HelpCard id="quest-intro" title="Was sind Quests?" emoji="🎯" color="#3b82f6">
        Drei kleine Aufgaben pro Tag. Erfüllst du sie, klickst auf
        <b> "Abholen"</b> und bekommst Vibes ✨ gutgeschrieben.
        <br/><br/>
        Beispiele: "Schreib 3 Nachrichten", "Knuddel dein VIBO 5×",
        "Spiel Mini-Game 1×". Der Fortschrittsbalken zählt automatisch.
        Um Mitternacht (deutsche Zeit) kommen 3 neue Quests.
      </HelpCard>
      <h3 style={{ margin: "0 0 10px" }}>🥇 Heutige Quests</h3>
      {flash && (
        <div style={{
          background: flash.startsWith("⚠") ? "#fef3c7" : "#dcfce7",
          color: flash.startsWith("⚠") ? "#92400e" : "#166534",
          padding: 8, borderRadius: 8, marginBottom: 10, fontSize: 13, fontWeight: 600, textAlign: "center",
        }}>{flash}</div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {quests.map((q) => {
          const done = q.progress >= q.target;
          const claimed = !!q.claimed;
          return (
            <div key={q.id} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 12px",
              background: claimed ? "#f5f5f7" : (done ? "linear-gradient(135deg, #dcfce7, #bbf7d0)" : "var(--vv-card,#fff)"),
              border: `1px solid ${claimed ? "#d1d5db" : (done ? "#86efac" : "var(--vv-border,#eee)")}`,
              borderRadius: 12,
              opacity: claimed ? 0.55 : 1,
            }}>
              <div style={{ fontSize: 28, flexShrink: 0 }}>{q.emoji}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--vv-text,#1c1c1e)" }}>
                  {q.label}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                  <div style={{ flex: 1, height: 6, background: "rgba(120,120,128,0.18)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{
                      height: "100%", width: `${Math.min(100, (q.progress / q.target) * 100)}%`,
                      background: done ? "#10b981" : "#3b82f6", transition: "width 0.4s ease",
                    }} />
                  </div>
                  <span style={{ fontSize: 11, color: "var(--vv-muted,#666)", fontWeight: 600, minWidth: 40, textAlign: "right" }}>
                    {q.progress}/{q.target}
                  </span>
                </div>
              </div>
              <div style={{ flexShrink: 0, textAlign: "right" }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#92400e" }}>+{q.reward} ✨</div>
                {claimed ? (
                  <div style={{ fontSize: 10, color: "#16a34a", fontWeight: 700 }}>✓ KASSIERT</div>
                ) : done ? (
                  <button type="button" onClick={() => claim(q.id)} disabled={busy === q.id}
                    className="vv-btn-big vv-btn-big-yellow"
                    style={{ padding: "5px 10px", fontSize: 11, marginTop: 2 }}>
                    Abholen
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
