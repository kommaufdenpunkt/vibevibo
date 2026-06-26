"use client";

// 🆕 NEU-Reiter im rechten Edge-Panel — als Link auf /neu.
// Zeigt Header + Badge ("Punkt") mit Anzahl ungesehener Updates.
//
// Der Punkt verschwindet, sobald der User die /neu-Seite BESUCHT hat — egal wie
// er dorthin kommt (Klick hier, Footer-Link, News-Toast oder direkte URL).
// Da diese Komponente dauerhaft im Edge-Panel mitläuft, erkennt sie den
// Seitenwechsel über usePathname() und markiert dann automatisch als gelesen.

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { CHANGELOG_PUBLIC, latestChangelogAt } from "@/lib/changelog";

const SEEN_KEY = "vv_changelog_seen";

function markSeen() {
  try { localStorage.setItem(SEEN_KEY, String(latestChangelogAt())); } catch {}
}

export default function ChangelogPanel() {
  const pathname = usePathname();
  const [seenAt, setSeenAt] = useState(null);

  // Initial: gespeicherten Gelesen-Stand laden
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SEEN_KEY);
      setSeenAt(raw ? Number(raw) : 0);
    } catch { setSeenAt(0); }
  }, []);

  // 🆕 Auf /neu → automatisch als gelesen markieren → Punkt verschwindet live.
  useEffect(() => {
    if (pathname === "/neu") {
      markSeen();
      setSeenAt(latestChangelogAt());
    }
  }, [pathname]);

  const newCount = seenAt != null
    ? CHANGELOG_PUBLIC.filter((e) => new Date(e.at).getTime() > seenAt).length
    : 0;

  return (
    <Link href="/neu" className="vv-edge-changelog-btn" aria-label="Was ist neu?"
      onClick={() => { markSeen(); setSeenAt(latestChangelogAt()); }}>
      <span className="vv-edge-changelog-icon" aria-hidden="true">🆕</span>
      <span className="vv-edge-changelog-headtitle">Was ist neu?</span>
      {newCount > 0 && (
        <span className="vv-edge-changelog-badge">{newCount > 99 ? "99+" : newCount}</span>
      )}
      <span className="vv-edge-changelog-caret" aria-hidden="true">›</span>
    </Link>
  );
}
