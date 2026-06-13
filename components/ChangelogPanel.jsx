"use client";

// 🆕 NEU-Reiter im rechten Edge-Panel — als Link auf /neu.
// Zeigt nur Header + Badge mit Anzahl ungesehener Updates.
// Klick navigiert zur /neu-Seite mit allen oeffentlichen Neuerungen.

import { useEffect, useState } from "react";
import Link from "next/link";
import { CHANGELOG_PUBLIC, latestChangelogAt } from "@/lib/changelog";

const SEEN_KEY = "vv_changelog_seen";

export default function ChangelogPanel() {
  const [seenAt, setSeenAt] = useState(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SEEN_KEY);
      setSeenAt(raw ? Number(raw) : 0);
    } catch { setSeenAt(0); }
  }, []);

  const newCount = seenAt != null
    ? CHANGELOG_PUBLIC.filter((e) => new Date(e.at).getTime() > seenAt).length
    : 0;

  return (
    <Link href="/neu" className="vv-edge-changelog-btn" aria-label="Was ist neu?"
      onClick={() => {
        try { localStorage.setItem(SEEN_KEY, String(latestChangelogAt())); } catch {}
      }}>
      <span className="vv-edge-changelog-icon" aria-hidden="true">🆕</span>
      <span className="vv-edge-changelog-headtitle">Was ist neu?</span>
      {newCount > 0 && (
        <span className="vv-edge-changelog-badge">{newCount > 99 ? "99+" : newCount}</span>
      )}
      <span className="vv-edge-changelog-caret" aria-hidden="true">›</span>
    </Link>
  );
}
