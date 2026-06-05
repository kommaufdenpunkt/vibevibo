"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Marquee from "@/components/Marquee";
import Landing from "@/components/Landing";
import Buschfunk from "@/components/Buschfunk";
import WallComposer from "@/components/WallComposer";
import { FortuneCookie, TodaysBirthdays, MemberSince } from "@/components/HomeNostalgia";
import PwaInfo from "@/components/PwaInfo";
import InstallNow from "@/components/InstallNow";
import RewardedAdButton from "@/components/RewardedAdButton";
import AdSlot from "@/components/AdSlot";
import { api } from "@/lib/api";
import { useMe } from "@/lib/useMe";
import { ColoredName } from "@/components/GenderAge";
import Avatar from "@/components/Avatar";
import ActivityBars from "@/components/ActivityBars";
import OnlineName from "@/components/OnlineName";
import PremiumBadges from "@/components/PremiumBadges";
import { isOnlineActivity } from "@/lib/activity";

export default function HomePage() {
  const { me, loading } = useMe();
  const [users, setUsers] = useState([]);
  const [feedTick, setFeedTick] = useState(0);
  const [customMarquee, setCustomMarquee] = useState("");

  useEffect(() => {
    if (!me) return;
    const load = () => api.listUsers().then((d) => setUsers(d.users)).catch(() => {});
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [me]);

  useEffect(() => {
    fetch("/api/maintenance", { cache: "no-store" })
      .then((r) => r.json()).then((d) => setCustomMarquee(d?.marquee || ""))
      .catch(() => {});
  }, []);

  if (loading) return null;

  // Nicht eingeloggt: Landing Page bleibt wie sie ist
  if (!me) return <Landing />;

  // Eingeloggt: nostalgische 2007er-Startseite
  const onlineUsers = users.filter((u) => isOnlineActivity(u.lastSeen));
  const newest = [...users].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 6);

  return (
    <div className="vv-home-page">
      <Marquee speed={60}>
        {customMarquee
          ? customMarquee
          : `🎉 Willkommen zurück, ${me.displayName}! ✿ ${onlineUsers.length} User online ✿ Pinnwand wie früher! ✿ Geschenke verschicken ✿ Profile mit Background-Musik ✿ Foto-Alben & Gruppen ✿ Echtzeit-Messenger ✿`}
      </Marquee>

      {/* ★ HERO ★ */}
      <div className="vv-home-hero">
        <div className="vv-home-hero-stars">
          <span>✿</span><span>★</span><span>✩</span><span>♡</span>
          <span>♥</span><span>★</span><span>✿</span><span>✩</span>
        </div>
        <div className="vv-home-hero-avatar">
          {me.avatarUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={me.avatarUrl} alt="" />
            : <span>👤</span>}
        </div>
        <h1 className="vv-home-hero-title">★ Hi {me.displayName}! ★</h1>
        <div className="vv-home-hero-sub">@{me.username} · Erinnerst du dich noch an Glitzer-Smileys & ICQ-Oh-Oh?</div>
        <div className="vv-home-hero-stats">
          <span className="vv-home-hero-stat">🟢 {onlineUsers.length} online</span>
          <span className="vv-home-hero-stat">👥 {users.length} Mitglieder</span>
          {me.mood && <span className="vv-home-hero-stat">💭 {me.mood}</span>}
        </div>
      </div>

      {/* 🚀 Quick-Tiles */}
      <div className="vv-home-tiles">
        <Link href="/profile" className="vv-home-tile" data-tone="pink">
          <span className="vv-home-tile-emoji">👤</span>
          <span>Profil</span>
          <span className="vv-home-tile-sub">Pinnwand & mehr</span>
        </Link>
        <Link href="/messenger" className="vv-home-tile" data-tone="violet">
          <span className="vv-home-tile-emoji">✉️</span>
          <span>Messenger</span>
          <span className="vv-home-tile-sub">Chatten</span>
        </Link>
        <Link href="/freunde" className="vv-home-tile" data-tone="cyan">
          <span className="vv-home-tile-emoji">👯</span>
          <span>Freunde</span>
          <span className="vv-home-tile-sub">{onlineUsers.length} online</span>
        </Link>
        <Link href="/karte" className="vv-home-tile" data-tone="green">
          <span className="vv-home-tile-emoji">🗺️</span>
          <span>Karte</span>
          <span className="vv-home-tile-sub">Realität</span>
        </Link>
        <Link href="/fotos" className="vv-home-tile" data-tone="gold">
          <span className="vv-home-tile-emoji">📸</span>
          <span>Fotos</span>
          <span className="vv-home-tile-sub">Galerie</span>
        </Link>
        <Link href="/gruppen" className="vv-home-tile" data-tone="violet">
          <span className="vv-home-tile-emoji">🏘️</span>
          <span>Gruppen</span>
          <span className="vv-home-tile-sub">Forum</span>
        </Link>
        <Link href="/geschenke" className="vv-home-tile" data-tone="red">
          <span className="vv-home-tile-emoji">🎁</span>
          <span>Geschenke</span>
          <span className="vv-home-tile-sub">verschicken</span>
        </Link>
        <Link href="/profile/skin" className="vv-home-tile" data-tone="cyan">
          <span className="vv-home-tile-emoji">🎨</span>
          <span>Skin</span>
          <span className="vv-home-tile-sub">CSS-Design</span>
        </Link>
        <Link href="/shop" className="vv-home-tile" data-tone="pink">
          <span className="vv-home-tile-emoji">🛍</span>
          <span>Shop</span>
          <span className="vv-home-tile-sub">✨ Features</span>
        </Link>
        <Link href="/vibo" className="vv-home-tile" data-tone="gold">
          <span className="vv-home-tile-emoji">🥚</span>
          <span>VIBO</span>
          <span className="vv-home-tile-sub">Pet</span>
        </Link>
        <Link href="/schulen" className="vv-home-tile" data-tone="cyan">
          <span className="vv-home-tile-emoji">🏫</span>
          <span>Schulen</span>
          <span className="vv-home-tile-sub">Verzeichnis</span>
        </Link>
        <Link href="/profile/transactions" className="vv-home-tile" data-tone="green">
          <span className="vv-home-tile-emoji">💰</span>
          <span>Vibes</span>
          <span className="vv-home-tile-sub">Verlauf</span>
        </Link>
        <Link href="/rang" className="vv-home-tile" data-tone="gold">
          <span className="vv-home-tile-emoji">🏅</span>
          <span>Rang</span>
          <span className="vv-home-tile-sub">XP & Levels</span>
        </Link>
      </div>

      {/* 3-Spalten-Layout */}
      <div className="vv-home-grid">
        {/* LINKS: Mitglieder + Neuzugänge */}
        <div className="vv-home-col">
          <div className="vv-home-card" data-tone="cyan">
            <div className="vv-home-card-title">👥 MITGLIEDER</div>
            <div className="vv-home-card-body">
              {users.slice(0, 8).map((u) => (
                <Link key={u.username} href={`/u/${u.username}`} className="vv-home-member-row">
                  <Avatar url={u.avatarUrl} name={u.displayName} className="vv-avatar vv-avatar-sm" style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <OnlineName lastSeen={u.lastSeen}>
                        <ColoredName gender={u.gender} age={u.age} name={u.displayName} />
                      </OnlineName>
                      <PremiumBadges badges={u.premiumBadges} size={11} gap={1} />
                      <ActivityBars lastSeen={u.lastSeen} size="sm" />
                    </span>
                  </span>
                </Link>
              ))}
              <div style={{ textAlign: "center", marginTop: 8 }}>
                <Link href="/freunde" style={{
                  display: "inline-block", padding: "6px 12px", borderRadius: 999,
                  background: "linear-gradient(135deg, #06b6d4, #0891b2)",
                  color: "#fff", textDecoration: "none", fontSize: 11, fontWeight: 800,
                }}>→ Alle ansehen</Link>
              </div>
            </div>
          </div>

          {newest.length > 0 && (
            <div className="vv-home-card" data-tone="gold">
              <div className="vv-home-card-title">🌟 NEU DABEI</div>
              <div className="vv-home-card-body">
                {newest.map((u) => (
                  <Link key={u.username} href={`/u/${u.username}`} className="vv-home-member-row">
                    <Avatar url={u.avatarUrl} name={u.displayName} className="vv-avatar vv-avatar-sm" style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <ColoredName gender={u.gender} age={u.age} name={u.displayName} />
                      {u.createdAt && (
                        <span className="vv-home-member-mood">
                          seit {new Date(u.createdAt).toLocaleDateString("de-DE", { day: "2-digit", month: "short" })}
                        </span>
                      )}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* LINKS extra: Mitglieder-Zertifikat + Glückskeks */}
          <MemberSince />
          <FortuneCookie />
        </div>

        {/* MITTE: Was machst du gerade? → direkt Buschfunk */}
        <div className="vv-home-col">
          <div className="vv-home-card" data-tone="pink">
            <div className="vv-home-card-title">📝 WAS MACHST DU GERADE?</div>
            <div className="vv-home-card-body">
              <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 8 }}>
                Erscheint auf deiner eigenen Wall und im Buschfunk
              </div>
              <WallComposer targetUsername={me.username} onPosted={() => setFeedTick((t) => t + 1)} placeholder="Erzähl was — mit @user markierst du Freunde 💖" />
            </div>
          </div>

          <div className="vv-home-card" data-tone="violet">
            <div className="vv-home-card-title">📣 BUSCHFUNK</div>
            <div className="vv-home-card-body">
              <Buschfunk key={feedTick} />
            </div>
          </div>
        </div>

        {/* RECHTS: Online + Tipps + Geburtstage + Werbung + Install */}
        <div className="vv-home-col">
          <div className="vv-home-card" data-tone="pink">
            <div className="vv-home-card-title">🟢 ONLINE JETZT ({onlineUsers.length})</div>
            <div className="vv-home-card-body">
              {onlineUsers.length === 0 ? (
                <div style={{ fontSize: 12, opacity: 0.6, textAlign: "center", padding: 6 }}>Niemand online :(</div>
              ) : (
                onlineUsers.slice(0, 15).map((u) => (
                  <Link key={u.username} href={`/u/${u.username}`} className="vv-home-member-row">
                    <Avatar url={u.avatarUrl} name={u.displayName} className="vv-avatar vv-avatar-sm" style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        <OnlineName lastSeen={u.lastSeen}>
                          <ColoredName gender={u.gender} age={u.age} name={u.displayName} />
                        </OnlineName>
                        <ActivityBars lastSeen={u.lastSeen} size="sm" />
                      </span>
                      {u.mood && <span className="vv-home-member-mood">{u.mood}</span>}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </div>

          <div className="vv-home-card" data-tone="gold">
            <div className="vv-home-card-title">✨ VIBES VERDIENEN</div>
            <div className="vv-home-card-body">
              <ul className="vv-home-tips">
                <li>🎁 Tages-Bonus abholen</li>
                <li>📝 Pinnwand-Eintrag schreiben</li>
                <li>🫶 Jemanden gruscheln</li>
                <li>📷 Foto hochladen</li>
                <li>🎯 Quests erledigen</li>
                <li>🗺️ Items auf der Karte einsammeln</li>
              </ul>
              <Link href="/profile/transactions" style={{
                display: "block", marginTop: 10, padding: "10px 12px",
                background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
                color: "#fff", textAlign: "center", textDecoration: "none",
                fontWeight: 800, fontSize: 13, borderRadius: 10,
                border: "2px solid #b45309",
                boxShadow: "0 3px 0 #b45309",
              }}>
                ✨ Meine Vibes
              </Link>
            </div>
          </div>

          {/* Geburtstage des Tages */}
          <TodaysBirthdays />

          {/* Rewarded-Ad als „Gratis-Vibes"-Card */}
          <RewardedAdButton slot="home" />

          {/* Display-Ad nur unten, kompakt */}
          <AdSlot slot="home-feed" format="auto" style={{ marginBottom: 0 }} />

          {/* Install-Hinweise (klein, am Ende der rechten Spalte) */}
          <InstallNow appName="VibeVibo" appEmoji="✨" appColor="#ff3e9d" />
          <PwaInfo id="pwa-community" appName="VibeVibo Community" appEmoji="🎨" appPurpose="die Community" />
        </div>
      </div>
    </div>
  );
}
