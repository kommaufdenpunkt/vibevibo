"use client";

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

export default function EditProfilePage() {
  const router = useRouter();
  const { me, loading, refresh } = useMe();
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);

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

  if (!form) return null;

  function up(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  const interestChips = form.interests.split(",").map((s) => s.trim()).filter(Boolean);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.updateMe(me.username, {
        // displayName + mood sind read-only hier:
        //   displayName → nur über /shop (Vibes)
        //   mood        → nur über /profile/status (vordef. gratis, custom = Vibes)
        aboutMe: form.aboutMe,
        interests: form.interests.split(",").map((s) => s.trim()).filter(Boolean),
        bgMusic: form.bgMusic.trim(),
        bgMusicUrl: form.bgMusicUrl.trim(),
        school: form.school.trim(),
        city: form.city.trim(),
      });
      await refresh();
      router.push("/profile");
      router.refresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {/* ── Kopf ── */}
      <div className="vv-card">
        <div className="vv-row" style={{ alignItems: "center", gap: 12 }}>
          <div className="vv-avatar vv-avatar-sm" style={me.avatarUrl ? { overflow: "hidden" } : undefined}>
            {me.avatarUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={me.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : "👤"}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: 0 }}>✎ Profil bearbeiten</h2>
            <div className="vv-muted">@{me.username}</div>
          </div>
        </div>
      </div>

      {/* ── Schnell-Aktionen (Direktlinks) ── */}
      <div className="vv-card">
        <h3 style={{ margin: "0 0 6px" }}>⚡ Schnell-Aktionen</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px,1fr))", gap: 8 }}>
          <Link href="/profile"  className="vv-btn" style={{ textAlign: "center" }}>📷 Profilbilder</Link>
          <Link href="/freunde"  className="vv-btn" style={{ textAlign: "center" }}>👥 Top-5 / Freunde</Link>
          <Link href="/shop"     className="vv-btn vv-btn-pink" style={{ textAlign: "center" }}>✨ Shop</Link>
          <Link href="/vibo"     className="vv-btn" style={{ textAlign: "center" }}>🥚 VIBO</Link>
        </div>
      </div>

      <form onSubmit={submit}>
        {/* 1) Identität — read-only, Vibes-pflichtig */}
        <div className="vv-card">
          <h3>① 👤 Steckbrief</h3>

          <label><strong>Anzeigename</strong> <span className="vv-muted" style={{ fontWeight: "normal", fontSize: 12 }}>🔒 nur im Shop änderbar</span></label>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input className="vv-input" value={me.displayName || ""} readOnly disabled
              style={{ flex: 1, background: "var(--vv-surface,#f5f5f7)", cursor: "not-allowed", color: "var(--vv-muted,#666)" }} />
            <Link href="/shop" className="vv-btn vv-btn-pink" style={{ fontSize: 12, padding: "6px 10px", whiteSpace: "nowrap" }}>
              ✨ Ändern
            </Link>
          </div>

          <label className="vv-mt-12"><strong>@username</strong> <span className="vv-muted" style={{ fontWeight: "normal", fontSize: 12 }}>🔒 nur im Shop änderbar</span></label>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input className="vv-input" value={`@${me.username}`} readOnly disabled
              style={{ flex: 1, background: "var(--vv-surface,#f5f5f7)", cursor: "not-allowed", color: "var(--vv-muted,#666)" }} />
            <Link href="/shop" className="vv-btn vv-btn-pink" style={{ fontSize: 12, padding: "6px 10px", whiteSpace: "nowrap" }}>
              ✨ Ändern
            </Link>
          </div>
          <div className="vv-muted vv-mt-8" style={{ fontSize: 11 }}>
            Anzeigename: <b>100 ✨</b> · @username: <b>500 ✨</b> (max 1×/Jahr) oder <b>1500 ✨</b> sofort.
          </div>

          <label className="vv-mt-12"><strong>Geschlecht &amp; Alter</strong></label>
          <div className="vv-row" style={{ alignItems: "center", gap: 8 }}>
            <GenderAge gender={me.gender} age={me.age} size="1em" />
            <span className="vv-muted" style={{ fontSize: 12 }}>
              🔒 Nach Anmeldung fest — nur das Team kann sie ändern.
            </span>
          </div>

          <div className="vv-muted vv-mt-12" style={{ fontSize: 12 }}>
            📷 <strong>Profilbilder</strong> verwaltest du direkt auf deinem <Link href="/profile">Profil</Link>.
          </div>
        </div>

        {/* 2) Über dich */}
        <div className="vv-card">
          <h3>② 💬 Über dich</h3>

          <label><strong>Status</strong> <span className="vv-muted" style={{ fontWeight: "normal", fontSize: 12 }}>(eigene Seite — gratis Auswahl oder Custom für 50 ✨)</span></label>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}>
            <div className="vv-input" style={{
              flex: 1, background: "var(--vv-surface,#f5f5f7)", color: "var(--vv-text,#1c1c1e)",
              cursor: "default", display: "flex", alignItems: "center", minHeight: 36,
            }}>
              {me.mood ? me.mood : <span className="vv-muted">— kein Status gesetzt —</span>}
            </div>
            <Link href="/profile/status" className="vv-btn vv-btn-pink" style={{ fontSize: 12, padding: "6px 10px", whiteSpace: "nowrap" }}>
              💬 Status ändern
            </Link>
          </div>

          <label className="vv-mt-12"><strong>Über mich</strong></label>
          <textarea className="vv-textarea" rows={5} placeholder="Erzähl was über dich – wie früher im Steckbrief!" value={form.aboutMe} onChange={(e) => up("aboutMe", e.target.value)} />

          <label className="vv-mt-12"><strong>Interessen</strong> <span className="vv-muted">(mit Komma trennen)</span></label>
          <input className="vv-input" placeholder="z.B. Tokio Hotel, Skaten, Pizza" value={form.interests} onChange={(e) => up("interests", e.target.value)} />
          {interestChips.length > 0 && (
            <div className="vv-row" style={{ flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              {interestChips.map((it, i) => (
                <span key={i} className="vv-mood" style={{ background: "linear-gradient(90deg, #c4f4ff, #00e5ff)" }}>{it}</span>
              ))}
            </div>
          )}

          <label className="vv-mt-12"><strong>🏫 Schule / Uni</strong>
            {" "}<Link href="/schulen" style={{ fontSize: 11 }}>(alle anschauen →)</Link>
          </label>
          <input className="vv-input" placeholder="z.B. Lessing-Gymnasium" value={form.school}
            maxLength={80} onChange={(e) => up("school", e.target.value)} />

          <label className="vv-mt-12"><strong>📍 Stadt</strong></label>
          <input className="vv-input" placeholder="z.B. Berlin" value={form.city}
            maxLength={60} onChange={(e) => up("city", e.target.value)} />
        </div>

        {/* 3) Profilmusik */}
        <div className="vv-card">
          <h3>③ 🎵 Profilmusik <span className="vv-muted" style={{ fontSize: 12, fontWeight: "normal" }}>(wie früher bei MySpace)</span></h3>

          <label><strong>Songtitel</strong> <span className="vv-muted">(zum Anzeigen)</span></label>
          <input className="vv-input" placeholder="z.B. Tokio Hotel - Durch den Monsun" value={form.bgMusic} maxLength={200} onChange={(e) => up("bgMusic", e.target.value)} />

          <label className="vv-mt-12"><strong>▶ YouTube-Link</strong> <span className="vv-muted">(optional – damit der Song wirklich spielt)</span></label>
          <input className="vv-input" placeholder="https://www.youtube.com/watch?v=..." value={form.bgMusicUrl} onChange={(e) => up("bgMusicUrl", e.target.value)} />
          <div className="vv-muted vv-mt-8" style={{ fontSize: 11 }}>
            💡 Besucher deines Profils sehen einen Play-Button und können deinen Song hören.
          </div>
        </div>

        {/* Speichern-Bar nach den Text-Karten, damit man die Schreib-Felder direkt sichert */}
        <div className="vv-card vv-row" style={{ alignItems: "center" }}>
          <Link href="/profile" className="vv-btn">↩ Abbrechen</Link>
          <div className="vv-spacer" />
          <button type="submit" className="vv-btn vv-btn-pink" disabled={busy}>{busy ? "Speichert…" : "💾 Text speichern"}</button>
        </div>
      </form>

      {/* Die folgenden Karten sind self-saving (sofort übernommen, kein Submit nötig). */}

      {/* 4) Look */}
      <div style={{ height: 4 }} />
      <LookSettings />

      {/* 5) Standort */}
      <LocationSettings />

      {/* 6) Status & Push */}
      <PushPrefsSettings />

      {/* 7) Sicherheit */}
      <TwoFactorSetup has2fa={!!me?.has2fa} onChanged={refresh} />

      {/* Footer-Hinweis */}
      <div className="vv-card" style={{ textAlign: "center" }}>
        <Link href="/profile" className="vv-btn">↩ Zurück zum Profil</Link>
      </div>
    </div>
  );
}
