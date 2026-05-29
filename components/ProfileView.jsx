"use client";

import Link from "next/link";
import { useState } from "react";
import MusicPlayer from "./MusicPlayer";
import Pinnwand from "./Pinnwand";
import GiftShelf from "./GiftShelf";
import ProfileSkin from "./ProfileSkin";
import PicGallery from "./PicGallery";
import { ColoredName } from "./GenderAge";
import Avatar from "./Avatar";
import Gaestebuch from "./Gaestebuch";
import { relTime } from "@/lib/format";
import { api } from "@/lib/api";
import { useMe } from "@/lib/useMe";

function StatPill({ icon, label, value }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 11px", borderRadius: 999, background: "#f0f1f6", color: "#222", fontSize: 12 }}>
      <span style={{ fontSize: 14 }}>{icon}</span>
      <strong style={{ fontSize: 13 }}>{value}</strong>
      <span style={{ color: "#777" }}>{label}</span>
    </div>
  );
}

function bannerByGender(g) {
  if (g === "m") return "linear-gradient(135deg, #2d7dd2 0%, #5fb0ff 60%, #8ec9ff 100%)";
  if (g === "w") return "linear-gradient(135deg, #ff3e9d 0%, #ff8fd0 60%, #ffc1e0 100%)";
  return "linear-gradient(135deg, #7c5cf5 0%, #a87bff 60%, #c8a8ff 100%)";
}

export default function ProfileView({ profile, pinnwand, guestbook = [], gifts, visitCount = 0, visitors = [], onChange }) {
  const { me } = useMe();
  const [toast, setToast] = useState(null);
  const [wallTab, setWallTab] = useState("pinnwand");

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
      {(profile.bgMusic || profile.bgMusicUrl) && (
        <MusicPlayer track={profile.bgMusic} url={profile.bgMusicUrl} />
      )}

      {/* === Profil-Kopf mit Banner === */}
      <div className="vv-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ height: 90, background: bannerByGender(profile.gender) }} />
        <div style={{ padding: "0 18px 16px", display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 16 }}>
          {/* Avatar-Kreis ueberlappt das Banner */}
          <div style={{ marginTop: -54, width: 108, height: 108, borderRadius: "50%", border: "4px solid #fff", overflow: "hidden", boxShadow: "0 4px 14px rgba(0,0,0,0.22)", flexShrink: 0, position: "relative", background: "#f4f4f7" }}>
            <Avatar
              url={profile.avatarUrl}
              name={profile.displayName}
              className=""
              style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40 }}
            />
            {profile.online && (
              <span style={{ position: "absolute", bottom: 4, right: 4, width: 18, height: 18, borderRadius: "50%", background: "#0aff44", border: "3px solid #fff", boxShadow: "0 0 8px rgba(10,255,68,0.7)" }} />
            )}
          </div>

          {/* Identitaet */}
          <div style={{ flex: "1 1 240px", paddingTop: 12, minWidth: 0 }}>
            <h2 style={{ margin: 0, lineHeight: 1.2, fontSize: 22 }}>
              <ColoredName gender={profile.gender} age={profile.age} name={profile.displayName} fallbackColor="#222" size="1em" />
            </h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6, alignItems: "center" }}>
              <span style={{ background: "#e3e6f1", color: "#444", padding: "3px 10px", borderRadius: 10, fontSize: 12, fontWeight: 600 }}>@{profile.username}</span>
              {profile.mood && (
                <span style={{ background: "linear-gradient(90deg, #ffd6e7, #ffeaf3)", color: "#a01062", padding: "3px 10px", borderRadius: 10, fontSize: 12, fontWeight: 600 }}>💭 {profile.mood}</span>
              )}
              <span style={{ background: profile.online ? "#0aff44" : "#bbb", color: "#fff", padding: "2px 9px", borderRadius: 10, fontSize: 11, fontWeight: "bold", textShadow: "0 1px 0 rgba(0,0,0,0.2)" }}>
                {profile.online ? "online" : "offline"}
              </span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
              <StatPill icon="👀" label="Besucher" value={visitCount} />
              <StatPill icon="📌" label="Wall" value={pinnwand.length} />
              <StatPill icon="🎁" label="Geschenke" value={gifts.length} />
              <StatPill icon="✨" label="Dabei seit" value={new Date(profile.createdAt).toLocaleDateString("de-DE")} />
            </div>
          </div>

          {/* Aktions-Knoepfe */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 12, minWidth: 150 }}>
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

      {/* === Profilbild-Galerie === */}
      <PicGallery username={profile.username} isOwner={isOwner} onAvatarChange={onChange} />

      {/* === Hauptbereich: Tabs links, Sidebar rechts === */}
      <div className="vv-grid-2">
        <div>
          <div className="vv-row" style={{ gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
            <button type="button" className={`vv-btn${wallTab === "pinnwand" ? " vv-btn-pink" : ""}`} onClick={() => setWallTab("pinnwand")}>📌 Wall</button>
            <button type="button" className={`vv-btn${wallTab === "gaestebuch" ? " vv-btn-pink" : ""}`} onClick={() => setWallTab("gaestebuch")}>📖 Gästebuch</button>
          </div>
          {wallTab === "pinnwand"
            ? <Pinnwand profile={profile} entries={pinnwand} onChange={onChange} />
            : <Gaestebuch profile={profile} initialEntries={guestbook} />}
        </div>

        <div>
          {/* Ueber mich + Interessen vereint */}
          <div className="vv-card">
            <h3 style={{ marginTop: 0 }}>📖 Über mich</h3>
            <p style={{ whiteSpace: "pre-wrap", marginTop: 0 }}>
              {profile.aboutMe || <em className="vv-muted">Noch nichts geschrieben.</em>}
            </p>
            {(profile.interests || []).length > 0 && (
              <>
                <div style={{ marginTop: 14, marginBottom: 6, fontWeight: "bold", fontSize: 13, color: "#666" }}>💜 Interessen</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {profile.interests.map((it, i) => (
                    <span key={i} className="vv-mood" style={{ background: "linear-gradient(90deg, #c4f4ff, #00e5ff)" }}>{it}</span>
                  ))}
                </div>
              </>
            )}
          </div>

          <GiftShelf profile={profile} gifts={gifts} onChange={onChange} />

          <div className="vv-card">
            <h3 style={{ marginTop: 0 }}>👀 Wer war hier?</h3>
            <div className="vv-visit-counter">
              Besucher-Nr. <strong>{visitCount + 1}</strong> bist du! 🎉
            </div>
            {visitors.length === 0 ? (
              <div className="vv-muted vv-center" style={{ padding: "10px 0" }}>
                Noch keine Besucher. Teile dein Profil!
              </div>
            ) : (
              <div className="vv-mt-8" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {visitors.slice(0, 6).map((v) => (
                  <Link key={v.username} href={`/u/${v.username}`} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 9px", borderRadius: 8, background: "#23232f", textDecoration: "none" }}>
                    <Avatar url={v.avatarUrl} name={v.displayName} className="vv-avatar vv-avatar-sm" style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                      <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {v.online && <span className="vv-online-dot" />}
                        <ColoredName gender={v.gender} age={v.age} name={v.displayName} fallbackColor="#e8e8f0" />
                      </span>
                      {v.mood && <span style={{ display: "block", fontSize: 11, color: "#a9b0c0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.mood}</span>}
                    </span>
                    <span style={{ fontSize: 11, color: "#8e96a8", flexShrink: 0 }}>{relTime(v.at)}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {toast && <div className="vv-toast">{toast}</div>}
    </ProfileSkin>
  );
}
