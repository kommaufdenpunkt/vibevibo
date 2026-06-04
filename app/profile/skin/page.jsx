"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMe } from "@/lib/useMe";
import { api } from "@/lib/api";
import { scopeCss } from "@/lib/sanitizeCss";

const PRESETS = {
  Pink_Glamour: `
body { background: radial-gradient(circle at 30% 20%, #ff66c4 0%, #b300ff 60%, #1a0030 100%) !important; }
.vv-card, .vv-nost-card-body { background: linear-gradient(180deg, #ffdcef, #ffb3dc) !important; }
.vv-card h2, .vv-card h3, .vv-nost-card-title { background: linear-gradient(90deg, #ff3e9d, #b300ff, #ff3e9d) !important; color: #fff !important; }
.vv-pinnwand-entry { background: #fff0fa !important; border-color: #ff3e9d !important; }
.vv-nost-wordart { background: linear-gradient(180deg, #fff, #ff66c4, #ff3e9d, #b300ff) !important; -webkit-background-clip: text !important; }
`,
  Black_Emo: `
body { background: #0a0014 !important; }
.vv-card, .vv-nost-card-body { background: #1a0030 !important; color: #e5b0ff !important; border-color: #ff3e9d !important; }
.vv-card h2, .vv-card h3, .vv-nost-card-title { background: #000 !important; color: #ff3e9d !important; text-shadow: 0 0 6px #ff3e9d !important; }
.vv-pinnwand-entry { background: #2a004a !important; color: #fff !important; border-color: #ff3e9d !important; }
.vv-muted, .vv-nost-steckbrief-label { color: #d8b4fe !important; }
.vv-nost-hero { background: linear-gradient(135deg, #0a0014, #2a004a, #4a0e6e) !important; }
.vv-nost-wordart { background: linear-gradient(180deg, #ff3e9d, #b300ff, #000) !important; -webkit-background-clip: text !important; }
`,
  Neon_Rave: `
body { background: linear-gradient(135deg, #000, #001020, #200020) !important; }
.vv-card, .vv-nost-card-body { background: #000 !important; color: #0ff !important; border-color: #0ff !important; box-shadow: 0 0 16px rgba(0,255,255,0.4) !important; }
.vv-card h2, .vv-card h3, .vv-nost-card-title { background: linear-gradient(90deg, #0ff, #f0f, #0ff) !important; color: #000 !important; }
.vv-pinnwand-entry { background: #001020 !important; color: #0ff !important; border-color: #0ff !important; }
.vv-mood, .vv-nost-mood { background: linear-gradient(90deg, #f0f, #0ff) !important; color: #000 !important; border-color: #0ff !important; }
.vv-nost-wordart { background: linear-gradient(180deg, #0ff, #f0f) !important; -webkit-background-clip: text !important; text-shadow: 0 0 20px #0ff !important; }
`,
  Sweet_Dream: `
body { background: linear-gradient(135deg, #c4f4ff, #d4a5ff, #ffd9f4) !important; }
.vv-card, .vv-nost-card-body { background: #fffaf0 !important; border-color: #d4a5ff !important; }
.vv-card h2, .vv-card h3, .vv-nost-card-title { background: linear-gradient(90deg, #c4f4ff, #d4a5ff, #ffb3dc) !important; color: #5500aa !important; }
.vv-pinnwand-entry { background: #f5e5ff !important; border-color: #d4a5ff !important; }
`,
  Regenbogen_Party: `
body { background: linear-gradient(45deg, #ff0080, #ff8c00, #ffd700, #00ff7f, #00bfff, #8a2be2, #ff0080) !important; background-size: 400% 400% !important; animation: rainbow-bg 8s linear infinite !important; }
@keyframes rainbow-bg { 0%{background-position:0% 50%} 100%{background-position:400% 50%} }
.vv-card, .vv-nost-card-body { background: rgba(255,255,255,0.92) !important; border: 4px solid #ff0080 !important; }
.vv-card h2, .vv-card h3, .vv-nost-card-title { background: linear-gradient(90deg, #ff0080, #ffd700, #00ff7f, #00bfff, #8a2be2) !important; color: #fff !important; text-shadow: 1px 1px 0 #000 !important; }
.vv-pinnwand-entry { background: #fffacd !important; border-color: #ff0080 !important; }
`,
  Bubblegum_Pop: `
body { background: linear-gradient(180deg, #ff77c6, #ff99dd, #ffcce6) !important; }
.vv-card, .vv-nost-card-body { background: linear-gradient(180deg, #fff, #ffe0f0) !important; border: 4px dashed #ff1493 !important; border-radius: 22px !important; }
.vv-card h2, .vv-card h3, .vv-nost-card-title { background: #ff1493 !important; color: #fff !important; font-family: "Comic Sans MS", cursive !important; }
.vv-pinnwand-entry { background: #fff0f5 !important; border: 2px dotted #ff1493 !important; border-radius: 18px !important; }
.vv-nost-wordart { color: #ff1493 !important; -webkit-text-fill-color: #ff1493 !important; }
`,
  Cyber_Y2K: `
body { background: linear-gradient(135deg, #001f3f, #7fdbff, #b10dc9) !important; }
.vv-card, .vv-nost-card-body { background: linear-gradient(135deg, rgba(0,31,63,0.95), rgba(127,219,255,0.2)) !important; color: #7fdbff !important; border: 2px solid #b10dc9 !important; box-shadow: 0 0 18px #b10dc9 !important; }
.vv-card h2, .vv-card h3, .vv-nost-card-title { background: linear-gradient(90deg, #b10dc9, #7fdbff) !important; color: #fff !important; font-family: "Courier New", monospace !important; letter-spacing: 3px !important; }
.vv-pinnwand-entry { background: rgba(0,31,63,0.7) !important; border-color: #7fdbff !important; color: #fff !important; }
.vv-muted, .vv-nost-steckbrief-label { color: #7fdbff !important; }
`,
  Sommer_Sonne: `
body { background: linear-gradient(180deg, #fff5cc, #ffcc66, #ff9933) !important; }
.vv-card, .vv-nost-card-body { background: linear-gradient(180deg, #fffbe6, #ffe699) !important; border: 3px solid #ff6600 !important; }
.vv-card h2, .vv-card h3, .vv-nost-card-title { background: linear-gradient(90deg, #ff6600, #ffcc00, #ff6600) !important; color: #fff !important; text-shadow: 1px 1px 0 #cc3300 !important; }
.vv-pinnwand-entry { background: #fff8e1 !important; border-color: #ff9933 !important; }
.vv-nost-wordart { background: linear-gradient(180deg, #fff, #ffcc00, #ff6600, #cc3300) !important; -webkit-background-clip: text !important; }
`,
  Ozean_Blau: `
body { background: linear-gradient(180deg, #001a33, #003366, #0066cc, #66ccff) !important; }
.vv-card, .vv-nost-card-body { background: linear-gradient(180deg, #e6f7ff, #b3e0ff) !important; border: 3px solid #0066cc !important; color: #001a33 !important; }
.vv-card h2, .vv-card h3, .vv-nost-card-title { background: linear-gradient(90deg, #0066cc, #00ccff, #0066cc) !important; color: #fff !important; }
.vv-pinnwand-entry { background: #e0f4ff !important; border-color: #00ccff !important; }
`,
  Wald_Gruen: `
body { background: linear-gradient(180deg, #1a3300, #336600, #66cc33) !important; }
.vv-card, .vv-nost-card-body { background: linear-gradient(180deg, #f0fff0, #ccffcc) !important; border: 3px solid #336600 !important; color: #1a3300 !important; }
.vv-card h2, .vv-card h3, .vv-nost-card-title { background: linear-gradient(90deg, #336600, #66cc33, #336600) !important; color: #fff !important; }
.vv-pinnwand-entry { background: #f5fff0 !important; border-color: #66cc33 !important; }
`,
  Vampire_Goth: `
body { background: radial-gradient(circle, #330000, #000) !important; }
.vv-card, .vv-nost-card-body { background: #1a0000 !important; color: #ff6666 !important; border: 3px solid #cc0000 !important; }
.vv-card h2, .vv-card h3, .vv-nost-card-title { background: #000 !important; color: #cc0000 !important; text-shadow: 0 0 10px #cc0000, 2px 2px 0 #330000 !important; font-family: "Georgia", serif !important; }
.vv-pinnwand-entry { background: #2a0000 !important; color: #ff9999 !important; border-color: #cc0000 !important; }
.vv-muted, .vv-nost-steckbrief-label { color: #ff6666 !important; }
.vv-nost-wordart { color: #cc0000 !important; -webkit-text-fill-color: #cc0000 !important; text-shadow: 0 0 12px #cc0000 !important; }
`,
  Candy_Crush: `
body { background: linear-gradient(135deg, #ff6b9d, #c44dff, #ffd93d, #6bcfff) !important; background-size: 200% 200% !important; animation: rainbow-bg 12s ease infinite !important; }
.vv-card, .vv-nost-card-body { background: linear-gradient(180deg, #fff, #ffe6f2) !important; border: 4px solid #ff6b9d !important; border-radius: 20px !important; box-shadow: 0 8px 24px rgba(255,107,157,0.4) !important; }
.vv-card h2, .vv-card h3, .vv-nost-card-title { background: linear-gradient(90deg, #ff6b9d, #c44dff, #6bcfff) !important; color: #fff !important; }
.vv-pinnwand-entry { background: #fff0f8 !important; border: 2px dotted #c44dff !important; }
`,
  Disco_Glitter: `
body { background: linear-gradient(45deg, #ffd700, #ff69b4, #9370db, #00ced1, #ffd700) !important; background-size: 300% 300% !important; animation: rainbow-bg 6s linear infinite !important; }
.vv-card, .vv-nost-card-body { background: linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,255,255,0.95)) !important; border: 3px solid #ffd700 !important; box-shadow: 0 0 20px rgba(255,215,0,0.6) !important; }
.vv-card h2, .vv-card h3, .vv-nost-card-title { background: linear-gradient(90deg, #ffd700, #ff69b4, #9370db, #ffd700) !important; color: #fff !important; text-shadow: 1px 1px 0 #000 !important; }
.vv-pinnwand-entry { background: #fffbe6 !important; border-color: #ffd700 !important; }
.vv-nost-wordart { background: linear-gradient(180deg, #fff, #ffd700, #ff69b4) !important; -webkit-background-clip: text !important; }
`,
  Retro_VHS: `
body { background: linear-gradient(180deg, #2d0a4e, #6b1f8a, #ff006e) !important; }
.vv-card, .vv-nost-card-body { background: #1a0033 !important; color: #ff71ce !important; border: 2px solid #ff006e !important; box-shadow: 4px 4px 0 #01cdfe, 8px 8px 0 #b967ff !important; }
.vv-card h2, .vv-card h3, .vv-nost-card-title { background: linear-gradient(90deg, #ff71ce, #01cdfe, #b967ff) !important; color: #fff !important; font-family: "Courier New", monospace !important; letter-spacing: 2px !important; }
.vv-pinnwand-entry { background: #2d0a4e !important; color: #fff !important; border-color: #01cdfe !important; }
.vv-muted, .vv-nost-steckbrief-label { color: #01cdfe !important; }
`,
  Pastell_Eis: `
body { background: linear-gradient(135deg, #ffd1dc, #e0bbff, #c4faff, #d4ffea) !important; }
.vv-card, .vv-nost-card-body { background: rgba(255,255,255,0.85) !important; border: 2px solid #e0bbff !important; backdrop-filter: blur(8px) !important; }
.vv-card h2, .vv-card h3, .vv-nost-card-title { background: linear-gradient(90deg, #ffd1dc, #e0bbff, #c4faff, #d4ffea) !important; color: #6b4d8a !important; }
.vv-pinnwand-entry { background: #fafafa !important; border-color: #e0bbff !important; }
`,
};

const CHAT_THEMES = [
  { id: "default", name: "💙 Standard (Blau)", color: "#2d7dd2" },
  { id: "pink",    name: "💖 Nostalgie Pink", color: "#ff3e9d" },
  { id: "msn",     name: "📨 MSN Classic",    color: "#5b94d6" },
  { id: "neon",    name: "⚡ Neon Rave",       color: "#f0f" },
  { id: "dark",    name: "🖤 Dark Emo",        color: "#1a0030" },
  { id: "gold",    name: "👑 Gold Glamour",   color: "#f59e0b" },
  { id: "ocean",   name: "🌊 Ocean",           color: "#06b6d4" },
  { id: "rainbow", name: "🌈 Regenbogen",      color: "#ff0080" },
];

const EXAMPLE = `/* Hier kannst du dein Profil designen!
 * Selektoren werden automatisch auf dein Profil beschränkt.
 *
 * Beispiel:
 *   body { background: pink; }
 *   .vv-card { background: #fff7d6; border: 3px dashed #ff3e9d; }
 *   .vv-card h2, .vv-card h3 { background: black !important; color: #ff3e9d !important; }
 */
`;

// Komponenten, die im Color-Builder einzeln gefärbt werden können
const COMPONENTS = [
  { key: "body",     label: "🌅 Hintergrund",     selectors: "body",                                                  prop: "background" },
  { key: "hero",     label: "🎀 Titelbild (Hero)", selectors: ".vv-nost-hero",                                         prop: "background" },
  { key: "wordart",  label: "✨ Name (WordArt)",   selectors: ".vv-nost-wordart",                                      prop: "color", fill: true },
  { key: "card",     label: "📋 Karten-Inhalt",    selectors: ".vv-card, .vv-nost-card-body",                          prop: "background" },
  { key: "cardTitle",label: "🏷 Karten-Titel",      selectors: ".vv-card h2, .vv-card h3, .vv-nost-card-title",         prop: "background" },
  { key: "cardText", label: "📝 Karten-Titel-Text", selectors: ".vv-card h2, .vv-card h3, .vv-nost-card-title",         prop: "color" },
  { key: "border",   label: "🟪 Karten-Rahmen",     selectors: ".vv-card, .vv-nost-card",                               prop: "border-color" },
  { key: "btn",      label: "🔘 Buttons (Aktionen)", selectors: ".vv-btn, .vv-nost-action",                            prop: "background" },
  { key: "btnText",  label: "🔠 Button-Text",       selectors: ".vv-btn, .vv-nost-action",                              prop: "color" },
  { key: "pin",      label: "📌 Pinnwand-Eintrag",  selectors: ".vv-pinnwand-entry",                                    prop: "background" },
  { key: "pinBorder",label: "📍 Pinnwand-Rahmen",   selectors: ".vv-pinnwand-entry",                                    prop: "border-color" },
  { key: "mood",     label: "💭 Mood-Bubble",       selectors: ".vv-mood, .vv-nost-mood",                               prop: "background" },
  { key: "chip",     label: "🏷 Interessen-Chips",   selectors: ".vv-nost-chip",                                         prop: "background" },
  { key: "text",     label: "📃 Allgemeiner Text",   selectors: ".vv-nost-page, .vv-nost-card-body",                    prop: "color" },
];

function buildCssFromColors(colors) {
  const lines = [];
  for (const c of COMPONENTS) {
    const v = colors[c.key];
    if (!v) continue;
    if (c.fill) {
      lines.push(`${c.selectors} { ${c.prop}: ${v} !important; -webkit-text-fill-color: ${v} !important; background: none !important; -webkit-background-clip: initial !important; }`);
    } else {
      lines.push(`${c.selectors} { ${c.prop}: ${v} !important; }`);
    }
  }
  return lines.join("\n");
}

export default function SkinPage() {
  const router = useRouter();
  const { me, loading, refresh } = useMe();
  const [css, setCss] = useState("");
  const [busy, setBusy] = useState(false);
  const [colors, setColors] = useState({});
  const [chatTheme, setChatTheme] = useState("default");

  useEffect(() => {
    if (loading) return;
    if (!me) { router.push("/login"); return; }
    setCss(me.customCss || EXAMPLE);
    try { setChatTheme(localStorage.getItem("vv-chat-theme") || "default"); } catch {}
  }, [me, loading, router]);

  const builtCss = useMemo(() => buildCssFromColors(colors), [colors]);

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
    setColors({});
  }

  function applyChatTheme(id) {
    setChatTheme(id);
    try {
      localStorage.setItem("vv-chat-theme", id);
      window.dispatchEvent(new CustomEvent("vv-chat-theme-change"));
    } catch {}
  }

  function setColor(key, value) {
    setColors((c) => ({ ...c, [key]: value }));
  }

  function applyBuilderToCss() {
    const block = builtCss;
    if (!block.trim()) { alert("Wähl erst Farben aus 🎨"); return; }
    const marker = "/* --- Color-Builder --- */";
    const endMarker = "/* --- /Color-Builder --- */";
    const current = css.replace(new RegExp(`${marker.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}[\\s\\S]*?${endMarker.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}`, "m"), "").trim();
    setCss(`${marker}\n${block}\n${endMarker}\n\n${current}`);
  }

  function resetBuilder() {
    setColors({});
  }

  return (
    <div className="vv-card">
      <h2>🎨 Profil-Skin & Chat-Style</h2>
      <p className="vv-muted">
        Gib deinem Profil ein eigenes Aussehen — wie früher bei MySpace! Wähl ein Preset,
        bau dir mit den Farb-Pickern dein eigenes Design oder schreib direkt CSS.
        Dein CSS wirkt nur auf deiner Profilseite. Gefährliche Statements werden automatisch entfernt.
      </p>

      {/* === Chat-Overlay-Theme === */}
      <div className="vv-card" style={{ marginTop: 12, background: "linear-gradient(135deg,#fef3c7,#fde68a)", border: "2px dashed #f59e0b" }}>
        <h3 style={{ marginTop: 0, color: "#7c2d12" }}>💬 Chat-Overlay-Theme</h3>
        <p className="vv-muted" style={{ marginTop: 0 }}>
          Wirkt sofort auf dein Chat-Fenster unten rechts. Wird lokal gespeichert.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 6 }}>
          {CHAT_THEMES.map((t) => (
            <button key={t.id} type="button" onClick={() => applyChatTheme(t.id)}
              style={{
                padding: "8px 10px", borderRadius: 10, fontSize: 12, fontWeight: 700,
                background: chatTheme === t.id ? t.color : "#fff",
                color: chatTheme === t.id ? "#fff" : "#1c1c1e",
                border: `2px solid ${t.color}`,
                cursor: "pointer", textAlign: "left",
                boxShadow: chatTheme === t.id ? `0 4px 12px ${t.color}66` : "none",
              }}>
              {t.name}
              {chatTheme === t.id && <span style={{ float: "right" }}>✓</span>}
            </button>
          ))}
        </div>
      </div>

      {/* === Presets === */}
      <div className="vv-card" style={{ marginTop: 12 }}>
        <h3 style={{ marginTop: 0 }}>🎁 Presets — alles auf einmal</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 6 }}>
          {Object.keys(PRESETS).map((p) => (
            <button key={p} type="button" className="vv-btn" onClick={() => applyPreset(p)}
              style={{ fontSize: 12, padding: "8px 10px", textAlign: "left" }}>
              {p.replace(/_/g, " ")}
            </button>
          ))}
          <button type="button" className="vv-btn" onClick={() => { setCss(""); setColors({}); }}
            style={{ fontSize: 12, padding: "8px 10px" }}>🧹 Alles leeren</button>
        </div>
      </div>

      {/* === Color-Builder === */}
      <div className="vv-card" style={{ marginTop: 12, background: "linear-gradient(135deg,#fce7f3,#f5d0fe)", border: "2px dashed #ec4899" }}>
        <h3 style={{ marginTop: 0, color: "#831843" }}>🖌 Farb-Builder — jede Komponente einzeln</h3>
        <p className="vv-muted" style={{ marginTop: 0 }}>
          Klick auf das Farbfeld, wähl deine Farbe — fertig. Mit „→ In CSS-Editor übernehmen" landet alles unten als CSS-Block.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8 }}>
          {COMPONENTS.map((c) => (
            <label key={c.key} style={{
              display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
              background: "rgba(255,255,255,0.7)", borderRadius: 10, border: "1px solid #ec4899",
              cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#831843",
            }}>
              <input type="color"
                value={colors[c.key] || "#ec4899"}
                onChange={(e) => setColor(c.key, e.target.value)}
                style={{ width: 36, height: 36, border: "none", padding: 0, cursor: "pointer", background: "none", borderRadius: 8 }} />
              <span style={{ flex: 1, minWidth: 0 }}>{c.label}</span>
              {colors[c.key] && (
                <button type="button" onClick={(e) => { e.preventDefault(); setColor(c.key, undefined); }}
                  style={{ background: "none", border: "none", color: "#831843", cursor: "pointer", fontSize: 14 }} title="Zurücksetzen">×</button>
              )}
            </label>
          ))}
        </div>
        <div className="vv-row vv-mt-8">
          <button type="button" className="vv-btn vv-btn-pink" onClick={applyBuilderToCss}>
            → In CSS-Editor übernehmen
          </button>
          <button type="button" className="vv-btn" onClick={resetBuilder}>
            ↺ Builder leeren
          </button>
          <span className="vv-muted" style={{ fontSize: 11, alignSelf: "center" }}>
            {Object.keys(colors).filter((k) => colors[k]).length} Komponenten ausgewählt
          </span>
        </div>
      </div>

      {/* === CSS-Editor + Live-Vorschau === */}
      <div className="vv-grid-2 vv-mt-12">
        <div>
          <label><strong>CSS-Editor</strong></label>
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
                <button type="button" className="vv-btn vv-btn-pink">Button</button>
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
