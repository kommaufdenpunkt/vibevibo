"use client";

// 💖 Profil bearbeiten — komplett im 2007er-Style.
// Bunte Cards mit Tone-Varianten, große Action-Tiles, weniger Text-Wand.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMe } from "@/lib/useMe";
import { api } from "@/lib/api";
import GenderAge from "@/components/GenderAge";
import TwoFactorSetup from "@/components/TwoFactorSetup";
import LocationSettings from "@/components/LocationSettings";
import PushPrefsSettings from "@/components/PushPrefsSettings";
import LookSettings from "@/components/LookSettings";
import RelationshipSettings from "@/components/RelationshipSettings";
import MarqueeGreetingEditor from "@/components/MarqueeGreetingEditor";

export default function EditProfilePage() {
  const router = useRouter();
  const { me, loading, refresh } = useMe();
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!me) { router.push("/login"); return; }
    setForm({
      aboutMe: me.aboutMe || "",
      interests: (me.interests || []).join(", "),
      bgMusic: me.bgMusic || "",
      bgMusicUrl: me.bgMusicUrl || "",
      school: me.school || "",
      city: me.city || "",
    });
  }, [me, loading, router]);

  if (!form || !me) return null;

  function up(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  const interestChips = form.interests.split(",").map((s) => s.trim()).filter(Boolean);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.updateMe(me.username, {
        aboutMe: form.aboutMe,
        interests: form.interests.split(",").map((s) => s.trim()).filter(Boolean),
        bgMusic: form.bgMusic.trim(),
        bgMusicUrl: form.bgMusicUrl.trim(),
        school: form.school.trim(),
        city: form.city.trim(),
      });
      await refresh();
      setFlash("✅ Gespeichert!");
      setTimeout(() => setFlash(""), 2500);
    } catch (err) {
      setFlash(`⚠ ${err.message}`);
      setTimeout(() => setFlash(""), 4000);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="vv-edit-page" data-gender={me.gender || ""}>
      {/* ★ Hero ★ */}
      <div className="vv-edit-hero">
        <div className="vv-edit-hero-stars">
          <span>✿</span><span>✩</span><span>★</span><span>♡</span>
          <span>♥</span><span>★</span><span>✩</span><span>✿</span>
        </div>
        <div className="vv-edit-hero-avatar">
          {me.avatarUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={me.avatarUrl} alt="" />
            : <span>👤</span>}
        </div>
        <h1 className="vv-edit-hero-title">✎ Profil bearbeiten</h1>
        <div className="vv-edit-hero-sub">@{me.username} · gestalte dein zweites Zuhause 💖</div>
      </div>

      {flash && (
        <div className="vv-edit-flash" data-tone={flash.startsWith("⚠") ? "warn" : "ok"}>{flash}</div>
      )}

      {/* 🚀 Quick-Tiles — alles auf einen Blick */}
      <div className="vv-edit-tiles">
        <Link href="/profile" className="vv-edit-tile" data-tone="pink">
          <span className="vv-edit-tile-emoji">📷</span>
          <span className="vv-edit-tile-label">Fotos</span>
          <span className="vv-edit-tile-sub">Profilbilder</span>
        </Link>
        <Link href="/profile/status" className="vv-edit-tile" data-tone="violet">
          <span className="vv-edit-tile-emoji">💬</span>
          <span className="vv-edit-tile-label">Status</span>
          <span className="vv-edit-tile-sub">{me.mood ? "ändern" : "setzen"}</span>
        </Link>
        <Link href="/profile/skin" className="vv-edit-tile" data-tone="cyan">
          <span className="vv-edit-tile-emoji">🎨</span>
          <span className="vv-edit-tile-label">Skin & CSS</span>
          <span className="vv-edit-tile-sub">Design + Chat-Theme</span>
        </Link>
        <Link href="/freunde" className="vv-edit-tile" data-tone="gold">
          <span className="vv-edit-tile-emoji">👯</span>
          <span className="vv-edit-tile-label">Top-5</span>
          <span className="vv-edit-tile-sub">Beste Freunde</span>
        </Link>
        <Link href="/shop" className="vv-edit-tile" data-tone="pink">
          <span className="vv-edit-tile-emoji">🛍</span>
          <span className="vv-edit-tile-label">Shop</span>
          <span className="vv-edit-tile-sub">✨ Features</span>
        </Link>
        <Link href="/vibo" className="vv-edit-tile" data-tone="violet">
          <span className="vv-edit-tile-emoji">🥚</span>
          <span className="vv-edit-tile-label">VIBO</span>
          <span className="vv-edit-tile-sub">Dein Pet</span>
        </Link>
      </div>

      {/* 1) Steckbrief — Identität */}
      <div className="vv-edit-card" data-tone="pink">
        <div className="vv-edit-card-title">① 👤 STECKBRIEF</div>
        <div className="vv-edit-card-body">
          <div className="vv-edit-row">
            <div className="vv-edit-field">
              <label>Anzeigename</label>
              <div className="vv-edit-readonly">
                <span>{me.displayName || "—"}</span>
                <Link href="/shop" className="vv-edit-mini-btn">✨ 100</Link>
              </div>
            </div>
            <div className="vv-edit-field">
              <label>@username</label>
              <div className="vv-edit-readonly">
                <span>@{me.username}</span>
                <Link href="/shop" className="vv-edit-mini-btn">✨ 500</Link>
              </div>
            </div>
          </div>
          <div className="vv-edit-row">
            <div className="vv-edit-field">
              <label>Geschlecht & Alter</label>
              <div className="vv-edit-readonly">
                <GenderAge gender={me.gender} age={me.age} size="1em" />
                <span className="vv-edit-lock">🔒 fix</span>
              </div>
            </div>
            <div className="vv-edit-field">
              <label>Mitglied seit</label>
              <div className="vv-edit-readonly">
                <span>{me.createdAt ? new Date(me.createdAt).toLocaleDateString("de-DE") : "—"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={submit}>
        {/* 2) Über mich */}
        <div className="vv-edit-card" data-tone="violet">
          <div className="vv-edit-card-title">② ✿ ÜBER MICH</div>
          <div className="vv-edit-card-body">
            <label>📝 Mein Steckbrief-Text</label>
            <textarea className="vv-edit-input vv-edit-textarea"
              rows={4} maxLength={1000}
              placeholder="Erzähl was über dich — wie früher im Steckbrief! Wer du bist, was dich ausmacht, was du liebst..."
              value={form.aboutMe} onChange={(e) => up("aboutMe", e.target.value)} />
            <div className="vv-edit-counter">{form.aboutMe.length} / 1000 Zeichen</div>

            <label className="vv-edit-spaced">💜 Meine Interessen</label>
            <input className="vv-edit-input"
              placeholder="z.B. Tokio Hotel, Skaten, Pizza, Anime"
              value={form.interests} onChange={(e) => up("interests", e.target.value)} />
            {interestChips.length > 0 && (
              <div className="vv-edit-chip-row">
                {interestChips.map((it, i) => (
                  <span key={i} className="vv-edit-chip">{it}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 3) Wo bist du? */}
        <div className="vv-edit-card" data-tone="cyan">
          <div className="vv-edit-card-title">③ 📍 WO LEBST DU?</div>
          <div className="vv-edit-card-body">
            <div className="vv-edit-row">
              <div className="vv-edit-field">
                <label>🏫 Schule / Uni</label>
                <input className="vv-edit-input"
                  placeholder="z.B. Lessing-Gymnasium"
                  value={form.school} maxLength={80}
                  onChange={(e) => up("school", e.target.value)} />
                <Link href="/schulen" className="vv-edit-mini-link">→ Alle Schulen ansehen</Link>
              </div>
              <div className="vv-edit-field">
                <label>🌆 Stadt</label>
                <input className="vv-edit-input"
                  placeholder="z.B. Berlin"
                  value={form.city} maxLength={60}
                  onChange={(e) => up("city", e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        {/* 4) Profilmusik */}
        <div className="vv-edit-card" data-tone="gold">
          <div className="vv-edit-card-title">④ ♬ PROFILMUSIK / PLAYLIST</div>
          <div className="vv-edit-card-body">
            <div className="vv-edit-hint">
              Wie früher bei MySpace 🎧 — Besucher hören deine Songs. <b>Eine YouTube-URL pro Zeile</b> = Playlist. Auto-Next + Mini-Player zum Mitnehmen durch die Seite.
            </div>
            <label>🎶 Playlist-Titel (Anzeige-Name)</label>
            <input className="vv-edit-input"
              placeholder="z.B. Meine Y2K-Vibes oder Tokio Hotel - Durch den Monsun"
              value={form.bgMusic} maxLength={200}
              onChange={(e) => up("bgMusic", e.target.value)} />

            <label className="vv-edit-spaced">▶ YouTube-Links (eine pro Zeile)</label>
            <textarea className="vv-edit-input vv-edit-textarea"
              rows={5}
              placeholder={`https://www.youtube.com/watch?v=...\nhttps://youtu.be/...\nhttps://www.youtube.com/watch?v=...`}
              value={form.bgMusicUrl}
              onChange={(e) => up("bgMusicUrl", e.target.value)}
              spellCheck={false} />
            <div className="vv-edit-counter">
              {(form.bgMusicUrl || "").split("\n").filter((l) => l.trim()).length} Song(s) · {(form.bgMusicUrl || "").length} Zeichen
            </div>
          </div>
        </div>

        {/* Save-Bar (sticky-feeling am Ende des Forms) */}
        <div className="vv-edit-savebar">
          <Link href="/profile" className="vv-edit-savebar-cancel">↩ Abbrechen</Link>
          <button type="submit" className="vv-edit-savebar-save" disabled={busy}>
            {busy ? "Speichert…" : "💾 Steckbrief speichern"}
          </button>
        </div>
      </form>

      {/* 5) Look (self-saving) */}
      <div className="vv-edit-section-title">💑 Beziehung & Flirt</div>
      <RelationshipSettings />

      <div id="begruessung" className="vv-edit-section-title">🎀 Lauftext & Begrüßung</div>
      <MarqueeGreetingEditor />

      <div className="vv-edit-section-title">🎨 Look & Style</div>
      <LookSettings />

      {/* 6) Standort */}
      <div className="vv-edit-section-title">📍 Standort & Karte</div>
      <LocationSettings />

      {/* 7) Push */}
      <div className="vv-edit-section-title">🔔 Push & Benachrichtigungen</div>
      <PushPrefsSettings />

      {/* 8) Sicherheit */}
      <div className="vv-edit-section-title">🔐 Sicherheit</div>
      <TwoFactorSetup has2fa={!!me?.has2fa} onChanged={refresh} />

      <div className="vv-edit-footer">
        <Link href="/profile" className="vv-edit-savebar-cancel">↩ Zurück zum Profil</Link>
      </div>
    </div>
  );
}
