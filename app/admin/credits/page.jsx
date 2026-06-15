"use client";

// 💰 Admin-Credits — Vibes gutschreiben/abziehen per Browser-Formular.

import { useEffect, useState } from "react";

const PW_KEY = "vv_admin_pw";

export default function AdminCreditsPage() {
  const [pw, setPw] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [username, setUsername] = useState("");
  const [amount, setAmount] = useState(55);
  const [reason, setReason] = useState("admin_grant");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(PW_KEY);
      if (saved) { setPw(saved); setUnlocked(true); }
    } catch {}
  }, []);

  function unlock(e) {
    e.preventDefault();
    if (!pw.trim()) return;
    try { sessionStorage.setItem(PW_KEY, pw); } catch {}
    setUnlocked(true);
  }

  function clearPw() {
    try { sessionStorage.removeItem(PW_KEY); } catch {}
    setPw(""); setUnlocked(false); setResult(null);
  }

  async function grant(e) {
    e.preventDefault();
    if (!username.trim() || !amount) return;
    setBusy(true); setResult(null);
    try {
      const r = await fetch(
        `/api/admin/grant-credits`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-password": pw,
          },
          body: JSON.stringify({
            username: username.trim(),
            amount: Number(amount),
            reason: reason.trim() || "admin_grant",
          }),
        }
      );
      const d = await r.json();
      if (!r.ok) {
        setResult({ ok: false, error: d.error || `HTTP ${r.status}` });
      } else {
        setResult({ ok: true, ...d });
        setHistory((h) => [{ ...d, at: Date.now() }, ...h].slice(0, 10));
      }
    } catch (e) {
      setResult({ ok: false, error: e.message });
    } finally {
      setBusy(false);
    }
  }

  if (!unlocked) {
    return (
      <div style={shellStyle}>
        <Hero />
        <div style={cardStyle}>
          <h2 style={{ marginTop: 0, color: "#1f2937" }}>🔐 Admin-Login</h2>
          <p style={{ color: "#64748b", fontSize: 13 }}>
            Trag dein <code>VV_ADMIN_PASSWORD</code> aus Coolify-ENV ein. Wird in
            sessionStorage gespeichert (überlebt Reload, nicht Tab-Schließen).
          </p>
          <form onSubmit={unlock}>
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="Admin-Passwort"
              autoFocus
              style={inputStyle}
            />
            <button type="submit" style={primaryBtnStyle}>
              🔓 Entsperren
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={shellStyle}>
      <Hero />

      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
          <h2 style={{ margin: 0, color: "#1f2937", flex: 1 }}>✨ Vibes gutschreiben</h2>
          <button onClick={clearPw} style={ghostBtnStyle}>🔒 Sperren</button>
        </div>

        <form onSubmit={grant}>
          <Field label="👤 Username (ohne @)">
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="z.B. gino"
              required
              autoFocus
              style={inputStyle}
            />
          </Field>

          <Field label="✨ Vibes (negativ = abziehen, max ±100000)">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              style={inputStyle}
            />
          </Field>

          <Field label="📝 Begründung (optional, in der Tx-Log)">
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="admin_grant"
              style={inputStyle}
            />
          </Field>

          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button type="submit" disabled={busy} style={{
              ...primaryBtnStyle,
              opacity: busy ? 0.6 : 1,
              cursor: busy ? "wait" : "pointer",
            }}>
              {busy ? "Buche…" : (
                amount > 0 ? `+ ${amount} ✨ gutschreiben` : `− ${Math.abs(amount)} ✨ abziehen`
              )}
            </button>
            {[55, 100, 500, 1000].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setAmount(preset)}
                style={presetBtnStyle}
              >+{preset}</button>
            ))}
          </div>
        </form>

        {result && (
          <div style={{
            marginTop: 14, padding: 12, borderRadius: 10,
            background: result.ok ? "#dcfce7" : "#fee2e2",
            color: result.ok ? "#166534" : "#991b1b",
            fontSize: 13, fontWeight: 700,
          }}>
            {result.ok ? (
              <>
                ✓ <b>{result.granted > 0 ? "+" : ""}{result.granted} ✨</b> an{" "}
                <b>@{result.username}</b> · Neuer Saldo: <b>{result.newBalance} ✨</b>
              </>
            ) : (
              <>⚠ Fehler: {result.error}</>
            )}
          </div>
        )}
      </div>

      {history.length > 0 && (
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0, color: "#1f2937" }}>📜 Letzte Buchungen (Session)</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {history.map((h, i) => (
              <div key={i} style={{
                fontSize: 12, color: "#475569",
                padding: "6px 10px", borderRadius: 8,
                background: "#f1f5f9", display: "flex", gap: 8,
              }}>
                <span style={{ color: "#94a3b8" }}>{new Date(h.at).toLocaleTimeString("de-DE")}</span>
                <span><b>@{h.username}</b></span>
                <span style={{ color: h.granted > 0 ? "#16a34a" : "#dc2626", fontWeight: 800 }}>
                  {h.granted > 0 ? "+" : ""}{h.granted} ✨
                </span>
                <span style={{ marginLeft: "auto", color: "#64748b" }}>= {h.newBalance} ✨</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ ...cardStyle, background: "#fef9c3", border: "1px solid #fde68a" }}>
        <h3 style={{ marginTop: 0, color: "#78350f" }}>🛡 Tipps</h3>
        <ul style={{ color: "#78350f", fontSize: 13, lineHeight: 1.7, margin: 0, paddingLeft: 18 }}>
          <li>Negativ-Beträge ziehen Vibes ab (z.B. <code>-50</code>)</li>
          <li>Max ±100.000 pro Buchung — größere Beträge in mehreren Schritten</li>
          <li>Begründung erscheint in der Tx-Historie unter <code>/profile/transactions</code></li>
          <li>Eingaben werden NICHT geloggt im Browser — nur via API</li>
        </ul>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <div style={{
      background: "linear-gradient(135deg, #fbbf24, #f59e0b, #d97706)",
      backgroundSize: "200% 200%",
      animation: "vv-credits-shift 8s ease infinite",
      color: "#fff", padding: "20px 18px",
      borderRadius: 16, marginBottom: 14,
      boxShadow: "0 6px 18px rgba(217,119,6,0.35)",
    }}>
      <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.9, letterSpacing: 1.2, textTransform: "uppercase" }}>
        Admin · Vibes-Tool
      </div>
      <h1 style={{
        margin: "4px 0 4px", fontSize: 26, fontWeight: 900,
        textShadow: "0 2px 6px rgba(0,0,0,0.2)",
      }}>
        ✨ Vibes-Gutschrift
      </h1>
      <div style={{ fontSize: 13, opacity: 0.95 }}>
        Schreibe einem User Vibes gut oder zieh sie ab — bequem im Browser.
      </div>
      <style>{`
        @keyframes vv-credits-shift {
          0%, 100% { background-position: 0% 50%; }
          50%      { background-position: 100% 50%; }
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: "block", marginTop: 10 }}>
      <div style={{
        fontSize: 11, fontWeight: 800, color: "#475569",
        letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 4,
      }}>{label}</div>
      {children}
    </label>
  );
}

const shellStyle = {
  maxWidth: 640,
  margin: "0 auto",
  padding: "12px 12px 100px",
};
const cardStyle = {
  background: "rgba(255,255,255,0.95)",
  backdropFilter: "blur(12px)",
  borderRadius: 14, padding: 14, marginBottom: 12,
  border: "1px solid rgba(0,0,0,0.06)",
  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
};
const inputStyle = {
  width: "100%", padding: "10px 12px",
  borderRadius: 10, border: "1px solid rgba(0,0,0,0.12)",
  fontSize: 14, fontFamily: "inherit",
  marginTop: 4,
};
const primaryBtnStyle = {
  background: "linear-gradient(135deg, #ec4899, #8b5cf6)",
  color: "#fff", border: "none",
  padding: "10px 18px", borderRadius: 999,
  fontWeight: 800, fontSize: 14, cursor: "pointer",
  boxShadow: "0 4px 12px rgba(139,92,246,0.35)",
};
const ghostBtnStyle = {
  background: "#f1f5f9", color: "#475569",
  border: "1px solid rgba(0,0,0,0.06)",
  padding: "6px 12px", borderRadius: 999,
  fontWeight: 700, fontSize: 11, cursor: "pointer",
};
const presetBtnStyle = {
  background: "#f1f5f9", color: "#475569",
  border: "1px solid rgba(0,0,0,0.06)",
  padding: "10px 14px", borderRadius: 999,
  fontWeight: 700, fontSize: 12, cursor: "pointer",
};
