"use client";

// 🔑 LOGIN — komplett im 2007er-Style mit WordArt, Glitzer-Avatar und neon Vibes.
// Tabs für Login/Registrieren, 2FA, Emoji-Picker mit Animation, Mobile-First.

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useMe } from "@/lib/useMe";

const EMOJIS = ["🙂","😎","🌸","🛹","👑","🎮","💅","🎧","🦄","🌈","🔥","🌟","💖","🎀","🍀","⚡","🦋","☕"];

export default function LoginPageWrapper() {
  return <Suspense fallback={null}><LoginPage /></Suspense>;
}

function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh } = useMe();
  const [mode, setMode] = useState("login");
  const [busy, setBusy] = useState(false);
  const oauthError = searchParams?.get("error") || null;
  const [error, setError] = useState(oauthError);
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
      // Wenn der User mit ?next=/foo umgeleitet wurde, dorthin zurueck.
      // Sonst Standard: /heute (Tages-Hub statt /profile)
      const nextUrl = searchParams.get("next");
      const dest = nextUrl && nextUrl.startsWith("/") && !nextUrl.startsWith("//")
        ? nextUrl : "/heute";
      router.push(dest);
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

              {!needsTotp && (
                <>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 10, margin: "14px 0 10px",
                    color: "#94a3b8", fontSize: 11, fontWeight: 700,
                  }}>
                    <span style={{ flex: 1, height: 1, background: "rgba(0,0,0,0.1)" }} />
                    <span>ODER</span>
                    <span style={{ flex: 1, height: 1, background: "rgba(0,0,0,0.1)" }} />
                  </div>

                  <div style={{ display: "grid", gap: 8 }}>
                    <a href="/api/auth/google/start?next=/" style={{
                      display: "flex", alignItems: "center", justifyContent: "center",
                      gap: 10, padding: "11px 14px", borderRadius: 10,
                      background: "#fff", color: "#1c1c1e",
                      border: "2px solid #dadce0",
                      textDecoration: "none", fontFamily: "inherit",
                      fontWeight: 700, fontSize: 14,
                    }}>
                      <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                        <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                        <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                        <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                        <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                      </svg>
                      Mit Google anmelden
                    </a>
                    <a href="/api/auth/facebook/start?next=/" style={{
                      display: "flex", alignItems: "center", justifyContent: "center",
                      gap: 10, padding: "11px 14px", borderRadius: 10,
                      background: "#1877F2", color: "#fff",
                      border: "2px solid #1877F2",
                      textDecoration: "none", fontFamily: "inherit",
                      fontWeight: 700, fontSize: 14,
                    }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#fff">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                      Mit Facebook anmelden
                    </a>
                  </div>
                </>
              )}
            </form>
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
