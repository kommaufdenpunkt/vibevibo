"use client";

// 🆕 NEU-Panel fuer das rechte Edge-Panel.
// Standardmaessig zugeklappt — nur der Header mit NEU-Badge wird gezeigt.
// Klick auf den Header → Liste klappt auf.
// Innerhalb der Liste: Vorschau (PREVIEW_COUNT), darunter Knopf fuer
// "alle X anzeigen".

import { useEffect, useState } from "react";
import { CHANGELOG, formatChangelogTime, latestChangelogAt } from "@/lib/changelog";

const PREVIEW_COUNT = 6;
const SEEN_KEY = "vv_changelog_seen";

export default function ChangelogPanel() {
  const [open, setOpen] = useState(false);       // Hauptpanel auf/zu
  const [showAll, setShowAll] = useState(false); // innerhalb auf/zu
  const [seenAt, setSeenAt] = useState(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SEEN_KEY);
      setSeenAt(raw ? Number(raw) : 0);
    } catch { setSeenAt(0); }
  }, []);

  // Beim Aufklappen als gesehen markieren — nicht direkt beim Mount,
  // damit die "NEU"-Badge bis zum Klick sichtbar bleibt.
  useEffect(() => {
    if (!open) return;
    try { localStorage.setItem(SEEN_KEY, String(latestChangelogAt())); } catch {}
  }, [open]);

  const items = showAll ? CHANGELOG : CHANGELOG.slice(0, PREVIEW_COUNT);
  const newCount = seenAt != null
    ? CHANGELOG.filter((e) => new Date(e.at).getTime() > seenAt).length
    : 0;

  return (
    <div className={`vv-edge-changelog${open ? " open" : ""}`}>
      <button type="button"
        className="vv-edge-changelog-head"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}>
        <span className="vv-edge-changelog-icon" aria-hidden="true">🆕</span>
        <span className="vv-edge-changelog-headtitle">Was ist neu?</span>
        {newCount > 0 && !open && (
          <span className="vv-edge-changelog-badge">{newCount > 99 ? "99+" : newCount}</span>
        )}
        <span className="vv-edge-changelog-caret" aria-hidden="true">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <>
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
              onClick={() => setShowAll((v) => !v)}>
              {showAll ? "▲ Weniger anzeigen" : `▼ Alle ${CHANGELOG.length} Updates anzeigen`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
