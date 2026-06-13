"use client";

// 🆕 Was-ist-neu-Seite — Public, Timeline, Emoji-Reaktionen.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CHANGELOG_PUBLIC, formatChangelogTime, latestChangelogAt } from "@/lib/changelog";
import { useMe } from "@/lib/useMe";
import ChangelogReactions from "@/components/ChangelogReactions";

const SEEN_KEY = "vv_changelog_seen";

export default function NeuPage() {
  const { me } = useMe();
  const [reactions, setReactions] = useState({});

  useEffect(() => {
    try { localStorage.setItem(SEEN_KEY, String(latestChangelogAt())); } catch {}
  }, []);

  // Bulk-Fetch der Reaktions-Zaehler fuer alle sichtbaren Eintraege
  useEffect(() => {
    const keys = CHANGELOG_PUBLIC.map((e) => e.key).filter(Boolean);
    if (keys.length === 0) return;
    const url = `/api/changelog/reactions?keys=${encodeURIComponent(keys.join(","))}`;
    fetch(url).then((r) => r.ok ? r.json() : { reactions: {} })
      .then((d) => setReactions(d.reactions || {}))
      .catch(() => {});
  }, []);

  const groups = useMemo(() => {
    const map = new Map();
    for (const e of CHANGELOG_PUBLIC) {
      const d = new Date(e.at);
      const key = d.toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(e);
    }
    return [...map.entries()];
  }, []);

  return (
    <div className="vv-neu-page">
      <div className="vv-neu-hero">
        <Link href="/" className="vv-neu-back">← Start</Link>
        <h1 className="vv-neu-title">🆕 Was ist neu auf VibeVibo?</h1>
        <p className="vv-neu-sub">
          Chronologische Timeline mit Datum und Uhrzeit — und Reaktionen auf jeden Beitrag ✿
        </p>
      </div>

      {groups.length === 0 ? (
        <div className="vv-neu-empty">
          <div style={{ fontSize: 40, marginBottom: 6 }}>📭</div>
          <div style={{ fontWeight: 700 }}>Noch nichts Neues — schau bald wieder vorbei!</div>
        </div>
      ) : (
        <div className="vv-neu-timeline">
          {groups.map(([day, items]) => (
            <section key={day} className="vv-neu-day">
              <div className="vv-neu-day-title">{day}</div>
              <ul className="vv-neu-list">
                {items.map((e) => (
                  <li key={e.key} className="vv-neu-item">
                    <span className="vv-neu-dot" aria-hidden="true">{e.emoji}</span>
                    <div className="vv-neu-text">
                      <div className="vv-neu-itemtitle">{e.title}</div>
                      <div className="vv-neu-itemtime">{formatChangelogTime(e.at)}</div>
                      <ChangelogReactions
                        entryKey={e.key}
                        initial={reactions[e.key] || {}}
                        loggedIn={!!me}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
