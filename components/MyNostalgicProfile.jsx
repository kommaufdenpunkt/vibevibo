"use client";

// 💖 MyNostalgicProfile — komplett neu durchdesignte eigene Profil-Seite,
// 2007er-Stil "richtig heftig": Marquee, WordArt, Glitzer, Top-5-Friends,
// Steckbrief im Forum-Look, Pinnwand und Gästebuch zentral, alles in Pink/Lila.
// Ersetzt ProfileView NUR fuers eigene Profil (/profile) — fremde Profile
// (/u/[username]) behalten das ProfileView.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import { ColoredName } from "@/components/GenderAge";
import Pinnwand from "@/components/Pinnwand";
import GiftShelf from "@/components/GiftShelf";
import TopFriends from "@/components/TopFriends";
import Gaestebuch from "@/components/Gaestebuch";
import MusicPlayer from "@/components/MusicPlayer";
import ProfileSkin from "@/components/ProfileSkin";
import ComplimentInbox from "@/components/ComplimentInbox";
import InlineGreetingEditor from "@/components/InlineGreetingEditor";
import OnlineSince from "@/components/OnlineSince";
import PremiumBadges from "@/components/PremiumBadges";
import Marquee from "@/components/Marquee";
import { useMe } from "@/lib/useMe";
import { api } from "@/lib/api";
import { relTime } from "@/lib/format";

export default function MyNostalgicProfile({ profile, pinnwand, guestbook, gifts, visitCount, visitors, onChange }) {
  const { me, refresh } = useMe();
  const [wallTab, setWallTab] = useState("pinnwand");
  const num = String(profile.id).padStart(5, "0");
  const createdAt = profile.createdAt ? new Date(profile.createdAt) : null;
  const daysOnBoard = createdAt ? Math.max(1, Math.floor((Date.now() - createdAt.getTime()) / 86400000)) : 0;

  return (
    <ProfileSkin css={profile.customCss}>
      <div className="vv-nost-page" data-gender={profile.gender || ""}>

        {/* ⭐ Glitzer-Marquee oben — User-eigener Text falls gesetzt */}
        <div className="vv-nost-marquee">
          <Marquee speed={48}>
            {profile.marqueeText && profile.marqueeText.trim()
              ? profile.marqueeText
              : `★ ✿ ♡  Willkommen auf MEINEM Profil!  ♡ ✿ ★    ♬ ♪  ★  ♥ ✩ ☆ ✩ ♥  ★    ${profile.displayName} ist die Beste!  ★    ♬ ♪  ★  ♥`}
          </Marquee>
        </div>

        {/* 🌸 HERO — WordArt-Header mit Avatar, Glitter-Rahmen, Mood */}
        <div className="vv-nost-hero">
          <div className="vv-nost-hero-glitter" />
          <div className="vv-nost-hero-stars">
            <span>✩</span><span>★</span><span>✿</span><span>♡</span>
            <span>♥</span><span>✿</span><span>★</span><span>✩</span>
          </div>

          <div className="vv-nost-avatar-frame">
            <Avatar url={profile.avatarUrl} name={profile.displayName}
              className="vv-nost-avatar" />
          </div>

          <h1 className="vv-nost-wordart">
            <ColoredName gender={profile.gender} age={profile.age} name={profile.displayName} nameColor={profile.nameColor} size="32px" />
          </h1>
          <div className="vv-nost-username">@{profile.username}</div>

          {profile.mood && (
            <div className="vv-nost-mood">
              <span>💭</span>
              <span>{profile.mood}</span>
            </div>
          )}

          <div className="vv-nost-badges">
            <PremiumBadges premiumBadges={profile.premiumBadges} />
          </div>

          {/* 🏅 Rang-Badge mit Fortschrittsbalken */}
          {profile.rankInfo && (
            <Link href="/rang" className="vv-nost-rank" style={{ color: profile.rankInfo.rankColor }}>
              <span className="vv-nost-rank-emoji">{profile.rankInfo.rankEmoji}</span>
              <span className="vv-nost-rank-text">Rang {profile.rankInfo.rank}</span>
              <span style={{ opacity: 0.7, fontSize: 11 }}>· {profile.rankInfo.rankName}</span>
              {profile.rankInfo.rank < 200 && (
                <>
                  <div className="vv-nost-rank-bar">
                    <div className="vv-nost-rank-bar-fill" style={{ width: `${Math.round(profile.rankInfo.progress * 100)}%` }} />
                  </div>
                  <span className="vv-nost-rank-pct">{Math.round(profile.rankInfo.progress * 100)}%</span>
                </>
              )}
            </Link>
          )}

          {/* Mitglieder-Zertifikat */}
          <div className="vv-nost-cert">
            <div className="vv-nost-cert-title">★ OFFIZIELLES VIBE★VIBO MITGLIED ★</div>
            <div className="vv-nost-cert-row">
              <span><b>Nr.</b> #{num}</span>
              {createdAt && <span><b>Seit</b> {createdAt.toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}</span>}
              <span><b>Tage on board</b> {daysOnBoard}</span>
            </div>
            <OnlineSince since={profile.onlineSince} compact />
          </div>
        </div>

        {/* 🎯 Aktions-Bar — schnell zu Profil bearbeiten, Skin, Fotos, Status */}
        <div className="vv-nost-actions">
          <Link href="/profile/edit" className="vv-nost-action">✎<span>Profil bearbeiten</span></Link>
          <Link href="/profile/status" className="vv-nost-action">💭<span>Status</span></Link>
          <Link href="/profile/skin" className="vv-nost-action">🎨<span>Skin & CSS</span></Link>
          <Link href="/fotos" className="vv-nost-action">📸<span>Meine Fotos</span></Link>
          <Link href="/shop" className="vv-nost-action">🛍<span>Shop</span></Link>
          <Link href="/profile/transactions" className="vv-nost-action">💰<span>Transaktionen</span></Link>
        </div>

        {/* 🌸 Begrüßungs-HTML — Jappy-Style mit Inline-Editor */}
        <div className="vv-nost-card vv-nost-card-violet vv-jappy-greet">
          <div className="vv-nost-card-title vv-jappy-greet-title">
            <span className="vv-jappy-star">✿</span>
            <span>🌸 HERZLICH WILLKOMMEN AUF MEINER SEITE! 🌸</span>
            <span className="vv-jappy-star">✿</span>
          </div>
          <div className="vv-nost-card-body vv-jappy-greet-body">
            <InlineGreetingEditor initialHtml={profile.greetingHtml || ""} />
          </div>
        </div>

        {/* 📚 3-Spalten Forum-Layout */}
        <div className="vv-nost-grid">
          {/* LINKS: Steckbrief + Über mich + Musik */}
          <aside className="vv-nost-col-left">
            <Card title="✿ ÜBER MICH ✿" tone="violet">
              {/* Quick-Facts: Stadt, Schule, Beziehung als Mini-Chips */}
              {(profile.city || profile.school || profile.relationshipStatus) && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
                  {profile.city && (
                    <span className="vv-nost-chip">📍 {profile.city}</span>
                  )}
                  {profile.school && (
                    <Link href={`/schulen/${encodeURIComponent(profile.school)}`}
                      style={{ textDecoration: "none" }}>
                      <span className="vv-nost-chip">🏫 {profile.school}</span>
                    </Link>
                  )}
                  {profile.relationshipStatus && (
                    <span className="vv-nost-chip"><RelationshipDisplay profile={profile} /></span>
                  )}
                </div>
              )}

              <div style={{ whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.5 }}>
                {profile.aboutMe || <em style={{ opacity: 0.6 }}>Noch nichts geschrieben — geh in „Profil bearbeiten" und füll deinen Steckbrief aus!</em>}
              </div>
              {(profile.interests || []).length > 0 && (
                <>
                  <div style={{ marginTop: 12, marginBottom: 5, fontSize: 11, fontWeight: 800, color: "#7e22ce", letterSpacing: 1 }}>💜 INTERESSEN</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {profile.interests.map((it, i) => (
                      <span key={i} className="vv-nost-chip">{it}</span>
                    ))}
                  </div>
                </>
              )}
            </Card>

            {(profile.bgMusic || profile.bgMusicUrl) && (
              <Card title="♬ MEINE PROFILMUSIK ♬" tone="cyan">
                <MusicPlayer track={profile.bgMusic} url={profile.bgMusicUrl} owner={profile.username} />
              </Card>
            )}

            <Card title="🎁 MEINE GESCHENKE-VITRINE 🎁" tone="violet">
              <GiftShelf profile={profile} gifts={gifts} onChange={onChange} />
            </Card>
          </aside>

          {/* MITTE: Pinnwand + Gästebuch */}
          <main className="vv-nost-col-center">
            <Card title="✎ MEINE PINNWAND & GÄSTEBUCH ✎" tone="pink" big>
              <div className="vv-nost-tabs">
                <button type="button"
                  className={`vv-nost-tab${wallTab === "pinnwand" ? " active" : ""}`}
                  onClick={() => setWallTab("pinnwand")}>📌 Pinnwand</button>
                <button type="button"
                  className={`vv-nost-tab${wallTab === "guestbook" ? " active" : ""}`}
                  onClick={() => setWallTab("guestbook")}>📖 Gästebuch</button>
              </div>
              {wallTab === "pinnwand" && (
                <Pinnwand profile={profile} entries={pinnwand} onChange={onChange} />
              )}
              {wallTab === "guestbook" && (
                <Gaestebuch profile={profile} initialEntries={guestbook} />
              )}
            </Card>
          </main>

          {/* RECHTS: Top 5 Freunde + Besucher */}
          <aside className="vv-nost-col-right">
            <Card title="★ TOP 5 FREUNDE ★" tone="cyan">
              <TopFriends username={profile.username} isOwner={true} />
            </Card>

            <Card title="👀 WER WAR HIER?" tone="pink">
              <div style={{ fontSize: 12, marginBottom: 8, opacity: 0.8 }}>
                Dein Profil wurde <b style={{ color: "#ec4899", fontSize: 16 }}>{visitCount}×</b> besucht!
              </div>
              {visitors.length === 0 ? (
                <div style={{ fontSize: 12, opacity: 0.6 }}>Noch keine Besucher.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {visitors.map((v) => (
                    <Link key={`${v.id}-${v.at}`} href={`/u/${v.username}`}
                      style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "5px 7px", borderRadius: 8,
                        background: "rgba(255,255,255,0.6)",
                        textDecoration: "none", color: "#831843",
                      }}>
                      <Avatar url={v.avatarUrl} name={v.displayName} className="vv-avatar vv-avatar-sm" style={{ flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.displayName}</span>
                      <span style={{ fontSize: 10, opacity: 0.65, flexShrink: 0 }}>{relTime(v.at)}</span>
                    </Link>
                  ))}
                </div>
              )}
            </Card>

            <Card title="💖 KOMPLIMENTE FÜR DICH 💖" tone="violet" tiny>
              <ComplimentInbox />
            </Card>

          </aside>
        </div>

        {/* Klassischer 2000er-Footer */}
        <div className="vv-nost-footer">
          <span>★</span>
          <span>VibeVibo Profil v2.7 · Mitglied #{num} · {visitCount} Besuche · {daysOnBoard} Tage on board</span>
          <span>★</span>
        </div>
      </div>
    </ProfileSkin>
  );
}

function Card({ title, children, tone = "pink", big = false, tiny = false }) {
  return (
    <div className={`vv-nost-card vv-nost-card-${tone}${big ? " vv-nost-card-big" : ""}${tiny ? " vv-nost-card-tiny" : ""}`}>
      <div className="vv-nost-card-title">{title}</div>
      <div className="vv-nost-card-body">{children}</div>
    </div>
  );
}

function SteckbriefRow({ label, value }) {
  return (
    <div className="vv-nost-steckbrief-row">
      <span className="vv-nost-steckbrief-label">{label}:</span>
      <span className="vv-nost-steckbrief-value">{value}</span>
    </div>
  );
}

const REL_LABELS = {
  single:      "💚 Single",
  taken:       "💕 vergeben",
  engaged:     "💍 verlobt",
  married:     "💒 verheiratet",
  complicated: "🤯 es ist kompliziert",
  open:        "🌈 offene Beziehung",
};

function RelationshipDisplay({ profile }) {
  const [partner, setPartner] = useState(null);
  const [mutual, setMutual] = useState(false);
  useEffect(() => {
    if (!profile.partnerUserId) return;
    api.getRelationship().then((r) => {
      setPartner(r.partner || null);
      setMutual(!!r.mutual);
    }).catch(() => {});
  }, [profile.partnerUserId]);
  const label = REL_LABELS[profile.relationshipStatus] || profile.relationshipStatus;
  if (!partner) return <span>{label}</span>;
  return (
    <span>
      {label}
      {" · "}
      <Link href={`/u/${partner.username}`} style={{ color: "#831843", fontWeight: 800 }}>
        @{partner.username}
      </Link>
      {mutual ? " 💞" : " 🥺"}
    </span>
  );
}
