"use client";

// 🆕 Was-ist-neu-Seite (oeffentlich) — zeigt alle public-Eintraege
// aus dem Changelog mit Datum/Uhrzeit als Timeline.

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { CHANGELOG_PUBLIC, formatChangelogTime, latestChangelogAt } from "@/lib/changelog";

const SEEN_KEY = "vv_changelog_seen";

export default function NeuPage() {
  useEffect(() => {
    try { localStorage.setItem(SEEN_KEY, String(latestChangelogAt())); } catch {}
  }, []);

  // Nach Tag gruppieren (YYYY-MM-DD im de-Locale)
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
          Hier siehst du chronologisch, was sich auf der Plattform getan hat. ✿
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
                {items.map((e, i) => (
                  <li key={`${e.at}-${i}`} className="vv-neu-item">
                    <span className="vv-neu-dot" aria-hidden="true">{e.emoji}</span>
                    <div className="vv-neu-text">
                      <div className="vv-neu-itemtitle">{e.title}</div>
                      <div className="vv-neu-itemtime">{formatChangelogTime(e.at)}</div>
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
