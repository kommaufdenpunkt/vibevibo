"use client";

// 🆕 NEU-Panel fuer das rechte Edge-Panel.
// Zeigt die letzten Features als Timeline mit Datum/Uhrzeit.
// Mehr-anzeigen-Knopf klappt die alten Eintraege auf.

import { useEffect, useState } from "react";
import { CHANGELOG, formatChangelogTime, latestChangelogAt } from "@/lib/changelog";

const PREVIEW_COUNT = 6;
const SEEN_KEY = "vv_changelog_seen";

export default function ChangelogPanel() {
  const [expanded, setExpanded] = useState(false);
  const [seenAt, setSeenAt] = useState(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SEEN_KEY);
      setSeenAt(raw ? Number(raw) : 0);
    } catch { setSeenAt(0); }
  }, []);

  // Beim Mounten als gesehen markieren (User hat das rechte Panel aufgemacht)
  useEffect(() => {
    if (seenAt == null) return;
    try {
      localStorage.setItem(SEEN_KEY, String(latestChangelogAt()));
    } catch {}
  }, [seenAt]);

  const items = expanded ? CHANGELOG : CHANGELOG.slice(0, PREVIEW_COUNT);
  const newCount = seenAt != null
    ? CHANGELOG.filter((e) => new Date(e.at).getTime() > seenAt).length
    : 0;

  return (
    <div className="vv-edge-changelog">
      <div className="vv-edge-changelog-head">
        <span className="vv-edge-nav-grouptitle" style={{ padding: 0, flex: 1 }}>
          🆕 Was ist neu?
        </span>
        {newCount > 0 && (
          <span className="vv-edge-changelog-badge">{newCount > 99 ? "99+" : newCount}</span>
        )}
      </div>
      <ul className="vv-edge-changelog-list">
        {items.map((e, i) => (
          <li key={`${e.at}-${i}`} className="vv-edge-changelog-item">
            <span className="vv-edge-changelog-dot" aria-hidden="true">
              <span style={{ fontSize: 13 }}>{e.emoji}</span>
            </span>
            <div className="vv-edge-changelog-text">
              <div className="vv-edge-changelog-title">{e.title}</div>
              <div className="vv-edge-changelog-time">{formatChangelogTime(e.at)}</div>
            </div>
          </li>
        ))}
      </ul>
      {CHANGELOG.length > PREVIEW_COUNT && (
        <button type="button" className="vv-edge-changelog-more"
          onClick={() => setExpanded((v) => !v)}>
          {expanded ? "▲ Weniger anzeigen" : `▼ Alle ${CHANGELOG.length} Updates anzeigen`}
        </button>
      )}
    </div>
  );
}
