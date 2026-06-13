"use client";

// 💖 NostalgicProfileView — fremde Profile (/u/[username]) im 2007er-Stil.
// Spiegelt MyNostalgicProfile, aber mit:
//  - Marquee „Willkommen auf dem Profil von ..."
//  - Aktionen Gruscheln/Nachricht/Fotos/Kompliment statt Bearbeiten
//  - Kein Komplimente-Inbox (das ist eigener-Profil-only)
//  - „Besucher Nr. X bist DU"-Anzeige

import { useState } from "react";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import { ColoredName } from "@/components/GenderAge";
import Pinnwand from "@/components/Pinnwand";
import GiftShelf from "@/components/GiftShelf";
import TopFriends from "@/components/TopFriends";
import Gaestebuch from "@/components/Gaestebuch";
import MusicPlayer from "@/components/MusicPlayer";
import ProfileSkin from "@/components/ProfileSkin";
import OnlineSince from "@/components/OnlineSince";
import PremiumBadges from "@/components/PremiumBadges";
import ComplimentModal from "@/components/ComplimentModal";
import ViboProfileWidget from "@/components/ViboProfileWidget";
import Marquee from "@/components/Marquee";
import AmazonShelf from "@/components/AmazonShelf";
import { useMe } from "@/lib/useMe";
import { api } from "@/lib/api";
import { relTime } from "@/lib/format";

export default function NostalgicProfileView({ profile, pinnwand, guestbook = [], gifts, visitCount = 0, visitors = [], onChange }) {
  const { me } = useMe();
  const [wallTab, setWallTab] = useState("pinnwand");
  const [complimentOpen, setComplimentOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const isOwner = me?.username === profile.username;

  const num = String(profile.id).padStart(5, "0");
  const createdAt = profile.createdAt ? new Date(profile.createdAt) : null;
  const daysOnBoard = createdAt ? Math.max(1, Math.floor((Date.now() - createdAt.getTime()) / 86400000)) : 0;

  function showToast(msg, ms = 2500) {
    setToast(msg);
    setTimeout(() => setToast(null), ms);
  }

  async function gruscheln() {
    if (!me) return;
    try {
      await api.postPinnwand(profile.username, "*gruschelt* 🫶");
      showToast(`🫶 Du hast ${profile.displayName} gegruschelt!`);
      onChange?.();
    } catch (e) {
      showToast(`⚠ ${e.message}`, 4000);
    }
  }

  return (
    <ProfileSkin css={profile.customCss}>
      <div className="vv-nost-page" data-gender={profile.gender || ""}>

        {/* ⭐ Marquee oben — User-eigener Text falls gesetzt */}
        <div className="vv-nost-marquee">
          <Marquee speed={48}>
            {profile.marqueeText && profile.marqueeText.trim()
              ? profile.marqueeText
              : `★ ✿ ♡  Willkommen auf dem Profil von ${profile.displayName}!  ♡ ✿ ★    ♬ ♪  ★  ♥ ✩ ☆ ✩ ♥  ★    Sei lieb zu ${profile.displayName} 💖  ★    ♬ ♪  ★  ♥`}
          </Marquee>
        </div>

        {/* 🌸 HERO */}
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

          {/* 🏅 Rang-Badge (für fremdes Profil ohne Progress) */}
          {profile.rank != null && (
            <Link href="/rang" className="vv-nost-rank" style={{ color: profile.rankColor || "#a855f7" }}>
              <span className="vv-nost-rank-emoji">{profile.rankEmoji || "🏅"}</span>
              <span className="vv-nost-rank-text">Rang {profile.rank}</span>
              {profile.rankName && <span style={{ opacity: 0.7, fontSize: 11 }}>· {profile.rankName}</span>}
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

        {/* 🎯 Aktions-Bar — Gruscheln, Nachricht, Fotos, Kompliment */}
        {me && !isOwner && (
          <div className="vv-nost-actions">
            <button type="button" onClick={gruscheln}
              className="vv-nost-action" style={{ background: "none", fontFamily: "inherit", cursor: "pointer" }}>
              🫶<span>Gruscheln</span>
            </button>
            <Link href={`/messenger/${profile.username}`} className="vv-nost-action">
              ✉<span>Nachricht</span>
            </Link>
            <Link href={`/u/${profile.username}/fotos`} className="vv-nost-action">
              📸<span>Fotos</span>
            </Link>
            <button type="button" onClick={() => setComplimentOpen(true)}
              className="vv-nost-action" style={{ background: "none", fontFamily: "inherit", cursor: "pointer" }}>
              💖<span>Kompliment</span>
            </button>
            <Link href="/freunde" className="vv-nost-action">
              👯<span>Alle Freunde</span>
            </Link>
            <Link href="/" className="vv-nost-action">
              🏠<span>Startseite</span>
            </Link>
          </div>
        )}
        {!me && (
          <div className="vv-nost-actions">
            <Link href={`/login?next=/u/${profile.username}`} className="vv-nost-action">
              🔑<span>Einloggen zum Schreiben</span>
            </Link>
          </div>
        )}

        {/* VIBO-Widget */}
        <ViboProfileWidget username={profile.username} isOwner={isOwner} />

        {/* 🌸 Begrüßungs-HTML — Jappy-Style, über volle Breite */}
        {profile.greetingHtml && profile.greetingHtml.trim() && (
          <div className="vv-nost-card vv-nost-card-violet vv-jappy-greet">
            <div className="vv-nost-card-title vv-jappy-greet-title">
              <span className="vv-jappy-star">✿</span>
              <span>{(profile.greetingTitle && profile.greetingTitle.trim()) || `🌸 HERZLICH WILLKOMMEN BEI ${profile.displayName.toUpperCase()}! 🌸`}</span>
              <span className="vv-jappy-star">✿</span>
            </div>
            <div className="vv-nost-card-body vv-jappy-greet-body">
              <div className="vv-nost-greeting"
                dangerouslySetInnerHTML={{ __html: profile.greetingHtml }} />
            </div>
          </div>
        )}

        {/* 📚 3-Spalten Forum-Layout */}
        <div className="vv-nost-grid">
          {/* LINKS: Über mich + Musik + Geschenke */}
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
                    <span className="vv-nost-chip">{REL_LABELS[profile.relationshipStatus] || profile.relationshipStatus}</span>
                  )}
                </div>
              )}

              <div style={{ whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.5 }}>
                {profile.aboutMe || <em style={{ opacity: 0.6 }}>{profile.displayName} hat noch nichts geschrieben.</em>}
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
              <Card title="♬ PROFILMUSIK ♬" tone="cyan">
                <MusicPlayer track={profile.bgMusic} url={profile.bgMusicUrl} owner={profile.username} />
              </Card>
            )}

            <Card title="🎁 GESCHENKE-VITRINE 🎁" tone="violet">
              <GiftShelf profile={profile} gifts={gifts} onChange={onChange} />
            </Card>
          </aside>

          {/* MITTE: Pinnwand + Gästebuch */}
          <main className="vv-nost-col-center">
            <Card title={`✎ PINNWAND & GÄSTEBUCH VON ${profile.displayName.toUpperCase()} ✎`} tone="pink" big>
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
              <TopFriends username={profile.username} isOwner={false} />
            </Card>

            <Card title="👀 WER WAR HIER?" tone="pink">
              <div style={{ fontSize: 12, marginBottom: 8, opacity: 0.85, textAlign: "center" }}>
                {me && !isOwner ? (
                  <>Du bist Besucher Nr. <b style={{ color: "#ec4899", fontSize: 16 }}>{visitCount + 1}</b> 🎉</>
                ) : (
                  <>Dieses Profil wurde <b style={{ color: "#ec4899", fontSize: 16 }}>{visitCount}×</b> besucht!</>
                )}
              </div>
              {visitors.length === 0 ? (
                <div style={{ fontSize: 12, opacity: 0.6, textAlign: "center" }}>Noch keine Besucher.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {visitors.slice(0, 8).map((v) => (
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

            {me && !isOwner && (
              <Card title="💌 KONTAKT 💌" tone="violet" tiny>
                <Link href={`/messenger/${profile.username}`} style={{
                  display: "block", padding: "10px 12px", borderRadius: 10,
                  background: "linear-gradient(135deg,#fce7f3,#fbcfe8)",
                  color: "#831843", textDecoration: "none", fontSize: 13, fontWeight: 700,
                  border: "1px dashed #ec4899", textAlign: "center",
                }}>
                  ✉ Nachricht schreiben
                </Link>
                <button type="button" onClick={() => setComplimentOpen(true)} style={{
                  marginTop: 6, display: "block", width: "100%", padding: "10px 12px", borderRadius: 10,
                  background: "linear-gradient(135deg,#fef3c7,#fde68a)",
                  color: "#7c2d12", border: "1px dashed #f59e0b",
                  fontSize: 13, fontWeight: 700, textAlign: "center", cursor: "pointer",
                  fontFamily: "inherit",
                }}>
                  💖 Kompliment machen
                </button>
              </Card>
            )}
          </aside>
        </div>

        <AmazonShelf compact={true} max={6} title="💝 Passend zu diesem Vibe" />

        {/* Klassischer 2000er-Footer */}
        <div className="vv-nost-footer">
          <span>★</span>
          <span>{profile.displayName}'s VibeVibo · Mitglied #{num} · {visitCount} Besuche · {daysOnBoard} Tage on board</span>
          <span>★</span>
        </div>
      </div>

      {toast && <div className="vv-toast" style={{ zIndex: 200 }}>{toast}</div>}
      {complimentOpen && (
        <ComplimentModal
          toUsername={profile.username}
          toDisplayName={profile.displayName}
          onClose={() => setComplimentOpen(false)}
          onSent={() => { setComplimentOpen(false); showToast(`💖 Kompliment an ${profile.displayName} verschickt!`); }}
        />
      )}
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
