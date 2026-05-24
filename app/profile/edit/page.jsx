"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMe } from "@/lib/useMe";
import { api } from "@/lib/api";

const EMOJIS = ["🙂","😎","🌸","🛹","👑","🎮","💅","🎧","🦄","🌈","🔥","🌟","💖","🎀","🍀","⚡","🦋","☕","🐱","🐶"];

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
      emoji: me.emoji || "🙂",
      mood: me.mood || "",
      aboutMe: me.aboutMe || "",
      interests: (me.interests || []).join(", "),
      bgMusic: me.bgMusic || "",
    });
  }, [me, loading, router]);

  if (!form) return null;

  function up(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.updateMe(me.username, {
        displayName: form.displayName.trim() || me.username,
        emoji: form.emoji,
        mood: form.mood.trim(),
        aboutMe: form.aboutMe,
        interests: form.interests.split(",").map((s) => s.trim()).filter(Boolean),
        bgMusic: form.bgMusic.trim(),
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
    <div className="vv-card">
      <h2>✎ Profil bearbeiten</h2>
      <form onSubmit={submit}>
        <label><strong>Anzeigename</strong></label>
        <input className="vv-input" value={form.displayName} onChange={(e) => up("displayName", e.target.value)} />

        <label className="vv-mt-12"><strong>Avatar-Emoji</strong></label>
        <div className="vv-row" style={{ flexWrap: "wrap" }}>
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              className="vv-smiley"
              style={{ fontSize: 24, outline: form.emoji === e ? "3px solid #ff3e9d" : "none" }}
              onClick={() => up("emoji", e)}
            >{e}</button>
          ))}
        </div>

        <label className="vv-mt-12"><strong>Stimmung / Mood</strong></label>
        <input className="vv-input" placeholder="z.B. verliebt 💘, chillig, zocken, ..." value={form.mood} onChange={(e) => up("mood", e.target.value)} />

        <label className="vv-mt-12"><strong>Über mich</strong></label>
        <textarea className="vv-textarea" value={form.aboutMe} onChange={(e) => up("aboutMe", e.target.value)} />

        <label className="vv-mt-12"><strong>Interessen</strong> <span className="vv-muted">(Komma-getrennt)</span></label>
        <input className="vv-input" placeholder="z.B. Tokio Hotel, Skaten, Pizza" value={form.interests} onChange={(e) => up("interests", e.target.value)} />

        <label className="vv-mt-12"><strong>Profil-Hintergrundmusik</strong> <span className="vv-muted">(Titel)</span></label>
        <input className="vv-input" placeholder="Mein Lieblingssong" value={form.bgMusic} onChange={(e) => up("bgMusic", e.target.value)} />

        <div className="vv-row vv-mt-12">
          <Link href="/profile" className="vv-btn">↩ Abbrechen</Link>
          <div className="vv-spacer" />
          <button type="submit" className="vv-btn vv-btn-pink" disabled={busy}>💾 Speichern</button>
        </div>
      </form>
    </div>
  );
}
