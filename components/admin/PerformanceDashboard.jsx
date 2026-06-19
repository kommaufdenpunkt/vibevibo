"use client";

// 🚀 Performance-Dashboard mit CCleaner-Style Scan + 1-Klick-Optimierung.

import { useState, useEffect } from "react";

export default function PerformanceDashboard({ pw }) {
  const [data, setData] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [actions, setActions] = useState([]);
  const [scanStep, setScanStep] = useState(0);

  async function analyze() {
    setScanning(true); setData(null); setActions([]); setScanStep(0);
    // Animate scan steps for CCleaner-Feel
    const animateUntil = Date.now() + 1500;
    const interval = setInterval(() => setScanStep((s) => s + 1), 130);
    try {
      const r = await fetch(`/api/admin/performance?pw=${encodeURIComponent(pw)}`);
      const d = await r.json();
      // Mindestdauer für UX-Feeling
      while (Date.now() < animateUntil) await new Promise((res) => setTimeout(res, 50));
      setData(d);
    } finally {
      clearInterval(interval);
      setScanning(false);
    }
  }

  async function update() {
    if (!confirm("Performance-Optimierungen anwenden? (Pragmas + ANALYZE + VACUUM + WAL-Checkpoint)")) return;
    setUpdating(true);
    try {
      const r = await fetch(`/api/admin/performance?pw=${encodeURIComponent(pw)}`, { method: "POST" });
      const d = await r.json();
      setActions(d.actions || []);
      // Nach Update neu analysieren
      await new Promise((res) => setTimeout(res, 500));
      analyze();
    } finally { setUpdating(false); }
  }

  useEffect(() => { analyze(); }, []);

  const issues = data?.issues ?? 0;
  const allOk = data && issues === 0;

  return (
    <div>
      {/* Status-Hero */}
      <div style={{
        background: !data ? "linear-gradient(135deg, rgba(168,85,247,0.15), rgba(6,182,212,0.08))"
          : allOk ? "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(6,182,212,0.08))"
                  : "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(239,68,68,0.08))",
        border: `2px solid ${!data ? "#a855f7" : allOk ? "#10b981" : "#f59e0b"}`,
        borderRadius: 18, padding: 22, marginBottom: 16,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div style={{ fontSize: 44 }}>{scanning ? "🔍" : !data ? "🚀" : allOk ? "✅" : "⚠"}</div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.4)" }}>
              {scanning ? "Analysiere…" : !data ? "Bereit" : allOk ? "Alles optimal" : `${issues} Verbesserung${issues > 1 ? "en" : ""} möglich`}
            </div>
            <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.8)", marginTop: 4 }}>
              {scanning ? `Scan-Layer ${Math.min(scanStep, 6)} / 6` :
               !data ? "Klick „Analysieren" für vollständigen Status." :
               allOk ? "SQLite-Pragmas, Cache + WAL alle perfekt." :
               "Klick „Update" um automatisch zu optimieren."}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={analyze} disabled={scanning || updating}
              style={btnSecondary()}>
              {scanning ? "⏳…" : "🔍 Analysieren"}
            </button>
            <button onClick={update} disabled={scanning || updating || !data}
              style={{ ...btnPrimary(), opacity: data && issues === 0 ? 0.7 : 1 }}>
              {updating ? "⏳…" : "⚡ Update"}
            </button>
          </div>
        </div>
      </div>

      {/* Update-Ergebnisse */}
      {actions.length > 0 && (
        <div style={{
          background: "#fff", borderRadius: 14, padding: 18, marginBottom: 16,
          border: "1px solid #e5e5e7",
        }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 900 }}>⚡ Update-Ergebnis</h3>
          {actions.map((a, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "8px 0",
              borderBottom: i < actions.length - 1 ? "1px solid #f1f5f9" : "none",
            }}>
              <span style={{
                width: 24, height: 24, borderRadius: 999,
                background: a.ok ? "#10b981" : "#ef4444",
                color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 900, fontSize: 13, flexShrink: 0,
              }}>{a.ok ? "✓" : "✗"}</span>
              <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "#1c1c1e" }}>{a.label}</div>
              {a.error && <span style={{ fontSize: 11, color: "#991b1b" }}>{a.error}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Pragma-Status */}
      {data?.pragmas && (
        <>
          <h2 style={{ fontSize: 18, marginTop: 18, marginBottom: 10, color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}>
            ⚙ SQLite-Pragmas
          </h2>
          <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e5e5e7" }}>
            {data.pragmas.map((p, i) => (
              <div key={p.key} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "12px 16px",
                borderBottom: i < data.pragmas.length - 1 ? "1px solid #f1f5f9" : "none",
              }}>
                <div style={{
                  width: 26, height: 26, borderRadius: 999,
                  background: p.ok ? "linear-gradient(135deg, #10b981, #059669)" : "#fbbf24",
                  color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 900, fontSize: 14, flexShrink: 0,
                }}>{p.ok ? "✓" : "!"}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#1c1c1e" }}>{p.label}</div>
                  <div style={{ fontSize: 11, color: "#64748b", fontFamily: "monospace" }}>{p.value}</div>
                  {p.recommendation && (
                    <div style={{ fontSize: 11.5, color: "#b45309", marginTop: 2, fontWeight: 600 }}>
                      💡 {p.recommendation}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* DB-Stats */}
      {data?.dbStats && (
        <>
          <h2 style={{ fontSize: 18, marginTop: 22, marginBottom: 10, color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}>
            💾 Datenbank-Größe
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
            <StatTile label="DB-Größe" value={`${data.dbStats.sizeMB} MB`} sub={`${data.dbStats.pages.toLocaleString("de-DE")} Pages`} />
            <StatTile label="Freilassbar" value={`${(data.bytesFreeable / (1024 * 1024)).toFixed(1)} MB`} sub={`${data.dbStats.freePages.toLocaleString("de-DE")} freie Pages`} />
            <StatTile label="Tabellen" value={data.tableCount} />
            <StatTile label="Indizes" value={data.indexCount} />
          </div>
        </>
      )}

      {/* Tipps */}
      <h2 style={{ fontSize: 18, marginTop: 22, marginBottom: 10, color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}>
        💡 Was bewirken die Optimierungen?
      </h2>
      <ul style={{ background: "#fff", padding: "16px 32px", borderRadius: 14, border: "1px solid #e5e5e7", lineHeight: 1.7, fontSize: 13 }}>
        <li><b>synchronous=NORMAL:</b> 2-3× schnellere Writes ohne nennenswerte Crash-Gefahr in WAL-Mode</li>
        <li><b>cache_size=16MB:</b> Mehr Pages im RAM → weniger Disk-Reads bei wiederholten Queries</li>
        <li><b>temp_store=MEMORY:</b> Temporäre Tabellen im RAM statt auf Disk</li>
        <li><b>mmap_size=256MB:</b> Direct-Memory-Read der DB-Datei statt File-I/O</li>
        <li><b>ANALYZE:</b> Aktualisiert Index-Statistiken → Query-Planer wählt bessere Pläne</li>
        <li><b>VACUUM:</b> Gibt unbenutzten Speicher an OS zurück</li>
        <li><b>WAL-Checkpoint:</b> Verkleinert die .wal-Datei (kann mit der Zeit GB groß werden)</li>
      </ul>
    </div>
  );
}

function StatTile({ label, value, sub }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: 14, border: "1px solid #e5e5e7" }}>
      <div style={{ fontSize: 10, letterSpacing: 1, color: "#94a3b8", fontWeight: 800, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 900, color: "#1c1c1e", marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function btnPrimary() {
  return {
    padding: "10px 18px", borderRadius: 10,
    background: "linear-gradient(135deg, #ec4899, #a855f7)", color: "#fff",
    border: "none", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
  };
}
function btnSecondary() {
  return {
    padding: "10px 18px", borderRadius: 10,
    background: "rgba(255,255,255,0.15)", color: "#fff",
    border: "1px solid rgba(255,255,255,0.25)", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
  };
}
