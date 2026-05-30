"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useMe } from "@/lib/useMe";

const EMOJIS = ["🙂","😎","🌸","🛹","👑","🎮","💅","🎧","🦄","🌈","🔥","🌟","💖","🎀","🍀","⚡","🦋","☕"];

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useMe();
  const [mode, setMode] = useState("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [needsTotp, setNeedsTotp] = useState(false);
  const [totp, setTotp] = useState("");

  const [form, setForm] = useState({
    username: "",
    displayName: "",
    password: "",
    emoji: "🙂",
  });

  function up(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "login") {
        const res = await api.login(form.username, form.password, needsTotp ? totp : null);
        if (res?.needsTotp) {
          setNeedsTotp(true);
          setBusy(false);
          return;
        }
      } else {
        await api.register({
          username: form.username,
          displayName: form.displayName || form.username,
          password: form.password,
          emoji: form.emoji,
        });
      }
      await refresh();
      router.push("/profile");
      router.refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="vv-grid-2">
      <div className="vv-card vv-login-card">
        <h2>{mode === "login" ? "🔑 Einloggen" : "✿ Account erstellen"}</h2>
        <div className="vv-row vv-mt-8" style={{ marginBottom: 10 }}>
          <button
            type="button"
            className={`vv-btn ${mode === "login" ? "vv-btn-pink" : ""}`}
            onClick={() => { setMode("login"); setNeedsTotp(false); setTotp(""); }}
          >Login</button>
          <button
            type="button"
            className={`vv-btn ${mode === "register" ? "vv-btn-pink" : ""}`}
            onClick={() => { setMode("register"); setNeedsTotp(false); setTotp(""); }}
          >Registrieren</button>
        </div>
        <form onSubmit={submit}>
          <label>Benutzername</label>
          <input
            className="vv-input"
            placeholder="z.B. lisa_2003"
            value={form.username}
            onChange={(e) => up("username", e.target.value)}
            autoFocus
            disabled={needsTotp}
          />
          {mode === "register" && (
            <>
              <label>Anzeigename (optional)</label>
              <input
                className="vv-input"
                placeholder="z.B. Lisa* °·.¸"
                value={form.displayName}
                onChange={(e) => up("displayName", e.target.value)}
              />
              <label>Avatar-Emoji</label>
              <div className="vv-row" style={{ flexWrap: "wrap" }}>
                {EMOJIS.map((e) => (
                  <button
                    type="button"
                    key={e}
                    onClick={() => up("emoji", e)}
                    className="vv-smiley"
                    style={{
                      fontSize: 24,
                      outline: form.emoji === e ? "3px solid #ff3e9d" : "none",
                    }}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </>
          )}
          <label>Passwort</label>
          <input
            type="password"
            className="vv-input"
            value={form.password}
            onChange={(e) => up("password", e.target.value)}
            disabled={needsTotp}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
          {mode === "register" && (
            <div className="vv-muted vv-mt-8" style={{ fontSize: 11 }}>
              Mind. 10 Zeichen. Wir prüfen gegen bekannte Datenlecks (haveibeenpwned, sicher per k-Anonymity).
            </div>
          )}
          {needsTotp && (
            <>
              <label className="vv-mt-12">🔐 2FA-Code aus deiner Authenticator-App</label>
              <input
                type="text" inputMode="numeric" autoComplete="one-time-code"
                pattern="[0-9]{6}" maxLength={6}
                className="vv-input"
                value={totp}
                onChange={(e) => setTotp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123 456"
                autoFocus
                style={{ letterSpacing: 4, fontSize: 22, textAlign: "center" }}
              />
            </>
          )}
          {error && (
            <div className="vv-mt-8" style={{ color: "#a00", fontWeight: "bold" }}>
              ⚠ {error}
            </div>
          )}
          <div className="vv-mt-12">
            <button type="submit" className="vv-btn vv-btn-pink" disabled={busy || (needsTotp && totp.length !== 6)}>
              ▶ {mode === "login" ? (needsTotp ? "Code prüfen" : "Einloggen") : "Loslegen"}
            </button>
            {needsTotp && (
              <button type="button" className="vv-btn vv-mt-8" onClick={() => { setNeedsTotp(false); setTotp(""); setError(null); }}>
                ← zurück
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="vv-card">
        <h3>🌟 Willkommen zurück</h3>
        <p className="vv-muted">
          VibeVibo lebt vom nostalgischen Vibe — Profile mit Lieblingssong, Pinnwand,
          ICQ-Oh-Oh-Sound, Buschfunk und gemütliche Gruppenchats.
        </p>
        <div className="vv-mt-12" style={{ fontSize: 13 }}>
          <strong>Noch keinen Account?</strong>
          {" "}Klick oben links auf <em>Registrieren</em> — Fidolin (unsere KI-Moderation) hat
          ein Auge auf alles, damit hier niemand belästigt wird.
        </div>
        <div className="vv-mt-12 vv-muted" style={{ fontSize: 11 }}>
          🛡️ <strong>Sicherheit:</strong> Login-Versuche werden begrenzt. VPN/Tor-Verbindungen
          sind beim Registrieren nicht erlaubt. Wer hier mit Hacker-Absicht aufschlägt, wird
          protokolliert — Strafanzeige nach §§ 202a/202c StGB ist drin.
        </div>
      </div>
    </div>
  );
}
