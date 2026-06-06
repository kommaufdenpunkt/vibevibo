"use client";

// 🔑 LOGIN — komplett im 2007er-Style mit WordArt, Glitzer-Avatar und neon Vibes.
// Tabs für Login/Registrieren, 2FA, Emoji-Picker mit Animation, Mobile-First.

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
  const [showForgot, setShowForgot] = useState(false);

  function up(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  const SOCIAL_PROVIDERS = [
    { id: "facebook",  label: "Facebook",  icon: "ƒ",  color: "#1877f2" },
    { id: "google",    label: "Google",    icon: "G",  color: "#ea4335" },
    { id: "apple",     label: "Apple",     icon: "🍎", color: "#111" },
  ];

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
    <div className="vv-login-page">
      {/* ★ HERO ★ */}
      <div className="vv-login-hero">
        <div className="vv-login-hero-stars">
          <span>✿</span><span>★</span><span>✩</span><span>♡</span>
          <span>♥</span><span>★</span><span>✿</span><span>✩</span>
        </div>
        <div className="vv-login-hero-avatar">
          <span>{form.emoji || "🙂"}</span>
        </div>
        <h1 className="vv-login-hero-title">★ Vibe★Vibo ★</h1>
        <div className="vv-login-hero-sub">
          ✿ deine Erinnerungen · deine Community · dein Vibe ✿
        </div>
      </div>

      <div className="vv-login-grid">
        {/* Login/Register Card */}
        <div className="vv-login-card">
          <div className="vv-login-card-title">
            {mode === "login" ? "🔑 EINLOGGEN" : "✿ ACCOUNT ERSTELLEN ✿"}
          </div>
          <div className="vv-login-card-body">
            <div className="vv-login-tabs">
              <button type="button"
                className={`vv-login-tab${mode === "login" ? " active" : ""}`}
                onClick={() => { setMode("login"); setNeedsTotp(false); setTotp(""); setError(null); }}>
                🔑 Login
              </button>
              <button type="button"
                className={`vv-login-tab${mode === "register" ? " active" : ""}`}
                onClick={() => { setMode("register"); setNeedsTotp(false); setTotp(""); setError(null); }}>
                ✨ Registrieren
              </button>
            </div>

            <form onSubmit={submit} className="vv-login-form">
              <label className="vv-login-label">👤 Benutzername</label>
              <input
                className="vv-login-input"
                placeholder="z.B. lisa_2003"
                value={form.username}
                onChange={(e) => up("username", e.target.value)}
                autoFocus
                disabled={needsTotp}
                autoComplete="username"
              />

              {mode === "register" && (
                <>
                  <label className="vv-login-label">✏ Anzeigename (optional)</label>
                  <input
                    className="vv-login-input"
                    placeholder="z.B. Lisa* °·.¸"
                    value={form.displayName}
                    onChange={(e) => up("displayName", e.target.value)}
                  />

                  <label className="vv-login-label">😎 Avatar-Emoji</label>
                  <div className="vv-login-emoji-row">
                    {EMOJIS.map((emo) => (
                      <button
                        type="button" key={emo}
                        onClick={() => up("emoji", emo)}
                        className={`vv-login-emoji${form.emoji === emo ? " active" : ""}`}
                        aria-label={emo}
                      >
                        {emo}
                      </button>
                    ))}
                  </div>
                </>
              )}

              <label className="vv-login-label">🔒 Passwort</label>
              <input
                type="password"
                className="vv-login-input"
                value={form.password}
                onChange={(e) => up("password", e.target.value)}
                disabled={needsTotp}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />

              {mode === "login" && !needsTotp && (
                <div className="vv-login-forgot">
                  <button type="button" onClick={() => setShowForgot((v) => !v)}>
                    Passwort vergessen?
                  </button>
                </div>
              )}

              {showForgot && mode === "login" && (
                <div className="vv-login-forgot-msg">
                  📮 Schreib uns kurz an <strong>support@vibevibo.de</strong> mit deinem Benutzernamen — wir setzen dein Passwort manuell zurück und schicken dir einen Einmal-Link.
                  {" "}<br />
                  (Auto-Reset über E-Mail kommt sobald wir SMTP eingerichtet haben.)
                </div>
              )}

              {mode === "register" && (
                <div className="vv-login-hint">
                  💡 Mind. 10 Zeichen. Wir prüfen gegen bekannte Datenlecks (haveibeenpwned).
                </div>
              )}

              {needsTotp && (
                <>
                  <label className="vv-login-label">🔐 2FA-Code (Authenticator-App)</label>
                  <input
                    type="text" inputMode="numeric" autoComplete="one-time-code"
                    pattern="[0-9]{6}" maxLength={6}
                    className="vv-login-input vv-login-totp"
                    value={totp}
                    onChange={(e) => setTotp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="123 456"
                    autoFocus
                  />
                </>
              )}

              {error && (
                <div className="vv-login-error">⚠ {error}</div>
              )}

              <div className="vv-login-actions">
                <button type="submit" className="vv-login-submit"
                  disabled={busy || (needsTotp && totp.length !== 6)}>
                  {busy ? "…" : (
                    mode === "login"
                      ? (needsTotp ? "🔐 Code prüfen" : "▶ Einloggen")
                      : "🎉 Loslegen!"
                  )}
                </button>
                {needsTotp && (
                  <button type="button" className="vv-login-back"
                    onClick={() => { setNeedsTotp(false); setTotp(""); setError(null); }}>
                    ← zurück
                  </button>
                )}
              </div>
            </form>

            {!needsTotp && (
              <>
                <div className="vv-login-divider">oder</div>
                <div className="vv-login-social-row">
                  {SOCIAL_PROVIDERS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="vv-login-social-btn"
                      disabled
                      aria-label={`Mit ${p.label} fortfahren (bald verfügbar)`}
                      title="Demnächst verfügbar"
                    >
                      <span className="vv-login-social-icon" style={{ color: p.color }}>{p.icon}</span>
                      <span>{p.label}</span>
                      <span className="vv-login-social-badge">bald</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            <div className="vv-login-spacer" />

            <div className="vv-login-bottom-switch">
              {mode === "login" ? (
                <>
                  Noch keinen Account?{" "}
                  <button type="button"
                    onClick={() => { setMode("register"); setNeedsTotp(false); setTotp(""); setError(null); setShowForgot(false); }}>
                    ✨ Jetzt registrieren
                  </button>
                </>
              ) : (
                <>
                  Schon dabei?{" "}
                  <button type="button"
                    onClick={() => { setMode("login"); setNeedsTotp(false); setTotp(""); setError(null); }}>
                    🔑 Hier einloggen
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Infobox */}
        <div className="vv-login-card vv-login-card-info">
          <div className="vv-login-card-title">🌟 WILLKOMMEN ZURÜCK!</div>
          <div className="vv-login-card-body">
            <div className="vv-login-marquee-text">
              ✨ Profile mit Lieblingssong ✨ Pinnwand wie früher ✨ Glitzer-Smileys ✨ ICQ-Oh-Oh-Sound ✨ Buschfunk ✨ Gruppen-Chats ✨
            </div>

            <div className="vv-login-info-block">
              <div className="vv-login-info-icon">🎁</div>
              <div>
                <strong>Noch keinen Account?</strong>
                <p>Klick oben auf <em>✨ Registrieren</em>. Fidolin (unsere KI-Moderation) sorgt dafür, dass hier niemand belästigt wird.</p>
              </div>
            </div>

            <div className="vv-login-info-block vv-login-info-safe">
              <div className="vv-login-info-icon">🛡️</div>
              <div>
                <strong>Sicherheit</strong>
                <p>Login-Versuche werden begrenzt. VPN/Tor bei der Registrierung gesperrt. Hacker-Versuche werden protokolliert — Strafanzeige nach §§ 202a/202c StGB ist drin.</p>
              </div>
            </div>

            <div className="vv-login-info-features">
              <div className="vv-login-feat">📌 Pinnwand & Gästebuch</div>
              <div className="vv-login-feat">🎵 Profilmusik (YouTube/Spotify)</div>
              <div className="vv-login-feat">💖 Komplimente verschicken</div>
              <div className="vv-login-feat">👯 Top-5-Freunde</div>
              <div className="vv-login-feat">🎁 Geschenke-Vitrine</div>
              <div className="vv-login-feat">🥚 VIBO-Pet großziehen</div>
              <div className="vv-login-feat">🗺️ Realitätskarte</div>
              <div className="vv-login-feat">📣 Buschfunk-Feed</div>
            </div>
          </div>
        </div>
      </div>

      <div className="vv-login-footer">
        <span>★</span>
        <span>VibeVibo © 2026 · made with ♥ for everyone who misses the old web</span>
        <span>★</span>
      </div>
    </div>
  );
}
