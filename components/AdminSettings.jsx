"use client";

// Admin-Einstellungen: Wartungsmodus + Marquee-Text der Startseite.

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function AdminSettings({ pw }) {
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState("");

  async function load() {
    try {
      const r = await api.adminSettingsGet(pw);
      setState(r);
    } catch (e) {
      setFlash(`⚠ ${e.message}`);
      setTimeout(() => setFlash(""), 3000);
    }
  }
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function save(patch) {
    setBusy(true);
    try {
      await api.adminSettingsSet(pw, patch);
      setFlash("✅ Gespeichert");
      setTimeout(() => setFlash(""), 2000);
      load();
    } catch (e) {
      setFlash(`⚠ ${e.message}`);
      setTimeout(() => setFlash(""), 3000);
    } finally { setBusy(false); }
  }

  if (!state) return <div className="vv-card"><div className="vv-muted">Lade Einstellungen…</div></div>;

  return (
    <>
      {flash && (
        <div className="vv-card" style={{
          background: flash.startsWith("⚠") ? "#fef3c7" : "#e8fff0",
          fontWeight: 700, textAlign: "center", padding: 10,
        }}>{flash}</div>
      )}

      {/* Wartungsmodus */}
      <div className="vv-card">
        <h3>🔧 Wartungsmodus</h3>
        <p className="vv-muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
          Wenn aktiv, sehen alle User einen Vollbild-Wartungsbildschirm.
          /admin und /api/* bleiben erreichbar — du kommst also weiter rein.
        </p>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: state.maintenance ? "#fee2e2" : "#dcfce7",
          padding: 12, borderRadius: 8, marginTop: 10,
        }}>
          <strong style={{ color: state.maintenance ? "#991b1b" : "#166534" }}>
            Status: {state.maintenance ? "🔴 AKTIV — User gesperrt" : "🟢 Plattform offen"}
          </strong>
          <button type="button" disabled={busy}
            onClick={() => save({ maintenance_mode: !state.maintenance })}
            className={state.maintenance ? "vv-btn" : "vv-btn vv-btn-pink"}>
            {state.maintenance ? "▶ Plattform öffnen" : "🛑 In Wartung schalten"}
          </button>
        </div>
        <div className="vv-mt-12">
          <label style={{ display: "block", fontSize: 12, marginBottom: 4, fontWeight: 700 }}>
            Wartungs-Text (was die User sehen)
          </label>
          <textarea
            defaultValue={state.message}
            onBlur={(e) => { const v = e.target.value.trim(); if (v !== state.message) save({ maintenance_message: v }); }}
            rows={3} maxLength={400}
            className="vv-input"
            style={{ width: "100%", resize: "vertical", fontFamily: "inherit", fontSize: 14 }}
            placeholder="z.B. Wir spielen kurz ein Update ein. In 10 Minuten geht's weiter."
          />
          <div className="vv-muted" style={{ fontSize: 11, marginTop: 4 }}>
            Wird beim Fokus-Verlust automatisch gespeichert.
          </div>
        </div>
      </div>

      {/* Werbung */}
      <AdsConfigCard state={state} save={save} busy={busy} pw={pw} setFlash={setFlash} />

      {/* Marquee */}
      <div className="vv-card">
        <h3>📰 Startseiten-Lauftext</h3>
        <p className="vv-muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
          Der gelbe Lauftext oben auf der Startseite (eingeloggte User).
          Wenn leer, wird der Standard-Text mit User-Name + Online-Count angezeigt.
        </p>
        <textarea
          defaultValue={state.marquee_text}
          onBlur={(e) => { const v = e.target.value; if (v !== state.marquee_text) save({ marquee_text: v }); }}
          rows={3} maxLength={500}
          className="vv-input vv-mt-12"
          style={{ width: "100%", resize: "vertical", fontFamily: "inherit", fontSize: 14 }}
          placeholder="z.B. 🎉 Heute Abend Quiz-Nacht ab 20 Uhr! ✿ Neue Mysterium-Eier im Shop ✿"
        />
        <div className="vv-muted" style={{ fontSize: 11, marginTop: 4 }}>
          Wird beim Fokus-Verlust automatisch gespeichert.
          Standard-Text wieder anzeigen: einfach leer lassen und tabben/klicken.
        </div>
      </div>
    </>
  );
}

// ============================================================
// Werbe-Konfiguration (Runtime, ohne Deploy umstellbar)
// ============================================================
const DISPLAY_OPTIONS = [
  { id: "off",      emoji: "⛔", name: "Aus", desc: "Keine Banner-Werbung" },
  { id: "ezoic",    emoji: "🧠", name: "Ezoic", desc: "AI-Optimierung, leichtes Review", url: "https://www.ezoic.com" },
  { id: "adsterra", emoji: "⚡", name: "Adsterra", desc: "Instant-Approval, gemischte Qualitaet", url: "https://adsterra.com" },
];

const EARNING_OPTIONS = [
  { id: "simulator", emoji: "🧪", name: "Simulator",      desc: "Mock-Werbung zum Testen (kein Geld)" },
  { id: "cpx",       emoji: "📋", name: "CPX Research",   desc: "Deutsche Umfragen, instant Approval",        url: "https://www.cpx-research.com/sign-up-as-publisher/" },
  { id: "bitlabs",   emoji: "🧠", name: "Bitlabs",        desc: "Deutsche Umfragen, hohe RPMs",                url: "https://bitlabs.ai/publishers/" },
  { id: "ayet",      emoji: "📲", name: "AyetStudios",    desc: "Offer-Wall: App-Install → Vibes",            url: "https://www.ayetstudios.com/publishers/" },
  { id: "pollfish",  emoji: "📊", name: "Pollfish",       desc: "International, Surveys",                      url: "https://www.pollfish.com/" },
  { id: "adgate",    emoji: "🎮", name: "Adgate Media",   desc: "Offer-Wall + Surveys, US-fokussiert",         url: "https://www.adgatemedia.com/" },
];

function AdsConfigCard({ state, save, busy }) {
  const [display, setDisplay] = useState(state.display_provider || "off");
  const [ezoicId, setEzoicId] = useState(state.ezoic_site_id || "");
  const [adsterraZone, setAdsterraZone] = useState(state.adsterra_zone_id || "");
  const [earningActive, setEarningActive] = useState(
    (state.earning_providers_active || "simulator").split(",").map((s) => s.trim()).filter(Boolean)
  );
  const [secrets, setSecrets] = useState({
    cpx: "***unchanged***", bitlabs: "***unchanged***", ayet: "***unchanged***",
    pollfish: "***unchanged***", adgate: "***unchanged***", gam: "***unchanged***",
  });
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState("");
  const sources = state.sources || {};

  function srcChip(k) {
    const src = sources[k] || "none";
    const color = src === "db" ? "#16a34a" : src === "env" ? "#0369a1" : "#9ca3af";
    const label = src === "db" ? "DB (live)" : src === "env" ? "ENV" : "leer";
    return (
      <span style={{ fontSize: 10, fontWeight: 800, padding: "1px 6px", borderRadius: 999, background: `${color}22`, color }}>
        {label}
      </span>
    );
  }

  function toggleEarning(id) {
    setEarningActive((arr) => arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);
  }

  async function saveAll() {
    const patch = {
      DISPLAY_PROVIDER: display,
      EZOIC_SITE_ID: ezoicId.trim(),
      ADSTERRA_ZONE_ID: adsterraZone.trim(),
      EARNING_PROVIDERS_ACTIVE: earningActive.join(","),
    };
    for (const [k, v] of Object.entries(secrets)) {
      if (v !== "***unchanged***") patch[`ADS_SECRET_${k.toUpperCase()}`] = v;
    }
    await save(patch);
    setSecrets((s) => Object.fromEntries(Object.keys(s).map((k) => [k, "***unchanged***"])));
  }

  async function runTest() {
    setTesting(true); setTestMsg("");
    const checks = [];

    // Display
    if (display === "off") {
      checks.push("ℹ Display-Banner deaktiviert (kein Banner wird angezeigt)");
    } else if (display === "ezoic") {
      checks.push(ezoicId ? `✅ Ezoic Site-ID gesetzt: ${ezoicId}` : "❌ Ezoic Site-ID FEHLT — Banner inaktiv");
    } else if (display === "adsterra") {
      checks.push(adsterraZone ? `✅ Adsterra Zone-ID gesetzt: ${adsterraZone}` : "❌ Adsterra Zone-ID FEHLT — Banner inaktiv");
    }

    // Earning
    if (earningActive.length === 0) {
      checks.push("⚠ KEIN Earning-Provider aktiv — User koennen keine Vibes erspielen");
    } else if (earningActive.length === 1 && earningActive[0] === "simulator") {
      checks.push("ℹ Nur Simulator aktiv — User sehen Mock-Videos (kein echtes Geld)");
    } else {
      checks.push(`✅ ${earningActive.length} Earning-Provider aktiv: ${earningActive.join(", ")}`);
      for (const id of earningActive) {
        if (id === "simulator") continue;
        const hasSecret = secrets[id] !== "***unchanged***" || sources[`ADS_SECRET_${id.toUpperCase()}`];
        if (!hasSecret) checks.push(`  ⚠ Kein Webhook-Secret fuer ${id} — Rewards werden ABGELEHNT`);
      }
    }

    setTestMsg(checks.join("\n"));
    setTesting(false);
  }

  return (
    <div className="vv-card">
      <h3>📺 Werbe-Konfiguration</h3>
      <p className="vv-muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
        Live umstellbar ohne Deploy. <b>DB-Werte</b> haben Vorrang vor <b>ENV-Variablen</b>.
      </p>

      {/* ============================================================ */}
      {/* DISPLAY-WERBUNG (Banner)                                     */}
      {/* ============================================================ */}
      <h4 style={{ marginTop: 18, fontSize: 14 }}>🖼 Display-Banner</h4>
      <div className="vv-muted" style={{ fontSize: 11, marginBottom: 8 }}>
        Welcher Anbieter zeigt Banner-Werbung in der App? Nur EINER aktiv. {srcChip("DISPLAY_PROVIDER")}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8 }}>
        {DISPLAY_OPTIONS.map((o) => (
          <label key={o.id} style={{
            display: "block", padding: 10, borderRadius: 10, cursor: "pointer",
            border: `2px solid ${display === o.id ? "#ec4899" : "var(--vv-border,#ddd)"}`,
            background: display === o.id ? "#fff5fb" : "var(--vv-card,#fff)",
          }}>
            <input type="radio" name="display" value={o.id}
              checked={display === o.id} onChange={() => setDisplay(o.id)}
              style={{ marginRight: 6 }} />
            <span style={{ fontWeight: 800, fontSize: 13 }}>{o.emoji} {o.name}</span>
            <div style={{ fontSize: 11, color: "var(--vv-muted,#666)", marginTop: 2 }}>{o.desc}</div>
            {o.url && (
              <a href={o.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
                style={{ fontSize: 10, color: "#ec4899" }}>↗ Account anlegen</a>
            )}
          </label>
        ))}
      </div>

      {display === "ezoic" && (
        <div className="vv-mt-12">
          <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4 }}>
            Ezoic Site-ID {srcChip("EZOIC_SITE_ID")}
          </label>
          <input className="vv-input" value={ezoicId} onChange={(e) => setEzoicId(e.target.value)}
            placeholder="z.B. 12345" style={{ fontFamily: "monospace" }} />
        </div>
      )}

      {display === "adsterra" && (
        <div className="vv-mt-12">
          <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4 }}>
            Adsterra Zone-ID {srcChip("ADSTERRA_ZONE_ID")}
          </label>
          <input className="vv-input" value={adsterraZone} onChange={(e) => setAdsterraZone(e.target.value)}
            placeholder="z.B. abcdef1234567890" style={{ fontFamily: "monospace" }} />
        </div>
      )}

      {/* ============================================================ */}
      {/* EARNING-PROVIDER (Vibes-Verdienen)                           */}
      {/* ============================================================ */}
      <h4 style={{ marginTop: 24, fontSize: 14 }}>💰 Vibes-Verdienen (Reward-Hub)</h4>
      <div className="vv-muted" style={{ fontSize: 11, marginBottom: 8 }}>
        Mehrere parallel moeglich — User sieht alle aktiven Provider im Reward-Modal.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
        {EARNING_OPTIONS.map((o) => {
          const on = earningActive.includes(o.id);
          return (
            <label key={o.id} style={{
              display: "block", padding: 10, borderRadius: 10, cursor: "pointer",
              border: `2px solid ${on ? "#16a34a" : "var(--vv-border,#ddd)"}`,
              background: on ? "#f0fdf4" : "var(--vv-card,#fff)",
            }}>
              <input type="checkbox" checked={on} onChange={() => toggleEarning(o.id)}
                style={{ marginRight: 6 }} />
              <span style={{ fontWeight: 800, fontSize: 13 }}>{o.emoji} {o.name}</span>
              <div style={{ fontSize: 11, color: "var(--vv-muted,#666)", marginTop: 2 }}>{o.desc}</div>
              {o.url && (
                <a href={o.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
                  style={{ fontSize: 10, color: "#ec4899" }}>↗ Account anlegen</a>
              )}
            </label>
          );
        })}
      </div>

      {/* Webhook-Secrets je Provider */}
      <details style={{ marginTop: 16 }}>
        <summary style={{ cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
          🔐 Webhook-Secrets (nur fuer aktive Provider ausser Simulator)
        </summary>
        <div style={{ paddingTop: 8 }}>
          {EARNING_OPTIONS.filter((o) => o.id !== "simulator").map((o) => (
            <SecretField key={o.id}
              label={`${o.emoji} ${o.name} Secret`}
              src={srcChip(`ADS_SECRET_${o.id.toUpperCase()}`)}
              mask={state[`ads_secret_${o.id}_mask`]}
              value={secrets[o.id] || "***unchanged***"}
              setValue={(v) => setSecrets((s) => ({ ...s, [o.id]: v }))} />
          ))}
        </div>
      </details>

      {/* Aktionen */}
      <div style={{ display: "flex", gap: 6, marginTop: 14 }}>
        <button type="button" onClick={saveAll} disabled={busy}
          className="vv-btn vv-btn-pink" style={{ flex: 1 }}>
          💾 Speichern (live aktiv)
        </button>
        <button type="button" onClick={runTest} disabled={busy || testing}
          className="vv-btn" style={{ flex: 1 }}>
          {testing ? "Test…" : "🧪 Konfig pruefen"}
        </button>
      </div>

      {testMsg && (
        <pre style={{
          marginTop: 10, padding: 10, borderRadius: 8,
          background: "var(--vv-surface,#f5f5f7)",
          fontSize: 12, whiteSpace: "pre-wrap", fontFamily: "inherit",
        }}>{testMsg}</pre>
      )}
    </div>
  );
}

function SecretField({ label, src, mask, value, setValue }) {
  const [editing, setEditing] = useState(false);
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
        {label} {src}
      </label>
      {!editing ? (
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <code style={{
            flex: 1, padding: "8px 10px", borderRadius: 8,
            background: "var(--vv-surface,#f5f5f7)", color: "var(--vv-text,#1c1c1e)",
            border: "1px solid var(--vv-border,#ddd)", fontSize: 12,
          }}>
            {mask || <em style={{ color: "#9ca3af" }}>(leer)</em>}
          </code>
          <button type="button" onClick={() => { setEditing(true); setValue(""); }}
            className="vv-btn" style={{ fontSize: 12 }}>✎ Aendern</button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 6 }}>
          <input className="vv-input" type="password" value={value} onChange={(e) => setValue(e.target.value)}
            placeholder="Neues Secret eintragen — beim Speichern wird es uebernommen"
            style={{ flex: 1, fontFamily: "monospace" }} />
          <button type="button" onClick={() => { setEditing(false); setValue("***unchanged***"); }}
            className="vv-btn" style={{ fontSize: 12 }}>✕</button>
        </div>
      )}
    </div>
  );
}
