"use client";

// 🛡 Wartungs- und Sicherheits-Center.

import { useEffect, useState } from "react";

const PW_KEY = "vv_admin_pw";

export default function WartungPage() {
  const [pw, setPw] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionResult, setActionResult] = useState(null);
  const [tab, setTab] = useState("system");

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(PW_KEY);
      if (saved) { setPw(saved); setUnlocked(true); }
    } catch {}
  }, []);

  useEffect(() => { if (unlocked) refresh(); }, [unlocked]); // eslint-disable-line

  async function refresh() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/wartung", {
        headers: { "x-admin-password": pw },
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setData({ error: d.error || `HTTP ${r.status}` });
      } else {
        setData(await r.json());
      }
    } catch (e) {
      setData({ error: e.message });
    } finally {
      setLoading(false);
    }
  }

  async function runAction(action, extra = {}) {
    setActionResult({ pending: action });
    try {
      const r = await fetch("/api/admin/wartung/run", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-password": pw },
        body: JSON.stringify({ action, ...extra }),
      });
      const d = await r.json();
      setActionResult({ ...d, action });
      await refresh();
    } catch (e) {
      setActionResult({ ok: false, message: e.message, action });
    }
  }

  function unlock(e) {
    e.preventDefault();
    if (!pw.trim()) return;
    try { sessionStorage.setItem(PW_KEY, pw); } catch {}
    setUnlocked(true);
  }
  function lock() {
    try { sessionStorage.removeItem(PW_KEY); } catch {}
    setPw(""); setUnlocked(false); setData(null);
  }

  if (!unlocked) {
    return (
      <div style={shellStyle}>
        <Hero />
        <Card>
          <h2 style={{ marginTop: 0 }}>🔐 Admin-Login</h2>
          <form onSubmit={unlock}>
            <input type="password" value={pw} onChange={(e) => setPw(e.target.value)}
              placeholder="Admin-Passwort" autoFocus style={inputStyle} />
            <button type="submit" style={primaryBtn}>🔓 Entsperren</button>
          </form>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={shellStyle}>
        <Hero />
        <Card><div style={{ textAlign: "center", color: "#64748b" }}>⏳ Lade Diagnose…</div></Card>
      </div>
    );
  }
  if (data.error) {
    return (
      <div style={shellStyle}>
        <Hero />
        <Card>
          <div style={{ color: "#991b1b", fontWeight: 700, marginBottom: 10 }}>⚠ {data.error}</div>
          <button onClick={lock} style={primaryBtn}>🔒 Neu einloggen</button>
        </Card>
      </div>
    );
  }

  return (
    <div style={shellStyle}>
      <Hero />

      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <button onClick={refresh} disabled={loading} style={primaryBtn}>
          {loading ? "⏳ Lade…" : "🔄 Alles erneut prüfen"}
        </button>
        <button onClick={lock} style={ghostBtn}>🔒 Sperren</button>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        {[
          { id: "system",     label: "📊 System" },
          { id: "security",   label: "🛡 Sicherheit" },
          { id: "cleanup",    label: "🧹 Aufräumen" },
          { id: "env",        label: "🔑 ENV-Variablen" },
          { id: "log",        label: "📜 Wartungs-Log" },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={tab === t.id ? activeTab : tabBtn}>{t.label}</button>
        ))}
      </div>

      {actionResult && (
        <Card style={{
          background: actionResult.ok === false ? "#fee2e2" : actionResult.pending ? "#fef9c3" : "#dcfce7",
          marginBottom: 12,
        }}>
          <b>{actionResult.pending ? "⏳ Läuft" : actionResult.ok ? "✓ Erfolg" : "⚠ Fehler"}: </b>
          {actionResult.message || actionResult.action || actionResult.pending}
        </Card>
      )}

      {tab === "system" && <SystemTab data={data} />}
      {tab === "security" && <SecurityTab data={data} onUnban={(ip) => runAction("unban-ip", { ip })} />}
      {tab === "cleanup" && <CleanupTab data={data} run={runAction} />}
      {tab === "env" && <EnvTab data={data} />}
      {tab === "log" && <LogTab data={data} />}
    </div>
  );
}

function SystemTab({ data }) {
  const sys = data.system;
  return (
    <>
      <Card>
        <h3 style={h3}>🩺 DB-Integrität</h3>
        <StatusRow ok={sys.integrity.ok} text={sys.integrity.ok ? "OK — keine Korruption" : `⚠ ${sys.integrity.details}`} />
      </Card>
      <Card>
        <h3 style={h3}>💾 Datenbank-Größe</h3>
        <KV k="Gesamtgröße" v={fmtBytes(sys.stats.sizeBytes)} />
        <KV k="Pages" v={`${sys.stats.pageCount.toLocaleString("de-DE")} × ${sys.stats.pageSize} B`} />
        <KV k="Tabellen" v={sys.stats.tableCount} />
      </Card>
      <Card>
        <h3 style={h3}>📋 Top-Tabellen (nach Zeilen)</h3>
        {Object.entries(sys.stats.counts)
          .sort((a, b) => Number(b[1]) - Number(a[1]))
          .slice(0, 15)
          .map(([name, n]) => <KV key={name} k={name} v={Number(n).toLocaleString("de-DE")} />)}
      </Card>
      <Card>
        <h3 style={h3}>⚠ Aufräum-Kandidaten</h3>
        <KV k="Abgelaufene Sessions" v={sys.expiredSessions} bad={sys.expiredSessions > 100} />
        <KV k="Verwaiste Fotos" v={sys.orphanPhotos} bad={sys.orphanPhotos > 0} />
        <KV k="Verwaiste Com-Mitgliedschaften" v={sys.orphanGroupMembers} bad={sys.orphanGroupMembers > 0} />
      </Card>
    </>
  );
}

function SecurityTab({ data, onUnban }) {
  const sec = data.security;
  const wl = sec.attackStats24h;
  return (
    <>
      <Card>
        <h3 style={h3}>🛡 Bann-Statistik</h3>
        <KV k="Gesamt gebannte IPs" v={sec.permabanCount} good={sec.permabanCount > 0} />
        <KV k="Angriffe letzte 24h" v={wl.total} bad={wl.total > 0} />
        <KV k="Verschiedene IPs (24h)" v={wl.uniqueIps} />
        <KV k="Angriffe letzte 7 Tage" v={sec.attackStats7d.total} />
      </Card>
      {wl.byPattern && wl.byPattern.length > 0 && (
        <Card>
          <h3 style={h3}>🔍 Top-Angriffsmuster (24h)</h3>
          {wl.byPattern.map((p, i) => (
            <KV key={i} k={p.pattern} v={p.c} />
          ))}
        </Card>
      )}
      {sec.recentAttacks && sec.recentAttacks.length > 0 && (
        <Card>
          <h3 style={h3}>📡 Letzte Angriffe (max 20)</h3>
          {sec.recentAttacks.map((a) => (
            <div key={a.id} style={attackRow}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#dc2626" }}>{a.pattern}</div>
              <div style={{ fontSize: 11, color: "#475569", fontFamily: "monospace" }}>
                {a.ip} · {a.method} {a.path}
              </div>
              {a.payload && (
                <div style={{
                  fontSize: 10.5, color: "#78350f", background: "#fef9c3",
                  padding: "3px 6px", borderRadius: 4, marginTop: 3,
                  fontFamily: "monospace", wordBreak: "break-all",
                }}>{a.payload.slice(0, 200)}</div>
              )}
              <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 3 }}>
                {new Date(a.ts).toLocaleString("de-DE")} {a.banned ? "· 🚫 gebannt" : ""}
              </div>
            </div>
          ))}
        </Card>
      )}
      {sec.recentPermabans && sec.recentPermabans.length > 0 && (
        <Card>
          <h3 style={h3}>🚫 Gebannte IPs (max 20) — unwiderruflich, außer du entbannst</h3>
          {sec.recentPermabans.map((p) => (
            <div key={p.ip} style={attackRow}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <code style={{ fontWeight: 800 }}>{p.ip}</code>
                <span style={{ flex: 1 }} />
                <button onClick={() => onUnban(p.ip)} style={ghostBtn}>↩ Entbannen</button>
              </div>
              <div style={{ fontSize: 11, color: "#475569" }}>
                {p.reason} · {new Date(p.bannedAt).toLocaleString("de-DE")}
              </div>
              {p.path && (
                <div style={{ fontSize: 10.5, color: "#475569", fontFamily: "monospace" }}>
                  {p.method} {p.path}
                </div>
              )}
            </div>
          ))}
        </Card>
      )}
    </>
  );
}

function CleanupTab({ data, run }) {
  const sys = data.system;
  return (
    <>
      <Card>
        <h3 style={h3}>🧹 Aufräum-Aktionen</h3>
        <p style={muted}>Alle Aktionen sind sofort wirksam. Vorher Backup empfohlen für VACUUM.</p>
        <CleanupBtn
          label="🗑 Abgelaufene Sessions entfernen"
          hint={`${sys.expiredSessions} Stück zu entfernen`}
          onClick={() => run("cleanup-sessions")}
        />
        <CleanupBtn
          label="📸 Verwaiste Fotos entfernen"
          hint={`${sys.orphanPhotos} Stück (User wurde gelöscht, Foto blieb)`}
          onClick={() => run("cleanup-orphan-photos")}
          disabled={sys.orphanPhotos === 0}
        />
        <CleanupBtn
          label="👥 Verwaiste Com-Mitgliedschaften entfernen"
          hint={`${sys.orphanGroupMembers} Stück`}
          onClick={() => run("cleanup-orphan-members")}
          disabled={sys.orphanGroupMembers === 0}
        />
        <CleanupBtn
          label="💾 WAL-Checkpoint (Disk-Cache leeren)"
          hint="Komprimiert SQLite-Write-Ahead-Log"
          onClick={() => run("wal-checkpoint")}
        />
        <CleanupBtn
          label="🧬 VACUUM — Datenbank defragmentieren"
          hint="Kann mehrere Sekunden dauern bei großer DB"
          onClick={() => {
            if (confirm("VACUUM defragmentiert die ganze DB. Kann ein paar Sek dauern. Wirklich starten?")) run("vacuum");
          }}
        />
      </Card>
    </>
  );
}

function EnvTab({ data }) {
  const e = data.env;
  return (
    <>
      <Card>
        <h3 style={h3}>🔐 Kritische ENV-Variablen</h3>
        {e.critical.map((v) => (
          <KV key={v.key} k={v.key} v={v.set ? `✓ gesetzt (${v.length} Z.)` : "❌ FEHLT"} bad={!v.set} />
        ))}
      </Card>
      <Card>
        <h3 style={h3}>🔧 Optionale ENV-Variablen</h3>
        {e.optional.map((v) => (
          <KV key={v.key} k={v.key} v={v.set ? `✓ gesetzt (${v.length} Z.)` : "—"} />
        ))}
      </Card>
      <Card>
        <h3 style={h3}>ℹ Hinweise</h3>
        <ul style={{ color: "#475569", fontSize: 13, lineHeight: 1.6, paddingLeft: 18 }}>
          <li><b>VV_ADMIN_PASSWORD</b> — pflicht, sonst kein Admin-Zugang</li>
          <li><b>VV_TOKEN_KEY</b> — pflicht, sonst keine Session-Auth</li>
          <li><b>VV_INTERNAL_TOKEN</b> — pflicht für Hacker-Auto-Bann, sonst Middleware kann nicht schreiben</li>
          <li><b>VV_ADMIN_IPS</b> — Komma-getrennte Liste IPs die nie gebannt werden (deine Heim-IP)</li>
          <li><b>STRIPE_***</b> — nur nötig wenn Echtgeld-Käufe aktiv</li>
          <li><b>GEMINI_API_KEY</b> — nur nötig für Fidolin AI-Moderation</li>
        </ul>
      </Card>
    </>
  );
}

function LogTab({ data }) {
  return (
    <Card>
      <h3 style={h3}>📜 Letzte Wartungs-Aktionen</h3>
      {data.maintenanceLog.length === 0 && (
        <div style={muted}>Noch keine Wartungs-Aktionen geloggt.</div>
      )}
      {data.maintenanceLog.map((m) => (
        <div key={m.id} style={attackRow}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontWeight: 800 }}>{m.action}</span>
            <span style={{
              fontSize: 11, padding: "2px 8px", borderRadius: 999,
              background: m.result === "ok" ? "#dcfce7" : "#fee2e2",
              color: m.result === "ok" ? "#166534" : "#991b1b",
            }}>{m.result}</span>
            <span style={{ marginLeft: "auto", fontSize: 11, color: "#94a3b8" }}>
              {new Date(m.ts).toLocaleString("de-DE")} · {m.durationMs}ms
            </span>
          </div>
          {m.details && <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>{m.details}</div>}
        </div>
      ))}
    </Card>
  );
}

// === UI Bits ===

function Hero() {
  return (
    <div style={{
      background: "linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899)",
      backgroundSize: "200% 200%",
      animation: "vv-wartung-shift 10s ease infinite",
      color: "#fff", padding: "20px 18px",
      borderRadius: 16, marginBottom: 14,
      boxShadow: "0 8px 24px rgba(139,92,246,0.35)",
    }}>
      <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.9, letterSpacing: 1.2, textTransform: "uppercase" }}>
        Admin · Wartung & Sicherheit
      </div>
      <h1 style={{ margin: "4px 0 4px", fontSize: 24, fontWeight: 900, textShadow: "0 2px 6px rgba(0,0,0,0.2)" }}>
        🛡 Selbst-Diagnose
      </h1>
      <div style={{ fontSize: 13, opacity: 0.95 }}>
        Health-Checks, Angriff-Log, Aufräumen. Alles auf einen Blick.
      </div>
      <style>{`@keyframes vv-wartung-shift { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }`}</style>
    </div>
  );
}

function Card({ children, style }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.95)",
      borderRadius: 14, padding: 14, marginBottom: 12,
      border: "1px solid rgba(0,0,0,0.06)",
      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      ...style,
    }}>{children}</div>
  );
}

function KV({ k, v, bad, good }) {
  return (
    <div style={{
      display: "flex", padding: "5px 0", gap: 8,
      borderBottom: "1px solid #f1f5f9",
      fontSize: 13,
    }}>
      <span style={{ color: "#475569", flex: 1 }}>{k}</span>
      <span style={{
        color: bad ? "#dc2626" : good ? "#16a34a" : "#1f2937",
        fontWeight: bad || good ? 800 : 600,
        fontFamily: "monospace",
      }}>{v}</span>
    </div>
  );
}

function StatusRow({ ok, text }) {
  return (
    <div style={{
      background: ok ? "#dcfce7" : "#fee2e2",
      color: ok ? "#166534" : "#991b1b",
      padding: 10, borderRadius: 10, fontWeight: 700, fontSize: 13,
    }}>{ok ? "✓ " : "⚠ "}{text}</div>
  );
}

function CleanupBtn({ label, hint, onClick, disabled }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: "#1f2937" }}>{label}</div>
        <div style={{ fontSize: 11, color: "#64748b" }}>{hint}</div>
      </div>
      <button onClick={onClick} disabled={disabled} style={{
        ...primaryBtn,
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}>▶ Ausführen</button>
    </div>
  );
}

function fmtBytes(b) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
  return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

const shellStyle = { maxWidth: 760, margin: "0 auto", padding: "12px 12px 100px" };
const inputStyle = {
  width: "100%", padding: "10px 12px",
  borderRadius: 10, border: "1px solid rgba(0,0,0,0.12)",
  fontSize: 14, fontFamily: "inherit", marginBottom: 8,
};
const primaryBtn = {
  background: "linear-gradient(135deg, #ec4899, #8b5cf6)",
  color: "#fff", border: "none",
  padding: "9px 16px", borderRadius: 999,
  fontWeight: 800, fontSize: 13, cursor: "pointer",
  boxShadow: "0 4px 12px rgba(139,92,246,0.35)",
};
const ghostBtn = {
  background: "#f1f5f9", color: "#475569",
  border: "1px solid rgba(0,0,0,0.06)",
  padding: "7px 14px", borderRadius: 999,
  fontWeight: 700, fontSize: 12, cursor: "pointer",
};
const tabBtn = {
  background: "rgba(255,255,255,0.8)",
  color: "#475569", border: "1px solid rgba(0,0,0,0.06)",
  padding: "7px 14px", borderRadius: 999,
  fontWeight: 700, fontSize: 12, cursor: "pointer",
};
const activeTab = {
  ...tabBtn,
  background: "linear-gradient(135deg, #ec4899, #8b5cf6)",
  color: "#fff", border: "none",
  boxShadow: "0 2px 8px rgba(139,92,246,0.35)",
};
const h3 = { marginTop: 0, marginBottom: 8, fontSize: 14, color: "#1f2937" };
const muted = { color: "#64748b", fontSize: 12, marginBottom: 8 };
const attackRow = {
  padding: "8px 10px", borderRadius: 8,
  background: "#f8fafc", marginBottom: 6,
  border: "1px solid #e2e8f0",
};
