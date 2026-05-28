"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Marquee from "@/components/Marquee";
import Landing from "@/components/Landing";
import Buschfunk from "@/components/Buschfunk";
import WallComposer from "@/components/WallComposer";
import { api } from "@/lib/api";
import { useMe } from "@/lib/useMe";
import { ColoredName } from "@/components/GenderAge";
import Avatar from "@/components/Avatar";

export default function HomePage() {
  const { me, loading } = useMe();
  const [users, setUsers] = useState([]);
  const [feedTick, setFeedTick] = useState(0);

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
            <div className="vv-row vv-mt-12" style={{ flexWrap: "wrap" }}>
              <Link href="/profile" className="vv-btn vv-btn-pink">👤 Mein Profil</Link>
              <Link href="/freunde" className="vv-btn vv-btn-cyan">👯 Wer ist online?</Link>
              <Link href="/messenger" className="vv-btn">✉️ Nachrichten</Link>
              <Link href="/profile/skin" className="vv-btn">🎨 Skin gestalten</Link>
            </div>
          </div>

          <div className="vv-card">
            <h3 style={{ marginTop: 0 }}>📝 Was machst du gerade?</h3>
            <div className="vv-muted" style={{ fontSize: 12, marginBottom: 6 }}>Erscheint auf deiner eigenen Wall und im Buschfunk</div>
            <WallComposer targetUsername={me.username} onPosted={() => setFeedTick((t) => t + 1)} placeholder="Erzähl was – mit @user markierst du Freunde" />
          </div>

          <Buschfunk key={feedTick} />

          <div className="vv-card">
            <h2>👥 Mitglieder</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {users.slice(0, 12).map((u) => (
                <Link key={u.username} href={`/u/${u.username}`} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 9px", borderRadius: 8, background: "#23232f", textDecoration: "none" }}>
                  <Avatar url={u.avatarUrl} name={u.displayName} className="vv-avatar vv-avatar-sm" style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                    <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {u.online && <span className="vv-online-dot" />}
                      <ColoredName gender={u.gender} age={u.age} name={u.displayName} fallbackColor="#e8e8f0" />
                    </span>
                    {u.mood && <span style={{ display: "block", fontSize: 11, color: "#a9b0c0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.mood}</span>}
                  </span>
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
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {onlineUsers.slice(0, 15).map((u) => (
                  <Link key={u.username} href={`/u/${u.username}`} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 9px", borderRadius: 8, background: "#23232f", textDecoration: "none" }}>
                    <Avatar url={u.avatarUrl} name={u.displayName} className="vv-avatar vv-avatar-sm" style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                      <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        <span className="vv-online-dot" />
                        <ColoredName gender={u.gender} age={u.age} name={u.displayName} fallbackColor="#e8e8f0" />
                      </span>
                      {u.mood && <span style={{ display: "block", fontSize: 11, color: "#a9b0c0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.mood}</span>}
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
