"use client";

// Look-Auswahl im Profil-Edit: aktive Name-Color + Profil-Skin wechseln.
// Voraussetzung: User hat die jeweilige Farbe / den Skin im Shop gekauft.
// Sofort gespeichert — kein Submit nötig.

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useMe } from "@/lib/useMe";
import { NAME_COLOR_STYLES, NAME_COLOR_KEYS, PROFILE_SKIN_KEYS } from "@/lib/premium";
import { ColoredName } from "./GenderAge";

const COLOR_META = {
  pink:       { emoji: "💗", label: "Bubblegum-Pink" },
  cyan:       { emoji: "🩵", label: "Cyber-Cyan" },
  lila:       { emoji: "💜", label: "Galaxy-Lila" },
  rainbow:    { emoji: "🌈", label: "Regenbogen" },
  glitter:    { emoji: "✨", label: "Glitzer-Gold" },
  sparkle_fx: { emoji: "💫", label: "Sparkle-FX" },
  pride:      { emoji: "🏳️‍🌈", label: "Pride" },
};

const SKIN_META = {
  y2k:     { emoji: "💿", label: "Y2K-Lila" },
  glitter: { emoji: "☁️", label: "Glitzer-Wolke" },
  skater:  { emoji: "🛹", label: "Skater-Park" },
  anime:   { emoji: "🌸", label: "Anime-Sakura" },
  matrix:  { emoji: "🟢", label: "Hacker-Matrix" },
  sailor:  { emoji: "🌙", label: "Sailor-Moon" },
  pride:   { emoji: "🏳️‍🌈", label: "Pride-Parade" },
};

export default function LookSettings() {
  const { me, refresh } = useMe();
  const [activeColor, setActiveColor] = useState("");
  const [activeSkin, setActiveSkin] = useState("");
  const [flash, setFlash] = useState("");

  useEffect(() => {
    if (!me) return;
    setActiveColor(me.nameColor || "");
    setActiveSkin(me.profileSkin || "");
  }, [me]);

  if (!me) return null;

  const ownedColors = NAME_COLOR_KEYS.filter((k) => (me.premiumBadges || []).includes(`color_${k}`));
  const ownedSkins  = PROFILE_SKIN_KEYS.filter((k) => (me.premiumBadges || []).includes(`skin_${k}`));

  async function chooseColor(k) {
    setActiveColor(k);
    try { await api.updateMyPrefs({ nameColor: k }); await refresh?.(); }
    catch (e) { setFlash(`⚠ ${e.message}`); setTimeout(() => setFlash(""), 3000); }
  }
  async function chooseSkin(k) {
    setActiveSkin(k);
    try { await api.updateMyPrefs({ profileSkin: k }); await refresh?.(); }
    catch (e) { setFlash(`⚠ ${e.message}`); setTimeout(() => setFlash(""), 3000); }
  }

  return (
    <div className="vv-card">
      <h3 style={{ margin: "0 0 4px" }}>🎨 Look <span className="vv-muted" style={{ fontSize: 12, fontWeight: "normal" }}>(Name-Color &amp; Profil-Skin)</span></h3>
      <div className="vv-muted" style={{ fontSize: 12, marginBottom: 10 }}>
        Hier wechselst du zwischen Looks die du im Shop freigeschaltet hast.
        Neue Looks gibt&apos;s im <Link href="/shop" style={{ color: "#ec4899", fontWeight: 700 }}>Shop ✨</Link>.
      </div>

      {flash && (
        <div style={{
          padding: 8, background: "#fef3c7", color: "#92400e",
          borderRadius: 8, fontWeight: 700, fontSize: 12, marginBottom: 8,
        }}>{flash}</div>
      )}

      {/* Name-Color */}
      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Name-Color</div>
      <div className="vv-muted" style={{ fontSize: 11, marginBottom: 8 }}>
        Vorschau:{" "}
        <ColoredName
          gender={me.gender}
          age={me.age}
          name={me.displayName || me.username}
          nameColor={activeColor}
        />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px,1fr))", gap: 6, marginBottom: 10 }}>
        {/* Standard (Geschlechts-Farbe) */}
        <button type="button" onClick={() => chooseColor("")}
          className="vv-skin-tile"
          data-active={!activeColor}
          style={{ background: "var(--vv-surface,#f5f5f7)", color: "var(--vv-text,#1c1c1e)" }}>
          <span style={{ textAlign: "center", width: "100%" }}>
            ✖ Standard<br/>
            <span style={{ fontWeight: 400, fontSize: 10 }}>(nach Geschlecht)</span>
          </span>
        </button>
        {NAME_COLOR_KEYS.map((k) => {
          const owned = ownedColors.includes(k);
          const meta = COLOR_META[k];
          const style = NAME_COLOR_STYLES[k] || {};
          const previewBg = style.gradient || (style.color ? `${style.color}33` : "transparent");
          return (
            <button key={k} type="button"
              onClick={() => owned && chooseColor(k)}
              className="vv-skin-tile"
              data-active={activeColor === k}
              data-locked={!owned}
              style={{ background: previewBg }}
              title={owned ? `Wechseln zu ${meta.label}` : `Im Shop freischalten — ${meta.label}`}>
              <span style={{ textAlign: "center", width: "100%", color: "#1c1c1e" }}>
                {meta.emoji} {meta.label}
                {!owned && <><br/><span style={{ fontWeight: 400, fontSize: 10 }}>🔒 im Shop</span></>}
              </span>
            </button>
          );
        })}
      </div>

      {/* Profil-Skin */}
      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, marginTop: 6 }}>Profil-Skin <span className="vv-muted" style={{ fontWeight: "normal" }}>(MySpace-Stil)</span></div>
      <div className="vv-muted" style={{ fontSize: 11, marginBottom: 8 }}>
        Sichtbar wenn andere dein Profil besuchen. Bleibt unter deinen Profilkarten als Untergrund.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px,1fr))", gap: 6 }}>
        {/* Standard (kein Skin) */}
        <button type="button" onClick={() => chooseSkin("")}
          className="vv-skin-tile"
          data-active={!activeSkin}
          style={{ background: "var(--vv-surface,#f5f5f7)", color: "var(--vv-text,#1c1c1e)" }}>
          <span style={{ textAlign: "center", width: "100%" }}>
            ✖ Standard<br/>
            <span style={{ fontWeight: 400, fontSize: 10 }}>(kein Skin)</span>
          </span>
        </button>
        {PROFILE_SKIN_KEYS.map((k) => {
          const owned = ownedSkins.includes(k);
          const meta = SKIN_META[k];
          return (
            <button key={k} type="button"
              onClick={() => owned && chooseSkin(k)}
              className="vv-skin-tile"
              data-active={activeSkin === k}
              data-locked={!owned}
              title={owned ? `Skin ${meta.label} aktivieren` : `Im Shop freischalten — ${meta.label}`}
            >
              {/* Inline-Preview-Block mit dem Skin-Hintergrund */}
              <span style={{ width: "100%" }}>
                <span className="vv-skin-tile-preview" {...{ "data-skin-preview": k }} style={{
                  // Inline-Reuse der Skin-Hintergründe (vereinfachte Variante)
                  background:
                    k === "y2k"     ? "linear-gradient(135deg, #6d28d9 0%, #a855f7 50%, #ec4899 100%)" :
                    k === "glitter" ? "linear-gradient(180deg, #fce7f3, #ddd6fe)" :
                    k === "skater"  ? "linear-gradient(180deg, #1f2937, #374151)" :
                    k === "anime"   ? "linear-gradient(160deg, #ffe4ec, #fbcfe8)" :
                    k === "matrix"  ? "#050a05" :
                    k === "sailor"  ? "linear-gradient(135deg, #0f0f3d, #6d28d9, #db2777)" :
                    k === "pride"   ? "linear-gradient(180deg, #e40303 0 16.6%, #ff8c00 16.6% 33.3%, #ffed00 33.3% 50%, #008026 50% 66.6%, #004dff 66.6% 83.3%, #750787 83.3% 100%)" :
                    "transparent",
                }} />
                <span style={{ display: "block", textAlign: "center" }}>
                  {meta.emoji} {meta.label}
                  {!owned && <><br/><span style={{ fontWeight: 400, fontSize: 10 }}>🔒 im Shop</span></>}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
