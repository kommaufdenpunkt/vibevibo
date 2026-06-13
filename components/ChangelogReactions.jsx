"use client";

// 💬 Emoji-Reaktionen unter Changelog-Eintraegen.
// Holt initial den Zaehler per Bulk-Fetch (im Parent), bekommt aber pro
// Eintrag den State separat. Klick toggled die Reaktion via API.

import { useState } from "react";

const REACTIONS = ["❤️", "🎉", "🔥", "👍", "😍", "🤩"];

export default function ChangelogReactions({ entryKey, initial = {}, loggedIn = true }) {
  const [state, setState] = useState(initial);
  const [busy, setBusy] = useState(null);

  async function toggle(emoji) {
    if (!loggedIn || busy) return;
    setBusy(emoji);
    // optimistic update
    const prev = state[emoji] || { count: 0, mine: false };
    const next = { ...state, [emoji]: { count: prev.count + (prev.mine ? -1 : 1), mine: !prev.mine } };
    if (next[emoji].count <= 0) delete next[emoji];
    setState(next);
    try {
      const r = await fetch("/api/changelog/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryKey, emoji }),
      });
      if (!r.ok) throw new Error("api error");
    } catch {
      // rollback on error
      setState(state);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="vv-clreact">
      {REACTIONS.map((em) => {
        const v = state[em];
        const count = v?.count || 0;
        const mine = v?.mine || false;
        const empty = count === 0;
        return (
          <button key={em} type="button"
            onClick={() => toggle(em)}
            disabled={!loggedIn || busy === em}
            className={`vv-clreact-btn${mine ? " mine" : ""}${empty ? " empty" : ""}`}
            title={loggedIn ? (mine ? "Reaktion entfernen" : "Reagieren") : "Bitte einloggen"}>
            <span className="vv-clreact-emoji">{em}</span>
            {count > 0 && <span className="vv-clreact-count">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
