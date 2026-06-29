"use client";

// 🆕 Was-ist-neu-Seite — Public, Timeline, Emoji-Reaktionen. DUNKEL (selbst-enthalten).

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CHANGELOG_PUBLIC, formatChangelogTime, latestChangelogAt } from "@/lib/changelog";
import { useMe } from "@/lib/useMe";
import ChangelogReactions from "@/components/ChangelogReactions";

const SEEN_KEY = "vv_changelog_seen";

// Dunkles Overlay nur für /neu — überschreibt die hellen .vv-neu-*-Farben.
const NEU_DARK_CSS = `
.vv-neu-page { background: transparent !important; color: #eef1f3 !important; }
.vv-neu-hero {
  background: linear-gradient(180deg, #17181c 0%, #0c0d0f 100%) !important;
  border: 1px solid rgba(255,255,255,0.12) !important;
  box-shadow: 0 8px 24px rgba(0,0,0,0.5) !important;
}
.vv-neu-back { color: #ffce00 !important; }
.vv-neu-title { color: #ffffff !important; }
.vv-neu-sub { color: rgba(238,241,243,0.65) !important; }
.vv-neu-day-title { color: #ff6b66 !important; }
.vv-neu-timeline::before, .vv-neu-day::before { background: rgba(255,255,255,0.12) !important; }
.vv-neu-item {
  background: rgba(26,26,31,0.92) !important;
  border: 1px solid rgba(255,255,255,0.12) !important;
  box-shadow: 0 2px 10px rgba(0,0,0,0.4) !important;
}
.vv-neu-itemtitle { color: #eef1f3 !important; }
.vv-neu-itemtime { color: rgba(238,241,243,0.5) !important; }
.vv-neu-empty { color: rgba(238,241,243,0.7) !important; }
/* Reaktions-Buttons (weiße Kreise) abdunkeln */
.vv-neu-item button {
  background: rgba(255,255,255,0.06) !important;
  border: 1px solid rgba(255,255,255,0.16) !important;
  color: #eef1f3 !important;
}
.vv-neu-tipplink {
  display: inline-flex; align-items: center; gap: 6px; margin-top: 10px;
  padding: 8px 14px; border-radius: 999px; font-weight: 800; font-size: 13px;
  text-decoration: none; color: #141414;
  background: linear-gradient(135deg, #FFCE00, #e0b400);
}
`;

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
      {/* /neu dunkel — selbst-enthalten, ohne globales CSS anzufassen */}
      <style dangerouslySetInnerHTML={{ __html: NEU_DARK_CSS }} />
      <div aria-hidden style={{ position: "fixed", inset: 0, zIndex: -1, background: "linear-gradient(180deg,#141519 0%,#0c0d0f 100%)", backgroundColor: "#0c0d0f" }} />

      <div className="vv-neu-hero">
        <Link href="/" className="vv-neu-back">← Start</Link>
        <h1 className="vv-neu-title">🆕 Was ist neu auf VibeVibo?</h1>
        <p className="vv-neu-sub">
          Chronologische Timeline mit Datum und Uhrzeit — und Reaktionen auf jeden Beitrag ✿
        </p>
        <Link href="/tipp" className="vv-neu-tipplink">⚽ Zum WM-Tippspiel →</Link>
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
