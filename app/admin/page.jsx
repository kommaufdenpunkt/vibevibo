"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { relTime } from "@/lib/format";

export default function AdminPage() {
  const [pw, setPw] = useState("");          // Eingabefeld
  const [authedPw, setAuthedPw] = useState(null); // gültiges Passwort (im Memory)
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [ipInput, setIpInput] = useState("");

  async function reload(passwordToUse) {
    const p = passwordToUse || authedPw;
    if (!p) return;
    const d = await api.adminData(p);
    setData(d);
    setAuthedPw(p);
  }

  async function login(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await reload(pw);   // lädt Daten direkt mit dem eingegebenen Passwort
      setPw("");
    } catch (err) {
      setError(err.message || "Login fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    setAuthedPw(null);
    setData(null);
  }

  async function act(username, action, ip) {
    if (action === "reject" && !confirm(`Anmeldung von "${username}" ablehnen & löschen?`)) return;
    try {
      await api.adminUserAction(authedPw, username, action, ip);
      await reload();
    } catch (e) { alert(e.message); }
  }

  async function ipAct(ip, action, reason) {
    try {
      await api.adminIpAction(authedPw, ip, action, reason);
      setIpInput("");
      await reload();
    } catch (e) { alert(e.message); }
  }

  // ----- Login-Maske -----
  if (!authedPw || !data) {
    return (
      <div className="vv-card vv-login-card">
        <h2>🔐 VibeVibo Admin</h2>
        <form onSubmit={login}>
          <label>Admin-Passwort</label>
          <input
            type="password"
            className="vv-input"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            autoFocus
            autoComplete="current-password"
          />
          {error && <div className="vv-mt-8" style={{ color: "#a00", fontWeight: "bold" }}>⚠ {error}</div>}
          <div className="vv-mt-12">
            <button type="submit" className="vv-btn vv-btn-pink" disabled={busy}>
              {busy ? "…" : "▶ Anmelden"}
            </button>
          </div>
        </form>
        <p className="vv-muted vv-mt-12">
          Das Passwort wird in Coolify als <code>VV_ADMIN_PASSWORD</code> gesetzt.
        </p>
      </div>
    );
  }

  // ----- Dashboard -----
  const { stats, pending, approved, blocked, blockedIps } = data;

  return (
    <>
      <div className="vv-card">
        <div className="vv-row">
          <h2 style={{ flex: 1, margin: 0 }}>🔐 Admin-Dashboard</h2>
          <button className="vv-btn" onClick={() => reload()}>↻ Aktualisieren</button>
          <button className="vv-btn" onClick={logout}>↩ Logout</button>
        </div>
        <ul className="vv-profile-stats vv-mt-12">
          <li><strong>{stats.pending}</strong>Warteliste</li>
          <li><strong>{stats.approved}</strong>Aktiv</li>
          <li><strong>{stats.blocked}</strong>Gesperrt</li>
          <li><strong>{stats.blockedIps}</strong>IP-Sperren</li>
        </ul>
      </div>

      <div className="vv-card">
        <h3>⏳ Warteliste ({pending.length})</h3>
        {pending.length === 0 ? (
          <div className="vv-muted vv-center" style={{ padding: 14 }}>Niemand wartet gerade.</div>
        ) : (
          pending.map((u) => (
            <div className="vv-admin-row" key={u.username}>
              <div className="vv-avatar vv-avatar-sm">{u.emoji}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong>{u.displayName}</strong> <span className="vv-muted">@{u.username}</span>
                <div className="vv-muted" style={{ fontSize: 11 }}>IP: {u.regIp || "?"} · {relTime(u.createdAt)}</div>
              </div>
              <button className="vv-btn vv-btn-pink" onClick={() => act(u.username, "approve")}>✓ Frei</button>
              <button className="vv-btn" onClick={() => act(u.username, "reject", u.regIp)}>✕ +IP-Sperre</button>
            </div>
          ))
        )}
      </div>

      <div className="vv-card">
        <h3>✅ Aktive Mitglieder ({approved.length})</h3>
        {approved.length === 0 && <div className="vv-muted">Noch keine.</div>}
        {approved.map((u) => (
          <div className="vv-admin-row" key={u.username}>
            <div className="vv-avatar vv-avatar-sm">{u.emoji}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <strong>{u.displayName}</strong> <span className="vv-muted">@{u.username}</span>
            </div>
            <button className="vv-btn" onClick={() => act(u.username, "block", u.regIp)}>🚫 Sperren</button>
          </div>
        ))}
      </div>

      {blocked.length > 0 && (
        <div className="vv-card">
          <h3>🚫 Gesperrte Accounts ({blocked.length})</h3>
          {blocked.map((u) => (
            <div className="vv-admin-row" key={u.username}>
              <div style={{ flex: 1 }}><strong>{u.displayName}</strong> <span className="vv-muted">@{u.username}</span></div>
              <button className="vv-btn vv-btn-pink" onClick={() => act(u.username, "approve")}>✓ Entsperren</button>
            </div>
          ))}
        </div>
      )}

      <div className="vv-card">
        <h3>⛔ IP-Blacklist ({blockedIps.length})</h3>
        <div className="vv-row vv-mt-8">
          <input className="vv-input" placeholder="IP-Adresse sperren..." value={ipInput} onChange={(e) => setIpInput(e.target.value)} />
          <button className="vv-btn vv-btn-pink" onClick={() => ipAct(ipInput, "block", "manuell")}>Sperren</button>
        </div>
        <div className="vv-mt-12">
          {blockedIps.length === 0 && <div className="vv-muted">Keine gesperrten IPs.</div>}
          {blockedIps.map((b) => (
            <div className="vv-admin-row" key={b.ip}>
              <div style={{ flex: 1 }}><code>{b.ip}</code> <span className="vv-muted">{b.reason} · {relTime(b.at)}</span></div>
              <button className="vv-btn" onClick={() => ipAct(b.ip, "unblock")}>Entsperren</button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
