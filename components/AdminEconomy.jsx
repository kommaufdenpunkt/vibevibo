"use client";

// 🤖 Fidolin Wirtschafts-Wächter — Admin-Widget.
// Zeigt aktuelle Health-Metriken, Multiplikator, letzten Check.
// Knöpfe: „Jetzt prüfen + anpassen" / „Multiplikator zurücksetzen" / manual.

import { useEffect, useState } from "react";

const PW_KEY = "vv_admin_pw";

function pw() {
  if (typeof window === "undefined") return "";
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get("pw") || "";
  } catch { return ""; }
}

export default function AdminEconomy() {
  const [health, setHealth] = useState(null);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState("");
  const [manualMult, setManualMult] = useState("");

  const [loadError, setLoadError] = useState("");
  async function load() {
    setLoadError("");
    try {
      const r = await fetch(`/api/admin/economy?pw=${encodeURIComponent(pw())}`, {
        headers: { "x-admin-password": pw() },
        cache: "no-store",
      });
      const text = await r.text();
      let d = null;
      try { d = JSON.parse(text); } catch { /* not json */ }
      if (!r.ok) {
        throw new Error(`HTTP ${r.status} — ${d?.error || text.slice(0, 200)}`);
      }
      if (!d?.health) {
        throw new Error("Antwort hat kein health-Objekt");
      }
      setHealth(d.health);
      setManualMult(String(d.health?.currentMultiplier ?? "1.0"));
    } catch (e) {
      setLoadError(e.message || String(e));
    }
  }
  useEffect(() => { load(); }, []);

  async function call(body) {
    setBusy(true); setFlash("");
    try {
      const r = await fetch(`/api/admin/economy?pw=${encodeURIComponent(pw())}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-password": pw() },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Fehler");
      setFlash(`✅ ${d.result?.reason || `Multiplikator = ${d.multiplier}`}`);
      await load();
    } catch (e) { setFlash(`⚠ ${e.message}`); }
    finally { setBusy(false); }
  }

  if (!health) {
    return (
      <div className="vv-card" style={{ padding: 14 }}>
        {loadError ? (
          <>
            <div style={{ fontWeight: 700, color: "#dc2626", marginBottom: 6 }}>⚠ Wirtschafts-Status konnte nicht geladen werden</div>
            <pre style={{ fontSize: 11, color: "#7f1d1d", whiteSpace: "pre-wrap", background: "#fef2f2", padding: 8, borderRadius: 6, border: "1px solid #fecaca" }}>{loadError}</pre>
            <button type="button" onClick={load} className="vv-btn vv-btn-sm" style={{ marginTop: 8 }}>↻ Erneut versuchen</button>
          </>
        ) : "Lade Wirtschafts-Status…"}
      </div>
    );
  }

  const trafficLight = health.flow >= 0.9 && health.flow <= 1.1
    ? { color: "#16a34a", label: "Grün" }
    : (health.flow >= 0.7 && health.flow <= 1.3
        ? { color: "#f59e0b", label: "Gelb" }
        : { color: "#dc2626", label: "Rot" });

  return (
    <div className="vv-card" style={{ padding: 16, background: "linear-gradient(135deg, #fef3c7, #fed7aa)", border: "2px dashed #f59e0b" }}>
      <h3 style={{ margin: "0 0 6px", color: "#7c2d12" }}>🤖 Fidolin — Wirtschafts-Wächter</h3>
      <div style={{ fontSize: 12, color: "#7c2d12", opacity: 0.85, marginBottom: 12 }}>
        Misst die Vibes-Ökonomie der letzten 7 Tage. Bei Inflation/Deflation wird der globale Preis-Multiplikator sanft angepasst.
      </div>

      {flash && (
        <div style={{ padding: 8, marginBottom: 10, borderRadius: 8, background: flash.startsWith("⚠") ? "#fee2e2" : "#dcfce7", color: flash.startsWith("⚠") ? "#991b1b" : "#166534", fontWeight: 700, fontSize: 13 }}>{flash}</div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 8, marginBottom: 14 }}>
        <Stat label="Status" value={`${health.statusEmoji} ${health.status}`} sub={`Ampel: ${trafficLight.label}`} color={trafficLight.color} big />
        <Stat label="Aktueller Multiplikator" value={`×${health.currentMultiplier}`} sub={health.recommendation !== 0 ? `Empfohlen: ×${health.suggestedMultiplier}` : "balanciert"} />
        <Stat label="Flow-Verhältnis" value={String(health.flow)} sub="sink / earned (1.0 = ideal)" />
        <Stat label="Erschaffen (7d)" value={`+${health.earned.toLocaleString("de-DE")} ✨`} />
        <Stat label="Vernichtet (7d)" value={`-${health.sunk.toLocaleString("de-DE")} ✨`} />
        <Stat label="In Umlauf" value={`${health.circulating.toLocaleString("de-DE")} ✨`} sub={`${health.activeUsers} aktive User`} />
        <Stat label="Ø Vermögen" value={`${health.avgWealth.toLocaleString("de-DE")} ✨`} />
        <Stat label="Letzter Check" value={health.lastCheckAt ? new Date(health.lastCheckAt).toLocaleString("de-DE") : "—"} sub={`durch: ${health.lastCheckBy}`} />
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        <button type="button" disabled={busy} onClick={() => call({ action: "apply" })}
          className="vv-btn vv-btn-pink" style={{ fontWeight: 800 }}>
          🤖 Jetzt prüfen + anpassen
        </button>
        <button type="button" disabled={busy} onClick={() => call({ action: "reset" })}
          className="vv-btn">
          ↻ Multiplikator auf 1.0 zurücksetzen
        </button>
      </div>

      <div style={{ display: "flex", gap: 6, alignItems: "center", padding: "8px 10px", background: "rgba(255,255,255,0.7)", borderRadius: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#7c2d12" }}>Manuell setzen:</span>
        <input type="number" step="0.05" min="0.7" max="2.0"
          value={manualMult}
          onChange={(e) => setManualMult(e.target.value)}
          style={{ width: 90, padding: "4px 8px", border: "1.5px solid #f59e0b", borderRadius: 6, fontSize: 13 }} />
        <button type="button" disabled={busy} onClick={() => call({ action: "set", multiplier: Number(manualMult) })}
          className="vv-btn vv-btn-sm">Setzen</button>
        <span style={{ fontSize: 11, color: "#92400e", marginLeft: "auto" }}>Erlaubt: 0.7 – 2.0</span>
      </div>

      <div style={{ marginTop: 12, fontSize: 11, color: "#7c2d12", opacity: 0.8, lineHeight: 1.5 }}>
        💡 <b>Auto-Cron:</b> Setze in Coolify die ENV <code>CRON_SECRET</code> und ping aus einem externen Cron 1× täglich:<br/>
        <code>curl -H "x-cron-secret: $CRON_SECRET" https://vibevibo.de/api/cron/fidolin-economy</code>
      </div>
    </div>
  );
}

function Stat({ label, value, sub, color = "#7c2d12", big = false }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.85)", padding: "9px 11px", borderRadius: 10, border: "1px solid rgba(245,158,11,0.3)" }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: "#92400e", letterSpacing: 0.3, textTransform: "uppercase", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: big ? 17 : 15, fontWeight: 900, color, lineHeight: 1.15 }}>{value}</div>
      {sub && <div style={{ fontSize: 10.5, opacity: 0.7, marginTop: 1, color: "#7c2d12" }}>{sub}</div>}
    </div>
  );
}
