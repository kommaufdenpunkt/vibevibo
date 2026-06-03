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
function AdsConfigCard({ state, save, busy, pw, setFlash }) {
  const [adsense, setAdsense] = useState(state.adsense_client || "");
  const [provider, setProvider] = useState(state.ads_provider || "simulator");
  const [secretAdgate, setSecretAdgate] = useState("***unchanged***");
  const [secretPollfish, setSecretPollfish] = useState("***unchanged***");
  const [secretGam, setSecretGam] = useState("***unchanged***");
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState("");

  const adsenseOk = /^ca-pub-\d{16}$/.test(adsense.trim());
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

  async function saveAll() {
    const patch = {
      ADSENSE_CLIENT: adsense.trim(),
      ADS_PROVIDER: provider,
    };
    if (secretAdgate   !== "***unchanged***") patch.ADS_SECRET_ADGATE   = secretAdgate;
    if (secretPollfish !== "***unchanged***") patch.ADS_SECRET_POLLFISH = secretPollfish;
    if (secretGam      !== "***unchanged***") patch.ADS_SECRET_GAM      = secretGam;
    await save(patch);
    setSecretAdgate("***unchanged***");
    setSecretPollfish("***unchanged***");
    setSecretGam("***unchanged***");
  }

  async function runTest() {
    setTesting(true); setTestMsg("");
    try {
      // Wir koennen nicht wirklich AdSense ohne echte Werbung pruefen — wir machen
      // einen Plausibilitaets-Check: Format der Publisher-ID + Provider-Status.
      const checks = [];
      if (adsense) {
        checks.push(adsenseOk
          ? "✅ AdSense Publisher-ID korrekt formatiert (ca-pub-XXXXXXXXXXXXXXXX)"
          : "❌ AdSense Publisher-ID falsch formatiert (sollte ca-pub-XXXXXXXXXXXXXXXX sein)");
      } else {
        checks.push("⚠ AdSense Publisher-ID leer — Display-Banner werden NICHT geschaltet");
      }
      if (provider === "simulator") {
        checks.push("ℹ Rewarded: Simulator-Modus aktiv (keine echte Werbung, User sehen Mock)");
      } else {
        checks.push(`✅ Rewarded-Provider gewaehlt: ${provider}`);
        const hasSecret = (provider === "adgate" && secretAdgate !== "***unchanged***")
                      || (provider === "pollfish" && secretPollfish !== "***unchanged***")
                      || (provider === "gam" && secretGam !== "***unchanged***");
        if (!hasSecret) {
          checks.push(`⚠ Kein Webhook-Secret gespeichert fuer ${provider} — Rewards werden ABGELEHNT bis du das Secret eintraegst.`);
        }
      }
      setTestMsg(checks.join("\n"));
    } catch (e) {
      setTestMsg("⚠ " + e.message);
    } finally { setTesting(false); }
  }

  return (
    <div className="vv-card">
      <h3>📺 Werbe-Konfiguration</h3>
      <p className="vv-muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
        Live umstellbar ohne Deploy. <b>DB-Werte</b> haben Vorrang vor <b>ENV-Variablen</b>.
        Leeres Feld = ENV-Fallback aktiv.
      </p>

      {/* AdSense Client */}
      <div className="vv-mt-12">
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
          AdSense Publisher-ID {srcChip("ADSENSE_CLIENT")}
        </label>
        <input className="vv-input" value={adsense} onChange={(e) => setAdsense(e.target.value)}
          placeholder="ca-pub-1234567890123456"
          style={{ fontFamily: "monospace" }} />
        {adsense && !adsenseOk && (
          <div style={{ fontSize: 11, color: "#dc2626", marginTop: 4 }}>
            ⚠ Format falsch — sollte mit „ca-pub-" beginnen, gefolgt von 16 Ziffern.
          </div>
        )}
        {adsenseOk && (
          <div style={{ fontSize: 11, color: "#16a34a", marginTop: 4 }}>
            ✅ Format ok. Wird nach Speichern sofort fuer Display-Banner verwendet.
          </div>
        )}
      </div>

      {/* Rewarded Provider */}
      <div className="vv-mt-12">
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
          Rewarded-Provider {srcChip("ADS_PROVIDER")}
        </label>
        <select className="vv-input" value={provider} onChange={(e) => setProvider(e.target.value)}>
          <option value="simulator">🧪 Simulator (Mock — kein echtes Geld)</option>
          <option value="adgate">🎁 Adgate Media (Offerwall)</option>
          <option value="pollfish">📋 Pollfish (Surveys)</option>
          <option value="gam">🎯 Google Ad Manager (Rewarded SSV)</option>
        </select>
      </div>

      {/* Webhook-Secrets je Provider */}
      <details style={{ marginTop: 12 }}>
        <summary style={{ cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
          🔐 Webhook-Secrets (nur wenn Provider != Simulator)
        </summary>
        <div style={{ paddingTop: 8 }}>
          <SecretField label="Adgate Webhook-Secret"   src={srcChip("ADS_SECRET_ADGATE")}   mask={state.ads_secret_adgate_mask}   value={secretAdgate}   setValue={setSecretAdgate} />
          <SecretField label="Pollfish Webhook-Secret" src={srcChip("ADS_SECRET_POLLFISH")} mask={state.ads_secret_pollfish_mask} value={secretPollfish} setValue={setSecretPollfish} />
          <SecretField label="GAM SSV-Secret"          src={srcChip("ADS_SECRET_GAM")}      mask={state.ads_secret_gam_mask}      value={secretGam}      setValue={setSecretGam} />
        </div>
      </details>

      <div style={{ display: "flex", gap: 6, marginTop: 14 }}>
        <button type="button" onClick={saveAll} disabled={busy}
          className="vv-btn vv-btn-pink" style={{ flex: 1 }}>
          💾 Speichern (live aktiv)
        </button>
        <button type="button" onClick={runTest} disabled={busy || testing}
          className="vv-btn" style={{ flex: 1 }}>
          {testing ? "Test…" : "🧪 Konfig prufen"}
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
