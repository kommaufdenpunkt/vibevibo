"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMe } from "@/lib/useMe";
import { api } from "@/lib/api";
import { scopeCss } from "@/lib/sanitizeCss";

const PRESETS = {
  Pink_Glamour: `
.vv-card { background: linear-gradient(180deg, #ffdcef, #ffb3dc) !important; }
.vv-card h2, .vv-card h3 { background: linear-gradient(90deg, #ff3e9d, #b300ff) !important; }
.vv-pinnwand-entry { background: #fff0fa !important; border-color: #ff3e9d !important; }
body { background: radial-gradient(circle, #ff66c4, #6e00ff) !important; }
`,
  Black_Emo: `
.vv-card { background: #1a0030 !important; color: #e5b0ff !important; border-color: #ff3e9d !important; }
.vv-card h2, .vv-card h3 { background: #000 !important; color: #ff3e9d !important; text-shadow: 0 0 6px #ff3e9d !important; }
.vv-pinnwand-entry { background: #2a004a !important; color: #fff !important; border-color: #ff3e9d !important; }
.vv-muted { color: #aaa !important; }
`,
  Neon_Rave: `
.vv-card { background: #000 !important; color: #0ff !important; border-color: #0ff !important; }
.vv-card h2, .vv-card h3 { background: linear-gradient(90deg, #0ff, #f0f) !important; color: #000 !important; }
.vv-pinnwand-entry { background: #001020 !important; color: #0ff !important; border-color: #0ff !important; }
.vv-mood { background: linear-gradient(90deg, #f0f, #0ff) !important; color: #000 !important; }
`,
  Sweet_Dream: `
.vv-card { background: #fffaf0 !important; border-color: #d4a5ff !important; }
.vv-card h2, .vv-card h3 { background: linear-gradient(90deg, #c4f4ff, #d4a5ff) !important; color: #5500aa !important; }
.vv-pinnwand-entry { background: #f5e5ff !important; border-color: #d4a5ff !important; }
`,
};

const EXAMPLE = `/* Hier kannst du dein Profil designen!
 * Selektoren werden automatisch auf dein Profil beschränkt.
 *
 * Beispiel:
 *   body { background: pink; }
 *   .vv-card { background: #fff7d6; border: 3px dashed #ff3e9d; }
 *   .vv-card h2, .vv-card h3 { background: black !important; color: #ff3e9d !important; }
 */
`;

export default function SkinPage() {
  const router = useRouter();
  const { me, loading, refresh } = useMe();
  const [css, setCss] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!me) { router.push("/login"); return; }
    setCss(me.customCss || EXAMPLE);
  }, [me, loading, router]);

  if (loading || !me) return null;

  async function save() {
    setBusy(true);
    try {
      await api.updateMe(me.username, { customCss: css });
      await refresh();
      router.push("/profile");
      router.refresh();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  function applyPreset(name) {
    setCss(PRESETS[name]);
  }

  return (
    <div className="vv-card">
      <h2>🎨 Profil-Skin (Custom CSS)</h2>
      <p className="vv-muted">
        Gib deinem Profil ein eigenes Aussehen - wie früher bei MySpace! Dein CSS wirkt
        nur auf deiner Profilseite, nicht global. Gefährliche Statements werden
        automatisch entfernt.
      </p>

      <div className="vv-row vv-mt-8" style={{ flexWrap: "wrap" }}>
        <strong>Presets:</strong>
        {Object.keys(PRESETS).map((p) => (
          <button key={p} type="button" className="vv-btn" onClick={() => applyPreset(p)}>
            {p.replace(/_/g, " ")}
          </button>
        ))}
        <button type="button" className="vv-btn" onClick={() => setCss("")}>🧹 Leeren</button>
      </div>

      <div className="vv-grid-2 vv-mt-12">
        <div>
          <label><strong>CSS</strong></label>
          <textarea
            className="vv-textarea"
            style={{ fontFamily: "Courier New, monospace", minHeight: 360, fontSize: 12 }}
            value={css}
            onChange={(e) => setCss(e.target.value)}
            spellCheck={false}
          />
        </div>
        <div>
          <label><strong>Live-Vorschau</strong></label>
          <div className="vv-skin" style={{ border: "2px dashed #ff3e9d", borderRadius: 6, padding: 8 }}>
            {css && <style dangerouslySetInnerHTML={{ __html: scopeCss(css, ".vv-skin") }} />}
            <div className="vv-card">
              <h3>Beispiel-Karte</h3>
              <p>So sieht dein Profil aus.</p>
              <div className="vv-pinnwand-entry">
                <div className="vv-pinnwand-meta"><strong>kevin_skater</strong> 🛹 · vor 2 Std.</div>
                <div>Hdl du knuddelmaus 🥰</div>
              </div>
              <div className="vv-row vv-mt-8">
                <span className="vv-mood">Mood: verliebt 💘</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="vv-row vv-mt-12">
        <Link href="/profile" className="vv-btn">↩ Abbrechen</Link>
        <div className="vv-spacer" />
        <button type="button" className="vv-btn vv-btn-pink" onClick={save} disabled={busy}>
          💾 Skin speichern
        </button>
      </div>
    </div>
  );
}
