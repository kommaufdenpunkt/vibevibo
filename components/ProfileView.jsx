"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import MusicPlayer from "./MusicPlayer";
import Pinnwand from "./Pinnwand";
import GiftShelf from "./GiftShelf";
import ProfileSkin from "./ProfileSkin";
import PicGallery from "./PicGallery";
import ViboProfileWidget from "./ViboProfileWidget";
import { ColoredName } from "./GenderAge";
import PremiumBadges from "./PremiumBadges";
import Avatar from "./Avatar";
import ActivityBars from "./ActivityBars";
import OnlineName from "./OnlineName";
import Gaestebuch from "./Gaestebuch";
import { relTime } from "@/lib/format";
import { api } from "@/lib/api";
import { useMe } from "@/lib/useMe";

// Bild im Browser auf 400x400 verkleinern (mittig beschnitten) -> kleines JPEG
function fileToAvatarDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = reject;
      img.onload = () => {
        const size = 400;
        const canvas = document.createElement("canvas");
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext("2d");
        const scale = Math.max(size / img.width, size / img.height);
        const w = img.width * scale, h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// Einheitliche Sidebar-Buttons: gleich breit, gleich hoch, zentriert
const sideBtn = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  width: "100%",
  padding: "10px 12px",
  fontSize: 13,
  textAlign: "center",
  boxSizing: "border-box",
  whiteSpace: "nowrap",
};

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
  // weichere, weniger grelle Farbverlaeufe
  if (g === "m") return "linear-gradient(135deg, #4ea1e6 0%, #7fc2ff 60%, #a8d4ff 100%)";
  if (g === "w") return "linear-gradient(135deg, #ff7fbf 0%, #ffa6d2 60%, #ffd3e6 100%)";
  return "linear-gradient(135deg, #9d83f5 0%, #c0a6ff 60%, #ddc7ff 100%)";
}

export default function ProfileView({ profile, pinnwand, guestbook = [], gifts, visitCount = 0, visitors = [], onChange }) {
  const { me } = useMe();
  const [toast, setToast] = useState(null);
  const [wallTab, setWallTab] = useState("pinnwand");
  const [uploadBusy, setUploadBusy] = useState(false);
  const fileRef = useRef(null);

  const isOwner = me?.username === profile.username;

  function showToast(msg, ms = 2500) {
    setToast(msg);
    setTimeout(() => setToast(null), ms);
  }

  async function onAvatarPick(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadBusy(true);
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      const res = await api.uploadPic(profile.username, dataUrl);
      if (res.status === "approved") {
        // Neu hochgeladenes Bild automatisch als Hauptbild (⭐) setzen
        try { await api.setPrimaryPic(res.id); } catch { /* ignore */ }
        showToast("⭐ Neues Hauptbild!");
      } else if (res.status === "pending") {
        showToast("⏳ In Prüfung – wird nach Freigabe sichtbar.", 4000);
      } else {
        showToast("🚫 Abgelehnt: " + (res.reason || "verstößt gegen die Regeln"), 4500);
      }
      onChange?.();
    } catch (err) {
      showToast("Fehler: " + err.message, 4000);
    } finally {
      setUploadBusy(false);
    }
  }

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
        <div style={{ height: 80, background: bannerByGender(profile.gender) }} />
        <div style={{ padding: "0 18px 16px", display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 16 }}>
          {/* Avatar-Kreis ueberlappt das Banner */}
          <div
            onClick={isOwner && !uploadBusy ? () => fileRef.current?.click() : undefined}
            title={isOwner ? "Klicken um ein neues Profilbild hochzuladen" : undefined}
            style={{
              marginTop: -46, width: 96, height: 96, borderRadius: "50%",
              border: "3px solid #fff", overflow: "hidden",
              boxShadow: "0 3px 10px rgba(0,0,0,0.2)",
              flexShrink: 0, position: "relative", background: "#f4f4f7",
              cursor: isOwner && !uploadBusy ? "pointer" : "default",
            }}
          >
            <Avatar
              url={profile.avatarUrl}
              name={profile.displayName}
              className=""
              style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 }}
            />
            {/* Owner: kleine Kamera als Klick-Hint (Klick laeuft ueber Wrapper) */}
            {isOwner && (
              <span aria-hidden="true" style={{
                position: "absolute", top: 2, right: 2,
                width: 24, height: 24, borderRadius: "50%",
                background: "#ff3e9d", color: "#fff",
                border: "2px solid #fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
                pointerEvents: "none",
              }}>{uploadBusy ? "…" : "📷"}</span>
            )}
          </div>
          {isOwner && (
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              hidden
              onChange={onAvatarPick}
            />
          )}

          {/* Identitaet */}
          <div style={{ flex: "1 1 240px", paddingTop: 12, minWidth: 0 }}>
            <h2 style={{ margin: 0, lineHeight: 1.2, fontSize: 22, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <ColoredName gender={profile.gender} age={profile.age} name={profile.displayName} fallbackColor="#222" size="1em" />
              <PremiumBadges badges={profile.premiumBadges} size={20} />
            </h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4, alignItems: "center" }}>
              <span style={{ background: "#e3e6f1", color: "#555", padding: "2px 9px", borderRadius: 10, fontSize: 12, fontWeight: 600 }}>@{profile.username}</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: profile.online ? "#e8fff0" : "#f1f1f5", color: profile.online ? "#0a7a31" : "#888", padding: "3px 10px", borderRadius: 10, fontSize: 12, fontWeight: profile.online ? "bold" : 400, border: profile.online ? "1px solid #a8ecbf" : "1px solid #e5e5ea" }}>
                <ActivityBars lastSeen={profile.lastSeen} size="sm" />
                {profile.online ? "online" : "offline"}
              </span>
              {profile.mood && (
                <span style={{ background: "linear-gradient(90deg, #ffd6e7, #ffeaf3)", color: "#a01062", padding: "2px 9px", borderRadius: 10, fontSize: 12, fontWeight: 600 }}>💭 {profile.mood}</span>
              )}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
              <StatPill icon="👀" label="Besucher" value={visitCount} />
              <StatPill icon="📌" label="Wall" value={pinnwand.length} />
              <StatPill icon="🎁" label="Geschenke" value={gifts.length} />
              <StatPill icon="✨" label="Dabei seit" value={new Date(profile.createdAt).toLocaleDateString("de-DE")} />
            </div>
          </div>

          {/* Aktions-Knoepfe — einheitliche Breite + zentriert */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 12, width: 170, flexShrink: 0 }}>
            {!isOwner && me && (
              <>
                <button type="button" className="vv-btn vv-btn-pink" onClick={gruscheln} style={sideBtn}>🫶 Gruscheln</button>
                <Link className="vv-btn vv-btn-cyan" href={`/messenger/${profile.username}`} style={sideBtn}>✉️ Nachricht</Link>
                <Link className="vv-btn" href={`/u/${profile.username}/fotos`} style={sideBtn}>📸 Fotos</Link>
              </>
            )}
            {isOwner && (
              <>
                <Link className="vv-btn vv-btn-pink" href="/profile/edit" style={sideBtn}>✎ Bearbeiten</Link>
                <Link className="vv-btn vv-btn-cyan" href="/profile/skin" style={sideBtn}>🎨 Skin/CSS</Link>
                <Link className="vv-btn" href="/fotos" style={sideBtn}>📸 Meine Fotos</Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* === VIBO-Widget === */}
      <ViboProfileWidget username={profile.username} isOwner={isOwner} />

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
                      <span style={{ display: "flex", alignItems: "center", gap: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        <OnlineName lastSeen={v.lastSeen}>
                          <ColoredName gender={v.gender} age={v.age} name={v.displayName} fallbackColor="#e8e8f0" />
                        </OnlineName>
                        <ActivityBars lastSeen={v.lastSeen} size="sm" />
                      </span>
                      {v.mood && <span style={{ display: "block", marginTop: 7, fontSize: 11, color: "#a9b0c0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.mood}</span>}
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
