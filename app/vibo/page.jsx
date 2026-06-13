"use client";

// 🥚 VIBO v3 — Generalüberholt zum 2. Mal:
// Transparenter Hintergrund (Theme scheint durch), Glas-Karten,
// kompakter Header-Strip + Tab-Strip + Tab-Content in Glass-Cards.

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMe } from "@/lib/useMe";
import ViboPet from "@/components/ViboPet";
import QuestPanel from "@/components/QuestPanel";
import ShopPanel from "@/components/ShopPanel";
import CardCollection from "@/components/CardCollection";
import WorldMap from "@/components/WorldMap";

const TABS = [
  { id: "pet",    icon: "🥚", label: "VIBO" },
  { id: "quests", icon: "🎯", label: "Quests" },
  { id: "shop",   icon: "🛒", label: "Shop" },
  { id: "cards",  icon: "🃏", label: "Karten" },
  { id: "map",    icon: "🗺️", label: "Karte" },
];

// Wrapper mit Suspense — Next.js 15+ braucht das fuer useSearchParams
export default function ViboPageWrapper() {
  return (
    <Suspense fallback={null}>
      <ViboPage />
    </Suspense>
  );
}

function ViboPage() {
  const { me, loading } = useMe();
  const router = useRouter();
  const params = useSearchParams();
  const [tab, setTab] = useState(() => {
    const t = params.get("tab");
    return TABS.find((x) => x.id === t) ? t : "pet";
  });
  const [vibo, setVibo] = useState(null);

  useEffect(() => {
    if (!loading && !me) router.push("/login");
  }, [loading, me, router]);

  // Hole VIBO-Header-Info (Name, Stufe, ageDays) für die Titelzeile
  useEffect(() => {
    if (!me) return;
    fetch("/api/vibo").then((r) => r.ok ? r.json() : null)
      .then((d) => setVibo(d?.vibo || null)).catch(() => {});
  }, [me]);

  if (loading || !me) return null;

  return (
    <div style={{
      background: "transparent",  // Theme/Skin scheint durch
      paddingBottom: 100,
    }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "12px 12px 0" }}>

        {/* === HEADER-STRIP (Glas-Pille) === */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          padding: "8px 14px", borderRadius: 999, marginBottom: 12,
          border: "1px solid rgba(255,255,255,0.4)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
        }}>
          <Link href="/heute" style={{
            background: "linear-gradient(135deg, #a855f7, #7c3aed)",
            color: "#fff", borderRadius: 999,
            padding: "5px 12px", fontSize: 12, fontWeight: 800,
            textDecoration: "none", whiteSpace: "nowrap",
          }}>← Heute</Link>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: "#7c3aed",
              textTransform: "uppercase", letterSpacing: 0.5,
            }}>Dein Tamagotchi</div>
            <div style={{
              fontSize: 16, fontWeight: 900, color: "#1f2937",
              lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              🥚 {vibo?.name || "Mein VIBO"}
              {vibo && vibo.ageDays != null && (
                <span style={{
                  fontSize: 11, color: "#94a3b8", fontWeight: 600,
                  marginLeft: 6,
                }}>· Tag {vibo.ageDays}</span>
              )}
            </div>
          </div>
        </div>

        {/* === TAB-STRIP (Glas) === */}
        <div style={{
          display: "flex", gap: 4,
          background: "rgba(255,255,255,0.6)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderRadius: 14, padding: 4,
          border: "1px solid rgba(255,255,255,0.4)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          marginBottom: 12,
          overflowX: "auto",
          scrollbarWidth: "none",
        }}>
          {TABS.map((t) => (
            <button key={t.id} type="button"
              onClick={() => setTab(t.id)}
              style={{
                flex: "1 0 auto",
                padding: "8px 14px",
                borderRadius: 10,
                border: "none",
                background: tab === t.id
                  ? "linear-gradient(135deg, #a855f7, #7c3aed)"
                  : "transparent",
                color: tab === t.id ? "#fff" : "#475569",
                fontWeight: tab === t.id ? 800 : 600,
                fontSize: 13,
                cursor: "pointer",
                whiteSpace: "nowrap",
                boxShadow: tab === t.id ? "0 2px 8px rgba(124,58,237,0.35)" : "none",
                transition: "all 0.15s",
              }}>
              <span style={{ marginRight: 4 }}>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>

        {/* === TAB-CONTENT in Glas-Karte === */}
        {tab === "pet" && (
          <GlassCard>
            <ViboPet />
          </GlassCard>
        )}

        {tab === "quests" && (
          <GlassCard title="🎯 Quests" subtitle="Erfülle Aufgaben für Vibes und Items.">
            <QuestPanel />
          </GlassCard>
        )}

        {tab === "shop" && (
          <GlassCard title="🛒 VIBO-Shop" subtitle="Futter, Möbel, Karten — alles für dein VIBO.">
            <ShopPanel />
          </GlassCard>
        )}

        {tab === "cards" && (
          <GlassCard title="🃏 Sammelkarten" subtitle="Deine Sammlung — tauschbar mit Freunden.">
            <CardCollection />
          </GlassCard>
        )}

        {tab === "map" && (
          <GlassCard
            title="🗺️ Item-Karte"
            subtitle="Items einsammeln, Basar besuchen, fischen."
            footer={
              <div style={{ textAlign: "center", marginTop: 10 }}>
                <Link href="/karte" style={{
                  display: "inline-block",
                  background: "linear-gradient(135deg, #06b6d4, #0891b2)",
                  color: "#fff", padding: "8px 16px", borderRadius: 999,
                  fontWeight: 800, fontSize: 13, textDecoration: "none",
                  boxShadow: "0 2px 8px rgba(8,145,178,0.3)",
                }}>↗ Karte als Vollbild öffnen</Link>
              </div>
            }>
            <WorldMap compact />
          </GlassCard>
        )}

        {/* Tipp-Streifen */}
        <div style={{
          marginTop: 16, padding: "10px 14px",
          background: "rgba(255,255,255,0.7)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          borderRadius: 12, fontSize: 11.5, color: "#475569", textAlign: "center",
          border: "1px solid rgba(255,255,255,0.4)",
          lineHeight: 1.5,
        }}>
          💡 <b>Pflege täglich</b> — füttern, streicheln, spielen · Energie verfällt mit der Zeit · Quests bringen ✨
        </div>
      </div>
    </div>
  );
}

function GlassCard({ title, subtitle, children, footer }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.88)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      borderRadius: 16, padding: 16,
      boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
      border: "1px solid rgba(255,255,255,0.4)",
    }}>
      {title && (
        <div style={{ marginBottom: 10 }}>
          <h2 style={{
            margin: 0, fontSize: 17, fontWeight: 900, color: "#581c87",
          }}>{title}</h2>
          {subtitle && (
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{subtitle}</div>
          )}
        </div>
      )}
      {children}
      {footer}
    </div>
  );
}
