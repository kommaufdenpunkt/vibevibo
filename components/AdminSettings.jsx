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
