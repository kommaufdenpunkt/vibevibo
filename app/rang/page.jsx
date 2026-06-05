"use client";

// 🏅 Rang-Seite — Fortschritt, XP-Verlauf, Feature-Tabelle.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMe } from "@/lib/useMe";
import { relTime } from "@/lib/format";

export default function RangPage() {
  const { me, loading } = useMe();
  const router = useRouter();
  const [data, setData] = useState(null);

  useEffect(() => {
    if (loading) return;
    if (!me) { router.push("/login"); return; }
    fetch("/api/rang", { credentials: "include" })
      .then((r) => r.json()).then(setData).catch(() => {});
  }, [me, loading, router]);

  if (loading || !me || !data) return (
    <div className="vv-rang-page">
      <div className="vv-rang-hero">
        <div className="vv-rang-hero-title">🏅 Lade Rang…</div>
      </div>
    </div>
  );

  const pct = Math.round((data.progress || 0) * 100);

  return (
    <div className="vv-rang-page">
      {/* ★ HERO ★ */}
      <div className="vv-rang-hero" style={{ borderColor: data.rankColor }}>
        <div className="vv-rang-hero-stars">
          <span>✨</span><span>★</span><span>✿</span><span>♡</span><span>♥</span><span>★</span><span>✿</span><span>✩</span>
        </div>
        <div className="vv-rang-hero-emoji" style={{ filter: `drop-shadow(0 0 16px ${data.rankColor})` }}>
          {data.rankEmoji}
        </div>
        <h1 className="vv-rang-hero-title">★ RANG {data.rank} ★</h1>
        <div className="vv-rang-hero-name" style={{ color: data.rankColor }}>
          {data.rankName}
        </div>
        <div className="vv-rang-hero-xp">
          {data.xp.toLocaleString("de-DE")} XP gesamt
        </div>

        {/* Fortschrittsbalken */}
        {data.rank < 200 ? (
          <div className="vv-rang-progress">
            <div className="vv-rang-progress-label">
              <span>Fortschritt zu Rang {data.rank + 1}</span>
              <span><b>{pct}%</b> · noch {data.neededXp.toLocaleString("de-DE")} XP</span>
            </div>
            <div className="vv-rang-progress-bar">
              <div className="vv-rang-progress-fill"
                style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${data.rankColor}, #fff)` }} />
              <div className="vv-rang-progress-shine" />
            </div>
            <div className="vv-rang-progress-sub">
              {data.totalToNext.toLocaleString("de-DE")} XP für die ganze Stufe · noch {data.neededXp.toLocaleString("de-DE")} fehlen
            </div>
          </div>
        ) : (
          <div className="vv-rang-max">
            👑 MAXIMALRANG ERREICHT — du bist eine LEGENDE 👑
          </div>
        )}

        <Link href="/profile" className="vv-rang-back-btn">↩ Zurück zum Profil</Link>
      </div>

      {/* Stats: XP pro Quelle */}
      {data.stats?.length > 0 && (
        <div className="vv-rang-card" data-tone="violet">
          <div className="vv-rang-card-title">📊 WIE HAST DU XP VERDIENT?</div>
          <div className="vv-rang-card-body">
            <div className="vv-rang-stats-grid">
              {data.stats.map((s) => (
                <div key={s.source} className="vv-rang-stat">
                  <div className="vv-rang-stat-emoji">{s.emoji}</div>
                  <div className="vv-rang-stat-text">
                    <div className="vv-rang-stat-label">{s.label}</div>
                    <div className="vv-rang-stat-sub">{s.n}× · {s.total} XP</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* XP-Verlauf */}
      {data.log?.length > 0 && (
        <div className="vv-rang-card" data-tone="cyan">
          <div className="vv-rang-card-title">📜 GESTERN GESAMMELTE XP & MEHR</div>
          <div className="vv-rang-card-body">
            <div className="vv-rang-log">
              {data.log.map((e) => (
                <div key={e.id} className="vv-rang-log-row">
                  <span className="vv-rang-log-emoji">{e.emoji}</span>
                  <span className="vv-rang-log-label">{e.label}</span>
                  <span className="vv-rang-log-time">{relTime(e.at)}</span>
                  <span className="vv-rang-log-amount">+{e.amount} XP</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Feature-Tabelle (alle Ränge) */}
      <div className="vv-rang-card" data-tone="gold">
        <div className="vv-rang-card-title">🗺 ALLE RÄNGE & WAS DU FREISCHALTEST</div>
        <div className="vv-rang-card-body">
          <div className="vv-rang-features">
            {data.features.map((f) => {
              const reached = data.rank >= f.rank;
              return (
                <div key={f.rank} className={`vv-rang-feat${reached ? " reached" : ""}`}>
                  <div className="vv-rang-feat-rank">Rang {f.rank}</div>
                  <div className="vv-rang-feat-emoji">{f.icon}</div>
                  <div className="vv-rang-feat-text">{f.text}</div>
                  {reached && <div className="vv-rang-feat-check">✓ Hast du</div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Was bringt XP? */}
      <div className="vv-rang-card" data-tone="pink">
        <div className="vv-rang-card-title">⚡ WAS GIBT WIE VIEL XP?</div>
        <div className="vv-rang-card-body">
          <div className="vv-rang-rewards">
            {Object.entries(data.rewards).map(([source, amount]) => {
              const SOURCE = {
                pinnwand_post:   ["📌", "Pinnwand-Eintrag"],
                guestbook_post:  ["📖", "Gästebuch-Eintrag"],
                gift_send:       ["🎁", "Geschenk verschickt"],
                gift_recv:       ["🎀", "Geschenk bekommen"],
                compliment_send: ["💌", "Kompliment verschickt"],
                compliment_recv: ["💖", "Kompliment bekommen"],
                photo_upload:    ["📸", "Foto hochgeladen"],
                daily_login:     ["🎁", "Tages-Bonus"],
                quest_complete:  ["🥇", "Quest abgeschlossen"],
                vibo_care:       ["🥚", "VIBO gepflegt"],
                world_pickup:    ["🗺", "Karten-Item gefunden"],
                status_set:      ["💬", "Status gesetzt"],
                group_post:      ["🏘", "Gruppen-Post"],
              };
              const [emoji, label] = SOURCE[source] || ["✨", source];
              return (
                <div key={source} className="vv-rang-reward">
                  <span style={{ fontSize: 22 }}>{emoji}</span>
                  <span style={{ flex: 1, fontWeight: 600 }}>{label}</span>
                  <span className="vv-rang-reward-xp">+{amount} XP</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="vv-rang-footer">
        <span>★</span>
        <span>Rang & Erfahrung — Vibe★Vibo Community-System · höhere Ränge = mehr Funktionen + bessere Vibes-Boni</span>
        <span>★</span>
      </div>
    </div>
  );
}
