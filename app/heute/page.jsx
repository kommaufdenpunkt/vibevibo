"use client";

// 🏠 Heute v2 — Dashboard statt Karten-Liste.
// Layout: kompakter Header-Strip + 4 große Quick-Action-Tiles +
// nur RELEVANTE Alerts darunter + Activity-Feed.
// Immer voll — auch bei leerem Account dank Quick-Tiles + Stats.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useMe } from "@/lib/useMe";
import { api } from "@/lib/api";

export default function HeutePage() {
  const { me, loading } = useMe();
  const [data, setData] = useState({
    notifications: [], credits: null, vibo: null, rewardStatus: null,
    fortune: null, quests: { quests: [] }, birthdays: [], buschfunk: [],
  });
  const [busy, setBusy] = useState("");
  const [flash, setFlash] = useState("");

  useEffect(() => {
    if (!me) return;
    Promise.all([
      api.notifications().catch(() => ({ notifications: [] })),
      api.credits().catch(() => null),
      fetch("/api/vibo").then((r) => r.ok ? r.json() : null).catch(() => null),
      fetch("/api/ads/status").then((r) => r.ok ? r.json() : null).catch(() => null),
      api.fortune().catch(() => null),
      api.quests().catch(() => ({ quests: [] })),
      api.birthdays().catch(() => []),
      api.buschfunk().catch(() => null),
    ]).then(([notif, credits, vibo, ads, fortune, quests, bdays, buschfunk]) => {
      setData({
        notifications: notif?.notifications || [],
        credits, vibo, rewardStatus: ads, fortune,
        quests: quests || { quests: [] },
        birthdays: Array.isArray(bdays) ? bdays : (bdays?.birthdays || []),
        buschfunk: buschfunk?.events || [],
      });
    });
  }, [me]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 6) return "Gute Nacht";
    if (h < 11) return "Morgen";
    if (h < 14) return "Mahlzeit";
    if (h < 17) return "Hi";
    if (h < 22) return "Abend";
    return "Spät noch wach";
  }, []);

  const dateShort = useMemo(() => new Date().toLocaleDateString("de-DE", {
    weekday: "short", day: "2-digit", month: "long",
  }), []);

  if (loading) return null;
  if (!me) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <Link href="/login?next=/heute" style={{
          background: "linear-gradient(135deg, #ec4899, #8b5cf6)",
          color: "#fff", padding: "12px 24px", borderRadius: 999,
          textDecoration: "none", fontWeight: 800,
        }}>Zum Login</Link>
      </div>
    );
  }

  const balance = data.credits?.balance ?? 0;
  const streak = data.credits?.dailyStreak ?? 0;
  const lastDailyAt = data.credits?.lastDailyAt || 0;
  const canClaimDaily = Date.now() - lastDailyAt > 22 * 3600 * 1000;

  // Sammle Alerts (nur wichtige!)
  const alerts = [];
  if (canClaimDaily) alerts.push({
    icon: "🎁", text: "Tages-Bonus wartet", action: "Abholen", color: "#fbbf24",
    onClick: async () => {
      setBusy("daily");
      try {
        const r = await api.claimDaily();
        setFlash(`✨ +${r.amount} Vibes! Streak: ${r.streak} 🔥`);
        const c = await api.credits().catch(() => null);
        setData((d) => ({ ...d, credits: c }));
      } catch (e) { setFlash(`⚠ ${e.message}`); }
      finally { setBusy(""); setTimeout(() => setFlash(""), 4000); }
    },
  });

  const gruschelnIn = data.notifications.filter((n) => n.type === "gruscheln" && !n.read);
  if (gruschelnIn.length > 0) alerts.push({
    icon: "🫶", text: `${gruschelnIn.length}× gegruschelt worden`,
    action: "Ansehen", href: "/notifications", color: "#60a5fa",
  });

  const visitsIn = data.notifications.filter((n) => n.type === "visit" && !n.read);
  if (visitsIn.length > 0) alerts.push({
    icon: "👀", text: `${visitsIn.length} neue Profil-Besuche`,
    action: "Wer war hier?", href: "/notifications", color: "#a78bfa",
  });

  const claimableQuests = (data.quests?.quests || []).filter((q) => q.done && !q.claimed);
  if (claimableQuests.length > 0) alerts.push({
    icon: "🏆", text: `${claimableQuests.length} Quest${claimableQuests.length > 1 ? "s" : ""} fertig`,
    action: "Belohnung", href: "/quests", color: "#f472b6",
  });

  const giftsIn = data.notifications.filter((n) => n.type === "gift" && !n.read);
  if (giftsIn.length > 0) alerts.push({
    icon: "🎁", text: `${giftsIn.length} neue Geschenke`,
    action: "Auspacken", href: "/geschenke", color: "#fb923c",
  });

  const pinnwandIn = data.notifications.filter((n) => n.type === "pinnwand" && !n.read);
  if (pinnwandIn.length > 0) alerts.push({
    icon: "📌", text: `${pinnwandIn.length} neue Pinnwand-Einträge`,
    action: "Lesen", href: `/u/${me.username}/pinnwand`, color: "#fbbf24",
  });

  const todayBdays = (data.birthdays || []).filter((b) => b.daysUntil === 0);
  if (todayBdays.length > 0) alerts.push({
    icon: "🎂", text: `${todayBdays.length} Geburtstag${todayBdays.length > 1 ? "e" : ""} heute`,
    action: "Gratulieren", href: `/u/${todayBdays[0].username}/pinnwand`, color: "#fde047",
  });

  const recentActivity = data.notifications.slice(0, 10);

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg, #fef3f9 0%, #f0e7ff 60%, #e0f2fe 100%)",
      paddingBottom: 100,
    }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "12px 12px 0" }}>

        {/* === HEADER-STRIP === */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "rgba(255,255,255,0.7)",
          backdropFilter: "blur(8px)",
          padding: "8px 14px", borderRadius: 999, marginBottom: 12,
          border: "1px solid rgba(168,85,247,0.15)",
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#7c3aed", lineHeight: 1 }}>
              {dateShort.toUpperCase()}
            </div>
            <div style={{ fontSize: 15, fontWeight: 900, color: "#1f2937", marginTop: 2 }}>
              {greeting}, {me.displayName || me.username}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <div style={{
              background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
              color: "#1c1c1e", padding: "5px 12px", borderRadius: 999,
              fontWeight: 900, fontSize: 13,
            }}>✨ {balance}</div>
            {streak > 0 && (
              <div style={{
                background: "linear-gradient(135deg, #ef4444, #dc2626)",
                color: "#fff", padding: "5px 10px", borderRadius: 999,
                fontWeight: 800, fontSize: 12,
              }}>🔥 {streak}</div>
            )}
          </div>
        </div>

        {flash && (
          <div style={{
            background: flash.startsWith("⚠") ? "#fee2e2" : "#dcfce7",
            color: flash.startsWith("⚠") ? "#991b1b" : "#166534",
            padding: 10, borderRadius: 12, marginBottom: 10,
            fontWeight: 700, fontSize: 13, textAlign: "center",
          }}>{flash}</div>
        )}

        {/* === ALERTS (nur wichtige, kompakt) === */}
        {alerts.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
            {alerts.map((a, i) => (
              <AlertRow key={i} alert={a} busy={busy === "daily" && a.icon === "🎁"} />
            ))}
          </div>
        )}

        {/* === WAS KANN ICH MACHEN? (Aktions-Tiles, immer da) === */}
        <SectionTitle>🚀 Schnell loslegen</SectionTitle>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 10, marginBottom: 16,
        }}>
          <BigTile href="/buschfunk"
            color1="#fb923c" color2="#ef4444"
            icon="📣" title="Buschfunk" sub="Was läuft heute?" />
          <BigTile href="/messenger"
            color1="#06b6d4" color2="#0284c7"
            icon="💬" title="Messenger" sub="Direkt chatten" />
          <BigTile href="/vibo"
            color1="#a855f7" color2="#7c3aed"
            icon="🥚" title="Mein VIBO" sub={data.vibo?.vibo?.name || "Dein Pet"} />
          <BigTile href="/karte"
            color1="#06b6d4" color2="#0e7490"
            icon="🗺️" title="Realitätskarte" sub="Welt erkunden" />
          <BigTile href="/geschenke"
            color1="#fb923c" color2="#ea580c"
            icon="🎁" title="Geschenke" sub="Verschicken" />
          <BigTile href="/fotos"
            color1="#ec4899" color2="#be185d"
            icon="📸" title="Fotos" sub="Galerie" />
          <BigTile href="/freunde"
            color1="#3b82f6" color2="#1e40af"
            icon="👯" title="Freunde" sub="Wer ist online?" />
          <BigTile href="/apps"
            color1="#ec4899" color2="#8b5cf6"
            icon="📲" title="Alle Apps" sub="Komplett-Übersicht" />
        </div>

        {/* === BUSCHFUNK FEED — was läuft gerade? === */}
        {data.buschfunk.length > 0 && (
          <>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              marginBottom: 8, padding: "0 4px",
            }}>
              <SectionTitle compact>🆕 Was ist neu?</SectionTitle>
              <Link href="/buschfunk" style={{
                fontSize: 12, color: "#ea580c", fontWeight: 800,
                textDecoration: "none", padding: "4px 10px",
                background: "rgba(251,146,60,0.15)", borderRadius: 999,
              }}>📣 Buschfunk →</Link>
            </div>
            <div style={{
              background: "rgba(255,255,255,0.85)",
              borderRadius: 14, padding: 10, marginBottom: 14,
              border: "1px solid rgba(251,146,60,0.25)",
              boxShadow: "0 2px 8px rgba(251,146,60,0.08)",
              display: "flex", flexDirection: "column", gap: 6,
              maxHeight: 420, overflowY: "auto",
              // smooth scrolling
              scrollBehavior: "smooth",
              WebkitOverflowScrolling: "touch",
            }}>
              {data.buschfunk.slice(0, 15).map((ev, i) => (
                <BuschfunkPreview key={ev.id || `${ev.type}-${ev.at}-${ev.actor?.username || i}`} ev={ev} />
              ))}
            </div>
          </>
        )}

        {/* === FORTUNE === */}
        {data.fortune?.text && (
          <div style={{
            background: "linear-gradient(135deg, #fce7f3, #f5d0fe)",
            border: "1px solid rgba(192,38,211,0.25)",
            borderRadius: 14, padding: "12px 14px", marginBottom: 14,
          }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#86198f", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>
              🔮 Spruch des Tages
            </div>
            <div style={{
              fontSize: 14, fontStyle: "italic", color: "#581c87", lineHeight: 1.5,
            }}>„{data.fortune.text}"</div>
          </div>
        )}

        {/* === ACTIVITY FEED (kompakte Liste) === */}
        {recentActivity.length > 0 && (
          <>
            <SectionTitle>📰 Deine Benachrichtigungen</SectionTitle>
            <div style={{
              background: "rgba(255,255,255,0.7)",
              borderRadius: 14, padding: 12, marginBottom: 14,
              border: "1px solid rgba(168,85,247,0.12)",
              display: "flex", flexDirection: "column", gap: 4,
            }}>
              {recentActivity.map((n) => <ActivityRow key={n.id} n={n} myUsername={me.username} />)}
            </div>
          </>
        )}

        {/* Empty-Stat (nur falls wirklich nix da) */}
        {alerts.length === 0 && recentActivity.length === 0 && (
          <div style={{
            textAlign: "center", padding: "30px 20px",
            background: "rgba(255,255,255,0.5)",
            borderRadius: 14, color: "#94a3b8",
          }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>✨</div>
            <div style={{ fontWeight: 700, color: "#475569" }}>Alles ruhig hier.</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>
              Schreib was im Buschfunk oder besuch dein VIBO ✿
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AlertRow({ alert, busy }) {
  const inner = (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      background: "#fff",
      border: `2px solid ${alert.color}`,
      borderRadius: 12, padding: "10px 12px",
      boxShadow: `0 2px 8px ${alert.color}33`,
      cursor: "pointer",
      transition: "transform 0.1s",
    }}>
      <div style={{ fontSize: 22 }}>{alert.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, color: "#1f2937", fontSize: 14, lineHeight: 1.2 }}>{alert.text}</div>
      </div>
      <div style={{
        background: alert.color, color: "#fff",
        padding: "5px 12px", borderRadius: 999,
        fontWeight: 800, fontSize: 12, whiteSpace: "nowrap",
      }}>{busy ? "…" : alert.action} →</div>
    </div>
  );

  if (alert.href) return <Link href={alert.href} style={{ textDecoration: "none" }}>{inner}</Link>;
  return <button type="button" onClick={alert.onClick} disabled={busy}
    style={{ all: "unset", display: "block", width: "100%" }}>{inner}</button>;
}

function BigTile({ href, color1, color2, icon, title, sub }) {
  return (
    <Link href={href} style={{
      display: "flex", flexDirection: "column",
      background: `linear-gradient(135deg, ${color1}, ${color2})`,
      color: "#fff", padding: "14px 14px", borderRadius: 16,
      textDecoration: "none", minHeight: 100,
      boxShadow: `0 4px 12px ${color1}40`,
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ fontSize: 32, lineHeight: 1, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontWeight: 900, fontSize: 16, lineHeight: 1.2 }}>{title}</div>
      <div style={{ fontSize: 11.5, opacity: 0.9, marginTop: 2 }}>{sub}</div>
    </Link>
  );
}

function SectionTitle({ children, compact = false }) {
  return (
    <div style={{
      fontSize: compact ? 12 : 12, fontWeight: 800, color: "#6b7280",
      marginBottom: compact ? 0 : 8, padding: compact ? 0 : "0 4px",
      textTransform: "uppercase", letterSpacing: 0.5,
    }}>{children}</div>
  );
}

function BuschfunkPreview({ ev }) {
  const TYPE_ICON = {
    status:    "💬", pinnwand:   "📌", gift:    "🎁",
    newpic:    "🖼️", grouppost:  "🏘️", login:   "✨",
    register:  "🎉", knuddel:    "🥚", milestone:"🎯",
  };
  const icon = TYPE_ICON[ev.type] || "✨";
  const actorName = ev.actor?.displayName || ev.actor?.username || "Jemand";
  const username = ev.actor?.username;

  let text = "";
  if (ev.type === "status")     text = ev.detail ? `„${ev.detail}"` : "neuer Status";
  else if (ev.type === "pinnwand") text = ev.detail ? `„${ev.detail}"` : "Pinnwand-Eintrag";
  else if (ev.type === "gift")     text = `🎁 Geschenk verschickt`;
  else if (ev.type === "newpic")   text = "neues Profilbild";
  else if (ev.type === "register") text = "neu bei VibeVibo — sag Hallo!";
  else if (ev.type === "knuddel")  text = "geknuddelt 🫶";
  else text = ev.type;

  const when = relTime(ev.at);

  return (
    <Link href={username ? `/u/${username}` : "/buschfunk"} style={{
      display: "flex", alignItems: "flex-start", gap: 8,
      padding: "8px 10px", borderRadius: 10,
      background: "#fff",
      border: "1px solid rgba(251,146,60,0.15)",
      textDecoration: "none", color: "inherit",
    }}>
      <div style={{
        flexShrink: 0, fontSize: 18, lineHeight: 1,
        width: 28, height: 28, borderRadius: 999,
        background: "linear-gradient(135deg, #fde68a, #fb923c)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "#1f2937", lineHeight: 1.3 }}>
          {actorName}
          <span style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", marginLeft: 6 }}>· {when}</span>
        </div>
        <div style={{
          fontSize: 12, color: "#475569", marginTop: 1,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>{text}</div>
      </div>
    </Link>
  );
}

function relTime(ts) {
  const d = Math.floor((Date.now() - ts) / 1000);
  if (d < 60) return "jetzt";
  if (d < 3600) return `vor ${Math.floor(d / 60)}m`;
  if (d < 86400) return `vor ${Math.floor(d / 3600)}h`;
  return `vor ${Math.floor(d / 86400)}d`;
}

function ActivityRow({ n, myUsername }) {
  const typeLabel = {
    gruscheln: "🫶 hat dich gegruschelt",
    visit:     "👀 war auf deinem Profil",
    pinnwand:  "📌 hat auf deine Pinnwand geschrieben",
    gift:      "🎁 hat dir ein Geschenk geschickt",
    like:      "❤️ hat dich geliked",
    comment:   "💬 hat kommentiert",
    friend_request: "👯 will dein Freund werden",
    follow:    "✨ folgt dir jetzt",
  }[n.type] || `${n.type}`;

  const when = new Date(n.at).toLocaleString("de-DE", {
    weekday: "short", hour: "2-digit", minute: "2-digit",
  });

  const href = n.actorUsername ? `/u/${n.actorUsername}` : "/notifications";

  return (
    <Link href={href} style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "6px 8px", borderRadius: 8,
      background: n.read ? "transparent" : "rgba(236,72,153,0.06)",
      textDecoration: "none", color: "inherit",
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: "#1f2937", lineHeight: 1.3 }}>
          {n.actorUsername ? `@${n.actorUsername}` : "Jemand"} {typeLabel}
        </div>
        <div style={{ fontSize: 10.5, color: "#94a3b8", marginTop: 1 }}>{when}</div>
      </div>
      {!n.read && <div style={{ width: 6, height: 6, borderRadius: 999, background: "#ec4899" }} />}
    </Link>
  );
}
