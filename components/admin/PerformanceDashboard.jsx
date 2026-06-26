"use client";

// 🚀 Performance-Dashboard mit CCleaner-Style Scan + 1-Klick-Optimierung.
// Cookie-basiert — keine ?pw=-URL-Parameter mehr.

import { useState, useEffect } from "react";

export default function PerformanceDashboard() {
  const [data, setData] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [actions, setActions] = useState([]);
  const [scanStep, setScanStep] = useState(0);

  async function analyze() {
    setScanning(true); setData(null); setActions([]); setScanStep(0);
    const animateUntil = Date.now() + 1500;
    const interval = setInterval(() => setScanStep((s) => s + 1), 130);
    try {
      const r = await fetch("/api/admin/performance", { credentials: "include" });
      const d = await r.json();
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
      const r = await fetch("/api/admin/performance", { method: "POST", credentials: "include" });
      const d = await r.json();
      setActions(d.actions || []);
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
            <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.9)", marginTop: 4 }}>
              {scanning ? `Scan-Layer ${Math.min(scanStep, 6)} / 6` :
               !data ? 'Klick "Analysieren" für vollständigen Status.' :
               allOk ? "SQLite-Pragmas, Cache + WAL alle perfekt." :
               'Klick "Update" um automatisch zu optimieren.'}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={analyze} disabled={scanning || updating} style={btnSecondary()}>
              {scanning ? "⏳…" : "🔍 Analysieren"}
            </button>
            <button onClick={update} disabled={scanning || updating || !data}
              style={{ ...btnPrimary(), opacity: data && issues === 0 ? 0.7 : 1 }}>
              {updating ? "⏳…" : "⚡ Update"}
            </button>
            <button onClick={logout} style={btnGhost()}>
              ↩ Logout
            </button>
          </div>
        </div>
      </div>

      {/* Update-Ergebnisse */}
      {actions.length > 0 && (
        <div style={cardStyle()}>
          <h3 style={cardHeadingStyle()}>⚡ Update-Ergebnis</h3>
          {actions.map((a, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "8px 0",
              borderBottom: i < actions.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
            }}>
              <span style={{
                width: 24, height: 24, borderRadius: 999,
                background: a.ok ? "#10b981" : "#ef4444",
                color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 900, fontSize: 13, flexShrink: 0,
              }}>{a.ok ? "✓" : "✗"}</span>
              <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "#f1f1f5" }}>{a.label}</div>
              {a.error && <span style={{ fontSize: 11, color: "#fca5a5" }}>{a.error}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Pragma-Status */}
      {data?.pragmas && (
        <>
          <h2 style={sectionHeadingStyle()}>⚙ SQLite-Pragmas</h2>
          <div style={cardStyle()}>
            {data.pragmas.map((p, i) => (
              <PragmaRow key={p.key} pragma={p} isLast={i === data.pragmas.length - 1} />
            ))}
          </div>
        </>
      )}

      {/* DB-Größe */}
      {data?.dbSize && (
        <>
          <h2 style={sectionHeadingStyle()}>💾 Datenbank-Größe</h2>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12, marginBottom: 16,
          }}>
            <StatCard label="DB-Größe" value={`${data.dbSize.sizeMb} MB`} sub={`${data.dbSize.pages} Pages`} />
            <StatCard label="Freilassbar" value={`${data.dbSize.freeMb} MB`} sub={`${data.dbSize.freePages} freie Pages`} />
            {data.dbSize.tableCount && <StatCard label="Tabellen" value={data.dbSize.tableCount} />}
            {data.dbSize.indexCount && <StatCard label="Indizes" value={data.dbSize.indexCount} />}
          </div>
        </>
      )}

      {/* Erklärungen */}
      <h2 style={sectionHeadingStyle()}>💡 Was bewirken die Optimierungen?</h2>
      <div style={cardStyle()}>
        <ExplainItem label="synchronous=NORMAL"
          text="2-3× schnellere Writes ohne nennenswerte Crash-Gefahr in WAL-Mode" />
        <ExplainItem label="cache_size=16MB"
          text="Mehr Pages im RAM → weniger Disk-Reads bei wiederholten Queries" />
        <ExplainItem label="temp_store=MEMORY"
          text="Temporäre Tabellen im RAM statt auf Disk" />
        <ExplainItem label="mmap_size=256MB"
          text="Direct-Memory-Read der DB-Datei statt File-I/O" />
        <ExplainItem label="ANALYZE"
          text="Aktualisiert Index-Statistiken → Query-Planer wählt bessere Pläne" />
        <ExplainItem label="VACUUM"
          text="Gibt unbenutzten Speicher an OS zurück" />
        <ExplainItem label="WAL-Checkpoint"
          text="Verkleinert die .wal-Datei (kann mit der Zeit GB groß werden)" />
      </div>
    </div>
  );

  async function logout() {
    try {
      await fetch("/api/admin/logout", { method: "POST", credentials: "include" });
    } catch {}
    window.location.href = "/admin/performance";
  }
}

function PragmaRow({ pragma, isLast }) {
  const ok = pragma.ok !== false;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "12px 16px",
      borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.06)",
    }}>
      <span style={{
        width: 26, height: 26, borderRadius: 999,
        background: ok ? "#10b981" : "#f59e0b",
        color: "#fff", display: "inline-flex",
        alignItems: "center", justifyContent: "center",
        fontWeight: 900, fontSize: 14, flexShrink: 0,
      }}>{ok ? "✓" : "!"}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f1f5" }}>{pragma.label || pragma.key}</div>
        {pragma.detail && (
          <div style={{ fontSize: 12, color: "rgba(241,241,245,0.7)", marginTop: 2 }}>{pragma.detail}</div>
        )}
      </div>
      <code style={{
        fontSize: 12, fontFamily: "ui-monospace, Menlo, monospace",
        color: "rgba(241,241,245,0.55)",
        background: "rgba(255,255,255,0.05)",
        padding: "2px 8px", borderRadius: 6,
      }}>{String(pragma.value ?? "—")}</code>
    </div>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <div style={{
      ...cardStyle(),
      padding: 16,
    }}>
      <div style={{
        fontSize: 10, fontWeight: 800,
        color: "rgba(241,241,245,0.55)",
        letterSpacing: "0.06em", textTransform: "uppercase",
      }}>{label}</div>
      <div style={{
        fontSize: 26, fontWeight: 900,
        color: "#f1f1f5", marginTop: 4, lineHeight: 1.1,
      }}>{value}</div>
      {sub && (
        <div style={{ fontSize: 11, color: "rgba(241,241,245,0.5)", marginTop: 4 }}>{sub}</div>
      )}
    </div>
  );
}

function ExplainItem({ label, text }) {
  return (
    <div style={{
      padding: "10px 14px",
      borderLeft: "3px solid rgba(168,85,247,0.4)",
      marginBottom: 8,
    }}>
      <code style={{
        fontSize: 12, fontFamily: "ui-monospace, Menlo, monospace",
        color: "#a855f7", fontWeight: 700,
      }}>{label}:</code>
      <span style={{
        marginLeft: 6,
        fontSize: 13, color: "#f1f1f5", lineHeight: 1.5,
      }}>{text}</span>
    </div>
  );
}

function cardStyle() {
  return {
    background: "rgba(18,18,30,0.6)",
    backdropFilter: "blur(12px)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 14, padding: 18, marginBottom: 16,
    color: "#f1f1f5",
  };
}

function cardHeadingStyle() {
  return { margin: "0 0 12px", fontSize: 15, fontWeight: 900, color: "#f1f1f5" };
}

function sectionHeadingStyle() {
  return {
    fontSize: 18, marginTop: 18, marginBottom: 10,
    color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.5)",
  };
}

function btnPrimary() {
  return {
    padding: "10px 18px",
    background: "linear-gradient(135deg, #ec4899, #a855f7)",
    color: "#fff", border: "none", borderRadius: 10,
    fontSize: 13, fontWeight: 800,
    cursor: "pointer", fontFamily: "inherit",
    boxShadow: "0 4px 12px rgba(168,85,247,0.3)",
  };
}

function btnSecondary() {
  return {
    padding: "10px 18px",
    background: "rgba(255,255,255,0.1)",
    color: "#fff", border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: 10,
    fontSize: 13, fontWeight: 700,
    cursor: "pointer", fontFamily: "inherit",
  };
}

function btnGhost() {
  return {
    padding: "10px 14px",
    background: "transparent",
    color: "rgba(255,255,255,0.6)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 10,
    fontSize: 12, fontWeight: 600,
    cursor: "pointer", fontFamily: "inherit",
  };
}
