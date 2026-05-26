"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMe } from "@/lib/useMe";
import { api } from "@/lib/api";

export default function EditProfilePage() {
  const router = useRouter();
  const { me, loading, refresh } = useMe();
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!me) { router.push("/login"); return; }
    setForm({
      displayName: me.displayName || "",
      gender: me.gender || "",
      birthdate: me.birthdate || "",
      mood: me.mood || "",
      aboutMe: me.aboutMe || "",
      interests: (me.interests || []).join(", "),
      bgMusic: me.bgMusic || "",
      bgMusicUrl: me.bgMusicUrl || "",
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
        displayName: form.displayName.trim() || me.username,
        gender: form.gender,
        birthdate: form.birthdate,
        mood: form.mood.trim(),
        aboutMe: form.aboutMe,
        interests: form.interests.split(",").map((s) => s.trim()).filter(Boolean),
        bgMusic: form.bgMusic.trim(),
        bgMusicUrl: form.bgMusicUrl.trim(),
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

      <form onSubmit={submit}>
        <div className="vv-card">
          <h3>👤 Steckbrief</h3>

          <label><strong>Anzeigename</strong></label>
          <input className="vv-input" value={form.displayName} maxLength={100} onChange={(e) => up("displayName", e.target.value)} />

          <label className="vv-mt-12"><strong>Geschlecht &amp; Geburtsdatum</strong> <span className="vv-muted">(ab 18 · zeigt z.B. „m 21")</span></label>
          <div className="vv-row" style={{ gap: 8, alignItems: "center" }}>
            {[["m", "♂ m"], ["w", "♀ w"]].map(([val, label]) => (
              <button
                key={val}
                type="button"
                className="vv-btn"
                style={{ fontWeight: "bold", background: form.gender === val ? (val === "m" ? "#2a7fff" : "#ff3e9d") : undefined, color: form.gender === val ? "#fff" : undefined }}
                onClick={() => up("gender", val)}
              >{label}</button>
            ))}
            <input
              type="date"
              className="vv-input"
              style={{ flex: 1, margin: 0 }}
              value={form.birthdate}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => up("birthdate", e.target.value)}
            />
          </div>

          <div className="vv-muted vv-mt-12" style={{ fontSize: 12 }}>
            📷 <strong>Profilbilder</strong> verwaltest du direkt auf deinem <Link href="/profile">Profil</Link> – mehrere Bilder hochladen, Hauptbild wählen, Fidolin prüft sie.
          </div>
        </div>

        <div className="vv-card">
          <h3>💬 Über dich</h3>

          <label><strong>Stimmung / Mood</strong></label>
          <input className="vv-input" placeholder="z.B. verliebt 💘, chillig, zocken, ..." value={form.mood} maxLength={120} onChange={(e) => up("mood", e.target.value)} />

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
        </div>

        <div className="vv-card">
          <h3>🎵 Profilmusik <span className="vv-muted" style={{ fontSize: 12, fontWeight: "normal" }}>(wie früher bei MySpace)</span></h3>

          <label><strong>Songtitel</strong> <span className="vv-muted">(zum Anzeigen)</span></label>
          <input className="vv-input" placeholder="z.B. Tokio Hotel - Durch den Monsun" value={form.bgMusic} maxLength={200} onChange={(e) => up("bgMusic", e.target.value)} />

          <label className="vv-mt-12"><strong>▶ YouTube-Link</strong> <span className="vv-muted">(optional – damit der Song wirklich spielt)</span></label>
          <input className="vv-input" placeholder="https://www.youtube.com/watch?v=..." value={form.bgMusicUrl} onChange={(e) => up("bgMusicUrl", e.target.value)} />
          <div className="vv-muted vv-mt-8" style={{ fontSize: 11 }}>
            💡 Kopier den Link eines YouTube-Videos rein. Besucher deines Profils sehen einen Play-Button und können deinen Song hören.
          </div>
        </div>

        <div className="vv-card vv-row" style={{ position: "sticky", bottom: 8, alignItems: "center" }}>
          <Link href="/profile" className="vv-btn">↩ Abbrechen</Link>
          <div className="vv-spacer" />
          <button type="submit" className="vv-btn vv-btn-pink" disabled={busy}>{busy ? "Speichert…" : "💾 Speichern"}</button>
        </div>
      </form>
    </div>
  );
}
