"use client";

import Link from "next/link";
import { useState } from "react";
import MusicPlayer from "./MusicPlayer";
import Pinnwand from "./Pinnwand";
import GiftShelf from "./GiftShelf";
import ProfileSkin from "./ProfileSkin";
import { api } from "@/lib/api";
import { useMe } from "@/lib/useMe";

export default function ProfileView({ profile, pinnwand, gifts, onChange }) {
  const { me } = useMe();
  const [toast, setToast] = useState(null);

  const isOwner = me?.username === profile.username;

  async function gruscheln() {
    if (!me) { alert("Bitte einloggen."); return; }
    if (isOwner) { alert("Selbst-gruscheln? Bisschen einsam 😄"); return; }
    try {
      await api.postPinnwand(profile.username, "*gruschelt* 🫶");
      setToast(`Du hast ${profile.displayName} gegruschelt!`);
      onChange?.();
      setTimeout(() => setToast(null), 2200);
    } catch (e) {
      alert(e.message);
    }
  }

  return (
    <ProfileSkin css={profile.customCss}>
      {profile.bgMusic && <MusicPlayer track={profile.bgMusic} />}

      <div className="vv-card">
        <div className="vv-profile-header">
          <div className="vv-avatar">{profile.emoji}</div>
          <div>
            <h2 style={{ margin: 0 }}>
              {profile.displayName}{" "}
              {profile.online ? (
                <span style={{ fontSize: 12, color: "#fff", background: "#0aff44", padding: "2px 6px", borderRadius: 8, textShadow: "1px 1px 0 #000" }}>
                  online
                </span>
              ) : (
                <span className="vv-muted" style={{ fontSize: 12 }}>offline</span>
              )}
            </h2>
            <div className="vv-muted">@{profile.username}</div>
            <div className="vv-mt-8">
              <span className="vv-mood">Stimmung: {profile.mood || "—"}</span>
            </div>
            <ul className="vv-profile-stats">
              <li><strong>{pinnwand.length}</strong>Pinnwand</li>
              <li><strong>{gifts.length}</strong>Geschenke</li>
              <li><strong>{(profile.interests || []).length}</strong>Interessen</li>
              <li><strong>{new Date(profile.createdAt).toLocaleDateString("de-DE")}</strong>Dabei seit</li>
            </ul>
          </div>
          <div className="vv-row" style={{ flexDirection: "column", alignItems: "stretch", gap: 6 }}>
            {!isOwner && me && (
              <>
                <button type="button" className="vv-btn vv-btn-pink" onClick={gruscheln}>🫶 Gruscheln</button>
                <Link className="vv-btn vv-btn-cyan" href={`/messenger/${profile.username}`}>✉️ Nachricht</Link>
                <Link className="vv-btn" href={`/u/${profile.username}/fotos`}>📸 Fotos</Link>
              </>
            )}
            {isOwner && (
              <>
                <Link className="vv-btn vv-btn-pink" href="/profile/edit">✎ Profil bearbeiten</Link>
                <Link className="vv-btn vv-btn-cyan" href="/profile/skin">🎨 Skin/CSS</Link>
                <Link className="vv-btn" href="/fotos">📸 Meine Fotos</Link>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="vv-grid-2">
        <div>
          <div className="vv-card">
            <h3>📖 Über mich</h3>
            <p style={{ whiteSpace: "pre-wrap" }}>{profile.aboutMe || <em className="vv-muted">Noch nichts geschrieben.</em>}</p>
          </div>

          {(profile.interests || []).length > 0 && (
            <div className="vv-card">
              <h3>💜 Interessen</h3>
              <div className="vv-row">
                {profile.interests.map((it, i) => (
                  <span key={i} className="vv-mood" style={{ background: "linear-gradient(90deg, #c4f4ff, #00e5ff)" }}>{it}</span>
                ))}
              </div>
            </div>
          )}

          <Pinnwand profile={profile} entries={pinnwand} onChange={onChange} />
        </div>

        <div>
          <GiftShelf profile={profile} gifts={gifts} onChange={onChange} />
        </div>
      </div>

      {toast && <div className="vv-toast">{toast}</div>}
    </ProfileSkin>
  );
}
