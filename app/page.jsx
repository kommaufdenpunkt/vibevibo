"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Marquee from "@/components/Marquee";
import Landing from "@/components/Landing";
import Buschfunk from "@/components/Buschfunk";
import { api } from "@/lib/api";
import { useMe } from "@/lib/useMe";

export default function HomePage() {
  const { me, loading } = useMe();
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (!me) return;
    const load = () => api.listUsers().then((d) => setUsers(d.users)).catch(() => {});
    load();
    const t = setInterval(load, 20000); // Online-Status live
    return () => clearInterval(t);
  }, [me]);

  if (loading) return null;

  // Nicht eingeloggt: Landing Page mit Wow-Effekt
  if (!me) return <Landing />;

  // Eingeloggt: Klassische Feed-Startseite
  const onlineUsers = users.filter((u) => u.online);

  return (
    <>
      <Marquee speed={60}>
        🎉 Willkommen zurück, {me.displayName}! ✿ Aktuell {onlineUsers.length} User online ✿ Pinnwand wie früher! ✿ Geschenke verschicken ✿ Profile mit Background-Musik ✿ Foto-Alben & Gruppen ✿ Echtzeit-Messenger ✿
      </Marquee>

      <div className="vv-grid-2">
        <div>
          <div className="vv-card">
            <h2>🌟 Hey {me.displayName}!</h2>
            <p>
              Schön dass du da bist. Schau wer online ist, schreib auf die Pinnwand
              deiner Freunde, oder geh in eine Gruppe.
            </p>
            <div className="vv-row vv-mt-12" style={{ flexWrap: "wrap" }}>
              <Link href="/profile" className="vv-btn vv-btn-pink">👤 Mein Profil</Link>
              <Link href="/profile/skin" className="vv-btn vv-btn-cyan">🎨 Skin gestalten</Link>
              <Link href="/messenger" className="vv-btn">✉️ Nachrichten</Link>
            </div>
          </div>

          <Buschfunk />

          <div className="vv-card">
            <h2>👥 Mitglieder</h2>
            <div className="vv-friends-grid">
              {users.slice(0, 12).map((u) => (
                <Link key={u.username} className="vv-friend-tile" href={`/u/${u.username}`}>
                  <div className="vv-avatar vv-avatar-md">{u.emoji}</div>
                  <span className="vv-friend-name">
                    {u.online && <span className="vv-online-dot" />}
                    {u.displayName}
                  </span>
                  <span className="vv-muted">{u.mood}</span>
                </Link>
              ))}
            </div>
            <div className="vv-row vv-mt-12">
              <div className="vv-spacer" />
              <Link href="/freunde" className="vv-btn">→ Alle Mitglieder</Link>
            </div>
          </div>
        </div>

        <div>
          <div className="vv-card">
            <h3>🟢 Online jetzt</h3>
            {onlineUsers.length === 0 ? (
              <div className="vv-muted">Niemand online :(</div>
            ) : (
              <div className="vv-friends-grid">
                {onlineUsers.slice(0, 8).map((u) => (
                  <Link key={u.username} className="vv-friend-tile" href={`/u/${u.username}`}>
                    <div className="vv-avatar vv-avatar-md">{u.emoji}</div>
                    <span className="vv-friend-name">
                      <span className="vv-online-dot" />
                      {u.displayName}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="vv-card">
            <h3>💡 Schnelleinstieg</h3>
            <ul style={{ paddingLeft: 18, lineHeight: 1.7 }}>
              <li>📝 <Link href="/profile/edit">Profil bearbeiten</Link></li>
              <li>🎨 <Link href="/profile/skin">CSS-Skin gestalten</Link></li>
              <li>📸 <Link href="/fotos">Fotos hochladen</Link></li>
              <li>🏘️ <Link href="/gruppen">Gruppen entdecken</Link></li>
              <li>🎁 <Link href="/geschenke">Geschenke verschicken</Link></li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
