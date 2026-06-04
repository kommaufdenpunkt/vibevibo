"use client";

// 🥚 VIBO — eigene Seite (vorher nur via /messenger?tab=vibo erreichbar).
// Verbindet alle VIBO-Komponenten zentral mit 2007er-Style-Wrapper.

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMe } from "@/lib/useMe";
import ViboPet from "@/components/ViboPet";
import QuestPanel from "@/components/QuestPanel";
import ShopPanel from "@/components/ShopPanel";
import CardCollection from "@/components/CardCollection";
import WorldMap from "@/components/WorldMap";
import ActivityBars from "@/components/ActivityBars";

export default function ViboPage() {
  const { me, loading } = useMe();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !me) router.push("/login");
  }, [loading, me, router]);

  if (loading || !me) return null;

  return (
    <div className="vv-vibo-page">
      {/* ★ HERO ★ */}
      <div className="vv-vibo-hero">
        <div className="vv-vibo-hero-stars">
          <span>✨</span><span>★</span><span>✿</span><span>♡</span>
          <span>♥</span><span>★</span><span>✿</span><span>✩</span>
        </div>
        <div className="vv-vibo-hero-emoji">🥚</div>
        <h1 className="vv-vibo-hero-title">★ MEIN VIBO ★</h1>
        <div className="vv-vibo-hero-sub">
          ✿ Dein virtuelles Pet · füttern · spielen · großziehen ✿
        </div>
        <div className="vv-vibo-hero-actions">
          <Link href="/karte" className="vv-vibo-hero-link">🗺️ Karte</Link>
          <Link href="/shop" className="vv-vibo-hero-link">🛍 Shop</Link>
          <Link href="/profile/transactions" className="vv-vibo-hero-link">💰 Vibes</Link>
          <Link href="/profile" className="vv-vibo-hero-link">↩ Profil</Link>
        </div>
      </div>

      {/* Pet + Quests */}
      <div className="vv-vibo-grid">
        <div className="vv-vibo-col-main">
          <div className="vv-vibo-card" data-tone="violet">
            <div className="vv-vibo-card-title">🥚 DEIN VIBO</div>
            <div className="vv-vibo-card-body">
              <ViboPet />
            </div>
          </div>

          <div className="vv-vibo-card" data-tone="cyan">
            <div className="vv-vibo-card-title">🗺 ITEMS AUF DER KARTE</div>
            <div className="vv-vibo-card-body">
              <div style={{ fontSize: 11.5, opacity: 0.8, marginBottom: 8 }}>
                Items einsammeln, Basar besuchen, fischen — auch in der Vollbild-Karte.
              </div>
              <WorldMap compact />
              <div style={{ marginTop: 8, textAlign: "center" }}>
                <Link href="/karte" className="vv-vibo-fullmap-btn">↗ Karte als Vollbild öffnen</Link>
              </div>
            </div>
          </div>
        </div>

        <div className="vv-vibo-col-side">
          <div className="vv-vibo-card" data-tone="pink">
            <div className="vv-vibo-card-title">🎯 QUESTS</div>
            <div className="vv-vibo-card-body">
              <QuestPanel />
            </div>
          </div>

          <div className="vv-vibo-card" data-tone="gold">
            <div className="vv-vibo-card-title">🛒 VIBO-SHOP</div>
            <div className="vv-vibo-card-body">
              <ShopPanel />
            </div>
          </div>

          <div className="vv-vibo-card" data-tone="violet">
            <div className="vv-vibo-card-title">🃏 SAMMELKARTEN</div>
            <div className="vv-vibo-card-body">
              <CardCollection />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="vv-vibo-footer">
        <span>★</span>
        <span>VIBO lebt von dir — füttere täglich, spiele regelmäßig, erfülle Quests für mehr Vibes ✨</span>
        <span>★</span>
      </div>
    </div>
  );
}
