"use client";

import { useState } from "react";
import { api } from "@/lib/api";

export default function TwoFactorSetup({ has2fa, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(has2fa ? "active" : "idle");
  const [secret, setSecret] = useState("");
  const [grouped, setGrouped] = useState("");
  const [uri, setUri] = useState("");
  const [code, setCode] = useState("");
  const [disablePw, setDisablePw] = useState("");

  async function start() {
    setError(""); setBusy(true);
    try {
      const r = await api.twoFaSetup();
      setSecret(r.secret); setGrouped(r.grouped); setUri(r.uri);
      setStep("setup");
    } catch (e) {
      setError(e.message);
    } finally { setBusy(false); }
  }

  async function enable(e) {
    e.preventDefault();
    setError(""); setBusy(true);
    try {
      await api.twoFaEnable(code);
      setCode("");
      setStep("active");
      onChanged?.();
    } catch (e) {
      setError(e.message);
    } finally { setBusy(false); }
  }

  async function disable(e) {
    e.preventDefault();
    setError(""); setBusy(true);
    try {
      await api.twoFaDisable(disablePw, code);
      setDisablePw(""); setCode("");
      setStep("idle");
      onChanged?.();
    } catch (e) {
      setError(e.message);
    } finally { setBusy(false); }
  }

  return (
    <div className="vv-card">
      <h3>🛡️ Zwei-Faktor-Authentifizierung (TOTP)</h3>
      <p className="vv-muted" style={{ fontSize: 12 }}>
        Schützt deinen Account auch dann, wenn jemand dein Passwort kennt.
        Du brauchst eine Authenticator-App auf dem Handy:
        <em> Google Authenticator, Authy, 1Password, Aegis</em> oder ähnlich.
      </p>

      {step === "active" && (
        <>
          <div style={{ background: "#e7fff0", border: "1px solid #b8e5c8", color: "#0d8a3f", padding: 10, borderRadius: 10, marginTop: 8, fontSize: 13 }}>
            ✅ 2FA ist aktiv. Beim nächsten Login fragen wir den 6-stelligen Code ab.
          </div>
          <form onSubmit={disable} style={{ marginTop: 12 }}>
            <label><strong>Aktuelles Passwort</strong></label>
            <input type="password" className="vv-input" value={disablePw} onChange={(e) => setDisablePw(e.target.value)} autoComplete="current-password" />
            <label className="vv-mt-12"><strong>Aktueller 2FA-Code</strong></label>
            <input
              type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6}
              className="vv-input" value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123 456"
              style={{ letterSpacing: 4, fontSize: 20, textAlign: "center" }}
            />
            {error && <div className="vv-mt-8" style={{ color: "#a00", fontWeight: "bold" }}>⚠ {error}</div>}
            <div className="vv-mt-12">
              <button type="submit" className="vv-btn" disabled={busy || !disablePw || code.length !== 6}>
                🔓 2FA deaktivieren
              </button>
            </div>
          </form>
        </>
      )}

      {step === "idle" && (
        <div className="vv-mt-12">
          <button type="button" className="vv-btn vv-btn-pink" disabled={busy} onClick={start}>
            🔐 2FA aktivieren
          </button>
          {error && <div className="vv-mt-8" style={{ color: "#a00", fontWeight: "bold" }}>⚠ {error}</div>}
        </div>
      )}

      {step === "setup" && (
        <form onSubmit={enable} style={{ marginTop: 12 }}>
          <div style={{ background: "#fff5fb", border: "1px solid #ffd6e7", padding: 12, borderRadius: 10 }}>
            <div style={{ fontSize: 13, marginBottom: 8 }}>
              <strong>1.</strong> Öffne deine Authenticator-App und tippe auf <em>„Konto hinzufügen"</em> → <em>„Schlüssel manuell eingeben"</em>.
            </div>
            <div style={{ fontSize: 12, color: "#555", marginBottom: 4 }}>Kontoname: <code>VibeVibo</code></div>
            <div style={{ fontSize: 12, color: "#555", marginBottom: 4 }}>Schlüsseltyp: <code>Zeitbasiert</code></div>
            <div style={{ fontSize: 12, color: "#555", marginBottom: 4 }}>
              Schlüssel:{" "}
              <code style={{ fontFamily: "Menlo,Consolas,monospace", fontSize: 13, fontWeight: "bold", letterSpacing: 1, background: "#fff", padding: "2px 6px", borderRadius: 4, userSelect: "all" }}>
                {grouped}
              </code>
            </div>
            <div className="vv-mt-12" style={{ fontSize: 12, color: "#555" }}>
              <strong>2.</strong> Auf dem Handy:{" "}
              <a href={uri} style={{ color: "#c2185b" }}>diesen Link tippen</a> – die meisten Apps fügen den Eintrag automatisch hinzu.
            </div>
            <div className="vv-mt-12" style={{ fontSize: 12, color: "#555" }}>
              <strong>3.</strong> Gib unten den 6-stelligen Code ein, den deine App anzeigt:
            </div>
          </div>

          <label className="vv-mt-12"><strong>Bestätigungs-Code</strong></label>
          <input
            type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6}
            className="vv-input" value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="123 456" autoFocus
            style={{ letterSpacing: 4, fontSize: 22, textAlign: "center" }}
          />
          {error && <div className="vv-mt-8" style={{ color: "#a00", fontWeight: "bold" }}>⚠ {error}</div>}
          <div className="vv-mt-12 vv-row">
            <button type="button" className="vv-btn" onClick={() => setStep("idle")} disabled={busy}>↩ Abbrechen</button>
            <div className="vv-spacer" />
            <button type="submit" className="vv-btn vv-btn-pink" disabled={busy || code.length !== 6}>
              ✓ Aktivieren
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
