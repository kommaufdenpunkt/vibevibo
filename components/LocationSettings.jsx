"use client";

// Standort-Einstellungen: in-App-Einverständnis + Anker zurücksetzen + Status.
// Browser-Permission läuft separat — wir verlinken zur Browser-Anleitung.

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function LocationSettings() {
  const [consent, setConsent] = useState(null); // -1 | 0 | 1
  const [busy, setBusy] = useState(false);
  const [browserState, setBrowserState] = useState("unbekannt");
  const [flash, setFlash] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await api.locationConsentGet();
      setConsent(r.value);
    } catch (e) {
      setFlash(`⚠ ${e.message}`);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  // Browser-Permission abfragen (sofern Permissions-API vorhanden)
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.permissions) return;
    navigator.permissions.query({ name: "geolocation" }).then((p) => {
      setBrowserState(p.state);
      p.onchange = () => setBrowserState(p.state);
    }).catch(() => {});
  }, []);

  async function update(value) {
    setBusy(true);
    try {
      const r = await api.locationConsent(value);
      setConsent(r.value);
      setFlash("✔ Gespeichert");
      setTimeout(() => setFlash(""), 2000);
    } catch (e) {
      setFlash(`⚠ ${e.message}`);
    } finally { setBusy(false); }
  }

  async function resetHome() {
    if (!navigator.geolocation) { setFlash("⚠ Geolocation nicht verfügbar"); return; }
    setBusy(true);
    setFlash("📡 Hole Position…");
    navigator.geolocation.getCurrentPosition(
      async (p) => {
        try {
          await api.marketSetHome(p.coords.latitude, p.coords.longitude);
          setFlash("🏠 Zuhause-Anker gesetzt");
          setTimeout(() => setFlash(""), 2500);
        } catch (e) { setFlash(`⚠ ${e.message}`); }
        finally { setBusy(false); }
      },
      (err) => { setFlash(`⚠ ${err.message || "Position nicht abrufbar"}`); setBusy(false); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  if (consent === null) return null;

  const browserLbl = {
    granted: "✅ vom Browser erlaubt",
    prompt:  "❓ wird beim ersten Zugriff gefragt",
    denied:  "🚫 vom Browser blockiert",
    unbekannt: "❓ unbekannt",
  }[browserState] || browserState;

  return (
    <div className="vv-card">
      <h3>📍 Standort &amp; VIBO-Welt</h3>
      <div className="vv-muted" style={{ fontSize: 12, marginBottom: 10 }}>
        Für die Karte, das Angeln, die Wild-VIBOs und die Händler brauchen wir
        deine Position. Browser-Erlaubnis verwaltest du separat in den Browser-Einstellungen
        — hier sagst du uns nur, ob du es <em>grundsätzlich</em> nutzen willst.
      </div>

      {flash && (
        <div style={{
          background: flash.startsWith("⚠") ? "#fef3c7" : "#dcfce7",
          color: flash.startsWith("⚠") ? "#92400e" : "#166534",
          padding: 8, borderRadius: 8, marginBottom: 10, fontWeight: 700, fontSize: 13,
        }}>{flash}</div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
        {[
          { v: 1,  label: "✅ Ja, nutzen" },
          { v: -1, label: "🚫 Nein, ablehnen" },
          { v: 0,  label: "❓ Später entscheiden" },
        ].map((o) => (
          <label key={o.v} style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 10px",
            border: `1px solid ${consent === o.v ? "#ec4899" : "var(--vv-border,#ddd)"}`,
            borderRadius: 10,
            background: consent === o.v ? "#fff5fb" : "var(--vv-card,#fff)",
            cursor: "pointer", fontSize: 13,
          }}>
            <input type="radio" name="locConsent" checked={consent === o.v}
              disabled={busy} onChange={() => update(o.v)} />
            {o.label}
          </label>
        ))}
      </div>

      <div className="vv-muted" style={{ fontSize: 11, marginTop: 10 }}>
        Browser-Status: <b>{browserLbl}</b>. Wenn der Browser blockiert, musst du die
        Erlaubnis dort wieder freigeben (Schloss-Symbol neben der URL).
      </div>

      <div style={{ borderTop: "1px solid var(--vv-border,#eee)", marginTop: 12, paddingTop: 12 }}>
        <strong>🏠 Zuhause-Anker</strong>
        <div className="vv-muted" style={{ fontSize: 12, marginBottom: 8 }}>
          Hier verankert sich der VIBO-Basar. Setz neu, wenn du umgezogen bist.
        </div>
        <button type="button" onClick={resetHome} disabled={busy || consent !== 1}
          className="vv-btn vv-btn-cyan" style={{ fontSize: 13 }}>
          🏠 Anker auf aktuelle Position setzen
        </button>
      </div>
    </div>
  );
}
