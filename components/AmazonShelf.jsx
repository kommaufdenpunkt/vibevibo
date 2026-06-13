"use client";

// 🛒 Amazon-Affiliate-Regal — kuratierte Nostalgie-Empfehlungen
// als horizontales Swipe-Karussell. Klick öffnet Amazon-Suche mit
// vibevibo-21-Tag → Provision.

import Link from "next/link";
import { AMAZON_RECOMMENDATIONS, amazonSearch } from "@/lib/affiliate";

export default function AmazonShelf({ compact = false, max = 8, title = "💝 Nostalgie-Empfehlungen" }) {
  const items = AMAZON_RECOMMENDATIONS.slice(0, max);

  return (
    <div className="vv-amzshelf">
      <div className="vv-amzshelf-head">
        <h3 className="vv-amzshelf-title">{title}</h3>
        {!compact && (
          <Link href="/empfehlungen" className="vv-amzshelf-more">Alle anzeigen →</Link>
        )}
      </div>
      <div className="vv-amzshelf-row">
        {items.map((p) => (
          <a key={p.id}
            href={amazonSearch(p.query)}
            target="_blank" rel="noopener sponsored"
            className="vv-amzshelf-card"
            style={{ "--vv-amz-color": p.color }}>
            <div className="vv-amzshelf-emoji">{p.emoji}</div>
            <div className="vv-amzshelf-card-title">{p.title}</div>
            {!compact && <div className="vv-amzshelf-card-desc">{p.desc}</div>}
            <div className="vv-amzshelf-card-cta">Auf Amazon →</div>
          </a>
        ))}
      </div>
      <div className="vv-amzshelf-disclaim">
        🔗 Werbung · Affiliate-Links: Wir bekommen eine kleine Provision wenn du über diese Links bestellst — kostet dich nichts extra.
      </div>
    </div>
  );
}
