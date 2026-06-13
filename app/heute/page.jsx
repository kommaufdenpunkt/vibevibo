"use client";

// 🏠 Heute-Hub — die zentrale Startseite mit allen "Was jetzt"-Infos
// auf einen Blick: Begrüßung, Daily-Claim, Gruscheln-Eingang, Besucher,
// Geburtstage, Quests, Verdienen, Fortune.
//
// Ziel: Jeder Aufruf liefert einen GRUND zu bleiben.
// Layout: kompakte Karten (Stack), eine Aktion pro Karte.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useMe } from "@/lib/useMe";
import { api } from "@/lib/api";

export default function HeutePage() {
  const { me, loading } = useMe();
  const [data, setData] = useState({
    notifications: [], birthdays: [], credits: null,
    quests: { quests: [] }, fortune: null, rewardStatus: null,
    vibo: null,
  });
  const [claimingDaily, setClaimingDaily] = useState(false);
  const [flash, setFlash] = useState("");

  useEffect(() => {
    if (!me) return;
    Promise.all([
      api.notifications().catch(() => ({ notifications: [] })),
      api.birthdays().catch(() => []),
      api.credits().catch(() => null),
      api.quests().catch(() => ({ quests: [] })),
      api.fortune().catch(() => null),
      fetch("/api/ads/status").then((r) => r.ok ? r.json() : null).catch(() => null),
      fetch("/api/vibo").then((r) => r.ok ? r.json() : null).catch(() => null),
    ]).then(([notif, bdays, credits, quests, fortune, ads, vibo]) => {
      setData({
        notifications: notif?.notifications || [],
        birthdays: Array.isArray(bdays) ? bdays : (bdays?.birthdays || []),
        credits, quests: quests || { quests: [] }, fortune,
        rewardStatus: ads, vibo,
      });
    });
  }, [me]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 6) return "Gute Nacht";
    if (h < 11) return "Guten Morgen";
    if (h < 14) return "Mahlzeit";
    if (h < 17) return "Schönen Tag";
    if (h < 22) return "Guten Abend";
    return "Noch wach";
  }, []);

  const dateLabel = useMemo(() => {
    return new Date().toLocaleDateString("de-DE", {
      weekday: "long", day: "2-digit", month: "long", year: "numeric",
    });
  }, []);

  if (loading) return null;
  if (!me) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <Link href="/login?next=/heute" className="vv-btn vv-btn-pink">Zum Login</Link>
      </div>
    );
  }

  const gruschelnIn = data.notifications.filter((n) => n.type === "gruscheln" && !n.read);
  const visitsIn = data.notifications.filter((n) => n.type === "visit" && !n.read);
  const pinnwandIn = data.notifications.filter((n) => n.type === "pinnwand" && !n.read);
  const giftsIn = data.notifications.filter((n) => n.type === "gift" && !n.read);
  const todayBdays = (data.birthdays || []).filter((b) => b.daysUntil === 0);
  const claimableQuests = (data.quests?.quests || []).filter((q) => q.done && !q.claimed);
  const openQuests = (data.quests?.quests || []).filter((q) => !q.done).slice(0, 3);
  const balance = data.credits?.balance ?? 0;
  const streak = data.credits?.dailyStreak ?? 0;
  const lastDailyAt = data.credits?.lastDailyAt || 0;
  const canClaimDaily = Date.now() - lastDailyAt > 22 * 3600 * 1000;
  const rewardsLeft = data.rewardStatus
    ? Math.max(0, (data.rewardStatus.maxRewardsPerDay || 30) - (data.rewardStatus.rewardsToday || 0))
    : 0;
  const vibesLeft = data.rewardStatus
    ? Math.max(0, (data.rewardStatus.maxVibesPerDay || 120) - (data.rewardStatus.vibesToday || 0))
    : 0;

  async function claimDaily() {
    setClaimingDaily(true);
    try {
      const r = await api.claimDaily();
      setFlash(`✨ +${r.amount} ✨ Tages-Bonus! Streak: ${r.streak} Tage 🔥`);
      const credits = await api.credits().catch(() => null);
      setData((d) => ({ ...d, credits }));
    } catch (e) {
      setFlash(`⚠ ${e.message || String(e)}`);
    } finally {
      setClaimingDaily(false);
      setTimeout(() => setFlash(""), 5000);
    }
  }

  async function gruschelBack(username) {
    try {
      await api.sendNudge(username);
      setFlash(`🫶 Zurück gegruschelt @${username}`);
      setTimeout(() => setFlash(""), 3000);
    } catch (e) {
      setFlash(`⚠ ${e.message || "Fehler"}`);
      setTimeout(() => setFlash(""), 3000);
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "10px 12px 80px" }}>

      {/* HERO: Begrüßung + Datum + Saldo */}
      <div style={{
        background: "linear-gradient(135deg, #fce7f3, #fef3c7)",
        border: "2px solid #f9a8d4",
        borderRadius: 16, padding: "14px 16px", marginBottom: 12,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#9d174d", opacity: 0.8 }}>
              {dateLabel}
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#831843", lineHeight: 1.2, marginTop: 2 }}>
              {greeting}, {me.displayName || me.username}!
            </div>
          </div>
          <div style={{
            background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
            color: "#1c1c1e", padding: "8px 14px", borderRadius: 999,
            fontWeight: 900, fontSize: 16, whiteSpace: "nowrap",
            boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
          }}>
            ✨ {balance}
          </div>
        </div>
      </div>

      {flash && (
        <div style={{
          background: flash.startsWith("⚠") ? "#fee2e2" : "#dcfce7",
          color: flash.startsWith("⚠") ? "#991b1b" : "#166534",
          padding: 10, borderRadius: 10, marginBottom: 10,
          fontWeight: 700, fontSize: 13, textAlign: "center",
        }}>{flash}</div>
      )}

      {/* DAILY CLAIM — nur wenn beanspruchbar */}
      {canClaimDaily && (
        <Card emoji="🎁" title="Tages-Bonus" tint="#fef3c7" tintBorder="#fbbf24">
          <div style={{ fontSize: 13, color: "#78350f", marginBottom: 8 }}>
            Hol dir deinen Tages-Bonus ab — {streak > 0 ? `du bist auf einer ${streak}-Tage-Streak 🔥` : "starte deine Streak"}.
          </div>
          <button type="button" disabled={claimingDaily} onClick={claimDaily}
            className="vv-btn-big vv-btn-big-pink" style={{ width: "100%" }}>
            {claimingDaily ? "…" : "🎁 Jetzt abholen"}
          </button>
        </Card>
      )}

      {/* CLAIMABLE QUESTS */}
      {claimableQuests.length > 0 && (
        <Card emoji="🏆" title={`${claimableQuests.length} Quest${claimableQuests.length > 1 ? "s" : ""} fertig!`} tint="#fce7f3" tintBorder="#ec4899">
          <div style={{ fontSize: 12, color: "#831843", marginBottom: 8 }}>
            Du hast {claimableQuests.length} Quest{claimableQuests.length > 1 ? "s" : ""} abgeschlossen — Belohnung wartet.
          </div>
          <Link href="/quests" className="vv-btn-big vv-btn-big-violet" style={{ display: "block", textAlign: "center", textDecoration: "none" }}>
            Belohnung abholen →
          </Link>
        </Card>
      )}

      {/* GRUSCHELN IN */}
      {gruschelnIn.length > 0 && (
        <Card emoji="🫶" title={`${gruschelnIn.length}× gegruschelt worden`} tint="#dbeafe" tintBorder="#60a5fa">
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {gruschelnIn.slice(0, 4).map((n) => (
              <div key={n.id} style={{
                display: "flex", alignItems: "center", gap: 8,
                background: "#fff", padding: "6px 10px", borderRadius: 8,
              }}>
                <Link href={`/u/${n.actorUsername}`} style={{ flex: 1, minWidth: 0, fontWeight: 700, fontSize: 13, color: "#1e3a8a", textDecoration: "none" }}>
                  @{n.actorUsername}
                </Link>
                <button type="button" onClick={() => gruschelBack(n.actorUsername)}
                  className="vv-btn vv-btn-sm" style={{ fontSize: 11 }}>
                  🫶 zurück
                </button>
              </div>
            ))}
            {gruschelnIn.length > 4 && (
              <Link href="/notifications" style={{ fontSize: 12, color: "#1e3a8a", textAlign: "center", marginTop: 4 }}>
                +{gruschelnIn.length - 4} weitere ansehen →
              </Link>
            )}
          </div>
        </Card>
      )}

      {/* BIRTHDAYS */}
      {todayBdays.length > 0 && (
        <Card emoji="🎂" title={`${todayBdays.length} Geburtstag${todayBdays.length > 1 ? "e" : ""} heute`} tint="#fef3c7" tintBorder="#fbbf24">
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {todayBdays.slice(0, 4).map((b) => (
              <div key={b.username} style={{
                display: "flex", alignItems: "center", gap: 8,
                background: "#fff", padding: "6px 10px", borderRadius: 8,
              }}>
                <Link href={`/u/${b.username}`} style={{ flex: 1, fontWeight: 700, fontSize: 13, color: "#78350f", textDecoration: "none" }}>
                  🎂 {b.displayName || `@${b.username}`}
                </Link>
                <Link href={`/u/${b.username}/pinnwand`} className="vv-btn vv-btn-sm" style={{ fontSize: 11, textDecoration: "none" }}>
                  Gratulieren →
                </Link>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* VISITS IN */}
      {visitsIn.length > 0 && (
        <Card emoji="👀" title={`${visitsIn.length} Profil-Besuche`} tint="#f3e8ff" tintBorder="#a855f7">
          <div style={{ fontSize: 12, color: "#581c87", marginBottom: 6 }}>
            Wer war kürzlich bei dir:
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {visitsIn.slice(0, 8).map((n) => (
              <Link key={n.id} href={`/u/${n.actorUsername}`}
                style={{
                  background: "#fff", padding: "4px 10px", borderRadius: 999,
                  fontSize: 12, fontWeight: 700, color: "#581c87", textDecoration: "none",
                }}>
                @{n.actorUsername}
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* PINNWAND IN */}
      {pinnwandIn.length > 0 && (
        <Card emoji="📌" title={`${pinnwandIn.length} neue Pinnwand-Einträge`} tint="#fef3c7" tintBorder="#fbbf24">
          <Link href={`/u/${me.username}/pinnwand`} className="vv-btn-big vv-btn-big-violet" style={{ display: "block", textAlign: "center", textDecoration: "none" }}>
            📌 Ansehen
          </Link>
        </Card>
      )}

      {/* GIFTS IN */}
      {giftsIn.length > 0 && (
        <Card emoji="🎁" title={`${giftsIn.length} neue Geschenke`} tint="#ffedd5" tintBorder="#fb923c">
          <Link href="/geschenke" className="vv-btn-big vv-btn-big-pink" style={{ display: "block", textAlign: "center", textDecoration: "none" }}>
            🎁 Auspacken
          </Link>
        </Card>
      )}

      {/* VIBO STATUS */}
      {data.vibo?.vibo && (
        <Card emoji="🥚" title={`Dein VIBO: ${data.vibo.vibo.name || "VIBO"}`} tint="#ede9fe" tintBorder="#a78bfa">
          <div style={{ fontSize: 12, color: "#4c1d95", marginBottom: 6 }}>
            {data.vibo.vibo.mood ? `Stimmung: ${data.vibo.vibo.mood}` : "Schau wie's deinem VIBO geht."}
          </div>
          <Link href="/vibo" className="vv-btn-big vv-btn-big-violet" style={{ display: "block", textAlign: "center", textDecoration: "none" }}>
            🥚 VIBO besuchen
          </Link>
        </Card>
      )}

      {/* REWARDS */}
      {rewardsLeft > 0 && (
        <Card emoji="📺" title={`Heute noch ${rewardsLeft} Werbe-Rewards`} tint="#dcfce7" tintBorder="#22c55e">
          <div style={{ fontSize: 12, color: "#166534", marginBottom: 6 }}>
            Bis zu <b>{vibesLeft} ✨</b> kannst du heute noch verdienen.
          </div>
          <Link href="/vibes-verdienen" className="vv-btn-big vv-btn-big-pink" style={{ display: "block", textAlign: "center", textDecoration: "none" }}>
            💰 Vibes verdienen
          </Link>
        </Card>
      )}

      {/* OPEN QUESTS — kompakt am Ende */}
      {openQuests.length > 0 && (
        <Card emoji="📋" title={`Offene Quests (${openQuests.length}+)`} tint="#fef9c3" tintBorder="#eab308">
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {openQuests.map((q) => (
              <div key={q.id} style={{
                background: "#fff", padding: "6px 10px", borderRadius: 6,
                fontSize: 12, color: "#713f12", display: "flex", justifyContent: "space-between",
              }}>
                <span>{q.title}</span>
                <span style={{ fontWeight: 700, color: "#a16207" }}>+{q.reward} ✨</span>
              </div>
            ))}
            <Link href="/quests" style={{ fontSize: 12, textAlign: "center", marginTop: 4, color: "#713f12" }}>
              Alle Quests ansehen →
            </Link>
          </div>
        </Card>
      )}

      {/* FORTUNE — Tages-Spruch */}
      {data.fortune?.text && (
        <Card emoji="🔮" title="Spruch des Tages" tint="#f5d0fe" tintBorder="#c026d3">
          <div style={{
            fontSize: 13, fontStyle: "italic", color: "#581c87",
            background: "#fff", padding: "10px 12px", borderRadius: 8,
            lineHeight: 1.5,
          }}>
            „{data.fortune.text}"
          </div>
        </Card>
      )}

      {/* Footer-Hint */}
      <div style={{
        textAlign: "center", marginTop: 16, padding: "10px",
        fontSize: 11, color: "#94a3b8",
      }}>
        ✿ Heute aktualisiert sich automatisch · Komm jeden Tag vorbei für mehr Vibes ✿
      </div>
    </div>
  );
}

function Card({ emoji, title, tint, tintBorder, children }) {
  return (
    <div style={{
      background: tint || "#fff",
      border: `2px solid ${tintBorder || "#e5e7eb"}`,
      borderRadius: 12, padding: "10px 12px", marginBottom: 10,
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8, marginBottom: 6,
      }}>
        <span style={{ fontSize: 20 }}>{emoji}</span>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "#1f2937" }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}
