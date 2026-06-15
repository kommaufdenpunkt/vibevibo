"use client";

// ❤️ ComReactions — 5-Emoji-Bar mit Toggle + Count + Animations.

import { useState } from "react";

const EMOJIS = ["👍", "❤️", "🤔", "🎉", "😂"];

export default function ComReactions({
  slug, targetType, targetId, initial = {}, myUserId,
  themeColor = "#ec4899", compact = false,
}) {
  const [state, setState] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [pulse, setPulse] = useState(null);

  async function toggle(emoji) {
    if (busy) return;
    setBusy(true);
    setPulse(emoji);
    setTimeout(() => setPulse(null), 380);
    // Optimistic update
    const cur = state[emoji] || { count: 0, userIds: [] };
    const has = cur.userIds.includes(myUserId);
    const next = { ...state };
    if (has) {
      next[emoji] = {
        count: cur.count - 1,
        userIds: cur.userIds.filter((id) => id !== myUserId),
      };
      if (next[emoji].count <= 0) delete next[emoji];
    } else {
      next[emoji] = {
        count: cur.count + 1,
        userIds: [...cur.userIds, myUserId],
      };
    }
    setState(next);
    try {
      const r = await fetch(`/api/groups/${slug}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType, targetId, emoji }),
      });
      if (!r.ok) {
        // Rollback bei Fehler
        setState(state);
      }
    } catch {
      setState(state);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{
      display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center",
    }}>
      {EMOJIS.map((emoji) => {
        const data = state[emoji];
        const count = data?.count || 0;
        const mine = data?.userIds?.includes(myUserId);
        return (
          <button
            key={emoji}
            onClick={() => toggle(emoji)}
            disabled={!myUserId}
            style={{
              background: mine ? `${themeColor}22` : "rgba(0,0,0,0.04)",
              border: mine ? `1.5px solid ${themeColor}` : "1px solid rgba(0,0,0,0.08)",
              padding: compact ? "2px 7px" : "3px 8px",
              borderRadius: 999,
              fontSize: compact ? 11 : 12.5,
              fontWeight: 700,
              color: mine ? "#1f2937" : "#475569",
              cursor: myUserId ? "pointer" : "not-allowed",
              display: "inline-flex", alignItems: "center", gap: 3,
              transition: "all 0.15s",
              transform: pulse === emoji ? "scale(1.18)" : "scale(1)",
              opacity: myUserId ? 1 : 0.55,
            }}
            title={mine ? "Du hast reagiert — Klick zum Entfernen" : "Reagieren"}
          >
            <span style={{ fontSize: compact ? 13 : 15 }}>{emoji}</span>
            {count > 0 && <span style={{ fontSize: 11 }}>{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
