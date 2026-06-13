"use client";

// 💝 Empfehlungs-Seite — Amazon-Affiliate-Shop mit thematischer Nostalgie.

import Link from "next/link";
import { AMAZON_RECOMMENDATIONS, amazonSearch } from "@/lib/affiliate";

export default function EmpfehlungenPage() {
  return (
    <div className="vv-emp-page">
      <div className="vv-emp-hero">
        <Link href="/" className="vv-emp-back">← Start</Link>
        <h1 className="vv-emp-title">💝 Nostalgie-Empfehlungen</h1>
        <p className="vv-emp-sub">
          Handverlesene Bücher, Musik & Merch aus den 2000ern — direkt auf Amazon.
          Klick öffnet Amazon mit dem VibeVibo-Partner-Tag. ✿
        </p>
      </div>

      <div className="vv-emp-grid">
        {AMAZON_RECOMMENDATIONS.map((p) => (
          <a key={p.id}
            href={amazonSearch(p.query)}
            target="_blank" rel="noopener sponsored"
            className="vv-emp-card"
            style={{ "--vv-emp-color": p.color }}>
            <div className="vv-emp-card-emoji">{p.emoji}</div>
            <h3 className="vv-emp-card-title">{p.title}</h3>
            <p className="vv-emp-card-desc">{p.desc}</p>
            <div className="vv-emp-card-cta">🛒 Auf Amazon ansehen</div>
          </a>
        ))}
      </div>

      <div className="vv-emp-disclaim">
        🔗 <b>Werbung · Affiliate-Hinweis:</b> Die Links auf dieser Seite führen zu Amazon.
        Wenn du dort etwas kaufst, bekommen wir eine kleine Provision (~3%) — der Preis
        bleibt für dich gleich. So finanzieren wir den Server und können VibeVibo am
        Leben halten. Danke ♥
      </div>
    </div>
  );
}
