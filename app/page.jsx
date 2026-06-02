"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Marquee from "@/components/Marquee";
import Landing from "@/components/Landing";
import Buschfunk from "@/components/Buschfunk";
import WallComposer from "@/components/WallComposer";
import { FortuneCookie, TodaysBirthdays } from "@/components/HomeNostalgia";
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
    const t = setInterval(load, 20000); // Online-Status live
    return () => clearInterval(t);
  }, [me]);

  // Admin-konfigurierbarer Marquee-Text (überschreibt Default wenn gesetzt)
  useEffect(() => {
    fetch("/api/maintenance", { cache: "no-store" })
      .then((r) => r.json()).then((d) => setCustomMarquee(d?.marquee || ""))
      .catch(() => {});
  }, []);

  if (loading) return null;

  // Nicht eingeloggt: Landing Page mit Wow-Effekt
  if (!me) return <Landing />;

  // Eingeloggt: Klassische Feed-Startseite
  const onlineUsers = users.filter((u) => isOnlineActivity(u.lastSeen));

  return (
    <>
      <Marquee speed={60}>
        {customMarquee
          ? customMarquee
          : `🎉 Willkommen zurück, ${me.displayName}! ✿ Aktuell ${onlineUsers.length} User online ✿ Pinnwand wie früher! ✿ Geschenke verschicken ✿ Profile mit Background-Musik ✿ Foto-Alben & Gruppen ✿ Echtzeit-Messenger ✿`}
      </Marquee>

      <div className="vv-grid-3">
        {/* ===== LINKS: Quick-Access ===== */}
        <aside className="vv-col-left">
          <div className="vv-card">
            <h3 style={{ marginTop: 0 }}>💡 Schnellzugriff</h3>
            <ul style={{ paddingLeft: 18, lineHeight: 1.8, margin: 0 }}>
              <li>👤 <Link href="/profile">Mein Profil</Link></li>
              <li>✉️ <Link href="/messenger">Nachrichten</Link></li>
              <li>👯 <Link href="/freunde">Wer ist online?</Link></li>
              <li>🗺️ <Link href="/karte"><strong>Realitätskarte</strong></Link></li>
              <li>📸 <Link href="/fotos">Fotos</Link></li>
              <li>🏘️ <Link href="/gruppen">Gruppen</Link></li>
              <li>🎁 <Link href="/geschenke">Geschenke</Link></li>
              <li>🎨 <Link href="/profile/skin">CSS-Skin</Link></li>
            </ul>
          </div>

          <div className="vv-card">
            <h3 style={{ marginTop: 0 }}>👥 Mitglieder</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {users.slice(0, 8).map((u) => (
                <Link key={u.username} href={`/u/${u.username}`} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 8, background: "rgba(255,255,255,0.04)", textDecoration: "none" }}>
                  <Avatar url={u.avatarUrl} name={u.displayName} className="vv-avatar vv-avatar-sm" style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <OnlineName lastSeen={u.lastSeen}>
                        <ColoredName gender={u.gender} age={u.age} name={u.displayName} fallbackColor="#e8e8f0" />
                      </OnlineName>
                      <PremiumBadges badges={u.premiumBadges} size={12} gap={2} />
                      <ActivityBars lastSeen={u.lastSeen} size="sm" />
                    </span>
                  </span>
                </Link>
              ))}
            </div>
            <div className="vv-row vv-mt-12">
              <div className="vv-spacer" />
              <Link href="/freunde" className="vv-btn">→ Alle</Link>
            </div>
          </div>
        </aside>

        {/* ===== MITTE: Hauptfeed ===== */}
        <main className="vv-col-main">
          <div className="vv-card">
            <h2 style={{ marginTop: 0 }}>💌 Willkommen zurück, {me.displayName}!</h2>
            <p style={{ lineHeight: 1.6 }}>
              Erinnerst du dich noch? <strong>Pinnwand-Einträge</strong> mit Glitzer-Smileys,
              ein <strong>*gruscheln*</strong> ohne Algorithmus, das eigene Profil mit
              <strong> Lieblingssong</strong> dahinter — und das <strong>ICQ-Oh-Oh</strong>,
              wenn dir jemand schreibt. Genau das machen wir hier wieder.
            </p>
            <div className="vv-muted" style={{ fontSize: 12, fontStyle: "italic" }}>
              ✿ Memories zählen. Diese eine Nachricht. Diese eine Rose. Diese eine Top-8-Platzierung. ✿
            </div>
          </div>

          <div className="vv-card">
            <h3 style={{ marginTop: 0 }}>📝 Was machst du gerade?</h3>
            <div className="vv-muted" style={{ fontSize: 12, marginBottom: 6 }}>Erscheint auf deiner eigenen Wall und im Buschfunk</div>
            <WallComposer targetUsername={me.username} onPosted={() => setFeedTick((t) => t + 1)} placeholder="Erzähl was – mit @user markierst du Freunde" />
          </div>

          <FortuneCookie />
          <TodaysBirthdays />
          <Buschfunk key={feedTick} />
        </main>

        {/* ===== RECHTS: Online + Tipps ===== */}
        <aside className="vv-col-right">
          <div className="vv-card">
            <h3 style={{ marginTop: 0 }}>🟢 Online jetzt ({onlineUsers.length})</h3>
            {onlineUsers.length === 0 ? (
              <div className="vv-muted">Niemand online :(</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {onlineUsers.slice(0, 15).map((u) => (
                  <Link key={u.username} href={`/u/${u.username}`} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 8, background: "rgba(255,255,255,0.04)", textDecoration: "none" }}>
                    <Avatar url={u.avatarUrl} name={u.displayName} className="vv-avatar vv-avatar-sm" style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        <OnlineName lastSeen={u.lastSeen}>
                          <ColoredName gender={u.gender} age={u.age} name={u.displayName} fallbackColor="#e8e8f0" />
                        </OnlineName>
                        <ActivityBars lastSeen={u.lastSeen} size="sm" />
                      </span>
                      {u.mood && <span style={{ display: "block", marginTop: 4, fontSize: 11, color: "#a9b0c0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.mood}</span>}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="vv-card">
            <h3 style={{ marginTop: 0 }}>✨ Vibes verdienen</h3>
            <ul style={{ paddingLeft: 18, lineHeight: 1.7, margin: 0, fontSize: 13 }}>
              <li>🎁 Tages-Bonus abholen</li>
              <li>📝 Pinnwand-Eintrag schreiben</li>
              <li>🫶 Jemanden gruscheln</li>
              <li>📷 Foto hochladen</li>
              <li>🎯 Quests erledigen</li>
              <li>🗺️ Items auf der Karte einsammeln</li>
            </ul>
            <Link href="/profile/transactions" className="vv-btn vv-btn-pink" style={{ marginTop: 10, display: "block", textAlign: "center" }}>
              ✨ Meine Vibes
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}
