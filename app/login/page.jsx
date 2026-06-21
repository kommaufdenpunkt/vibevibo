"use client";

// 🔑 LOGIN — komplett im 2007er-Style mit WordArt, Glitzer-Avatar und neon Vibes.
// Tabs für Login/Registrieren, 2FA, Profilfoto-Upload (Fidolin-moderiert), Mobile-First.

import { Suspense, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useMe } from "@/lib/useMe";

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
  const [avatarData, setAvatarData] = useState("");
  const [avatarBusy, setAvatarBusy] = useState(false);
  const fileRef = useRef(null);

  const [form, setForm] = useState({
    username: "",
    displayName: "",
    password: "",
  });

  function up(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function pickAvatar(file) {
    if (!file) return;
    setAvatarBusy(true);
    setError(null);
    try {
      const dataUrl = await readAndCompress(file, 1024);
      setAvatarData(dataUrl);
    } catch {
      setError("Bild konnte nicht gelesen werden.");
    } finally {
      setAvatarBusy(false);
    }
  }

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
          images: avatarData ? [avatarData] : [],
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
          <span>★</span><span>✦</span><span>★</span><span>✦</span><span>★</span>
        </div>
        <div className="vv-login-hero-avatar">
          {avatarData
            ? <img src={avatarData} alt="" />
            : <span>📸</span>}
        </div>
        <h1 className="vv-login-hero-title">Vibe<i>★</i>Vibo</h1>
        <div className="vv-login-hero-sub">
          deine Erinnerungen · deine Community · dein Vibe
        </div>
      </div>

      <div className="vv-login-grid">
        {/* Login/Register Card */}
        <div className="vv-login-card">
          <div className="vv-login-card-title">
            {mode === "login" ? "★ Einloggen" : "★ Account erstellen"}
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
                    placeholder="z.B. Lisa"
                    value={form.displayName}
                    onChange={(e) => up("displayName", e.target.value)}
                  />

                  <label className="vv-login-label">📸 Profilbild (optional)</label>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    capture="user"
                    style={{ display: "none" }}
                    onChange={(e) => pickAvatar(e.target.files?.[0])}
                  />
                  <div style={{
                    display: "flex", gap: 12, alignItems: "center",
                    padding: 11,
                    background: "#f0f4fa",
                    border: "1px solid #c5d2e8",
                    borderRadius: 4,
                  }}>
                    <div style={{
                      width: 72, height: 72,
                      flexShrink: 0,
                      padding: 3,
                      background: "#ffffff",
                      border: "1px solid #c5d2e8",
                      borderRadius: 4,
                      boxShadow: "0 1px 3px rgba(30,58,138,0.15)",
                    }}>
                      <div style={{
                        width: "100%", height: "100%",
                        background: "linear-gradient(180deg, #f0f4fa, #e2e8f0)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 28, overflow: "hidden", borderRadius: 3,
                        color: "#475569",
                      }}>
                        {avatarData
                          ? <img src={avatarData} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : <span>📷</span>}
                      </div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        disabled={avatarBusy}
                        style={{
                          padding: "9px 12px",
                          borderRadius: 4,
                          border: "1px solid #c2410c",
                          background: "linear-gradient(180deg, #f97316 0%, #ea580c 100%)",
                          color: "#ffffff",
                          fontFamily: "Tahoma, Verdana, sans-serif",
                          fontWeight: 700, fontSize: 12,
                          letterSpacing: "0.3px",
                          cursor: avatarBusy ? "wait" : "pointer",
                          width: "100%",
                          textShadow: "0 1px 1px rgba(0,0,0,0.25)",
                          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35), 0 1px 2px rgba(234,88,12,0.3)",
                        }}
                      >
                        {avatarBusy ? "… lade …" : avatarData ? "📷 Anderes Foto" : "📷 Foto aufnehmen"}
                      </button>
                      {avatarData && (
                        <button
                          type="button"
                          onClick={() => { setAvatarData(""); if (fileRef.current) fileRef.current.value = ""; }}
                          style={{
                            marginTop: 6, padding: "3px 8px", borderRadius: 3,
                            border: "1px solid #c5d2e8",
                            background: "#ffffff", color: "#475569",
                            fontFamily: "Tahoma, Verdana, sans-serif", fontSize: 11, fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          × entfernen
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="vv-login-hint">
                    🛡 Dein Foto wird von unserer Moderation geprüft, bevor es sichtbar wird.
                    Ohne Foto geht's auch — du kannst später eins im Profil hochladen.
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
                    display: "flex", alignItems: "center", gap: 10, margin: "16px 0 10px",
                    color: "#64748b", fontSize: 11, fontWeight: 700,
                    letterSpacing: "1.5px",
                    fontFamily: "Tahoma, Verdana, sans-serif",
                  }}>
                    <span style={{ flex: 1, height: 1, background: "#c5d2e8" }} />
                    <span>ODER</span>
                    <span style={{ flex: 1, height: 1, background: "#c5d2e8" }} />
                  </div>

                  <a href="/api/auth/facebook/start?next=/" style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    gap: 10, padding: "11px 14px", borderRadius: 4,
                    background: "linear-gradient(180deg, #1877F2 0%, #166FE5 100%)",
                    color: "#fff",
                    border: "1px solid #0e5cc4",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), 0 1px 2px rgba(24,119,242,0.3)",
                    textDecoration: "none",
                    fontFamily: "Tahoma, Verdana, sans-serif",
                    fontWeight: 700, fontSize: 14, letterSpacing: "0.2px",
                    textShadow: "0 1px 1px rgba(0,0,0,0.25)",
                  }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#fff">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    Mit Facebook anmelden
                  </a>
                </>
              )}
            </form>
          </div>
        </div>

        {/* Infobox */}
        <div className="vv-login-card vv-login-card-info">
          <div className="vv-login-card-title">🌟 Willkommen zurück!</div>
          <div className="vv-login-card-body">
            <div className="vv-login-marquee-text">
              ★ Profile mit Lieblingssong ★ Pinnwand wie früher ★ Glitzer-Smileys ★ Buschfunk ★ Gruppen-Chats ★
            </div>

            <div className="vv-login-info-block">
              <div className="vv-login-info-icon">🎁</div>
              <div>
                <strong>Noch keinen Account?</strong>
                <p>Klick oben auf <em>Registrieren</em>. Fidolin (unsere KI-Moderation) sorgt dafür, dass hier niemand belästigt wird.</p>
              </div>
            </div>

            <div className="vv-login-info-block vv-login-info-safe">
              <div className="vv-login-info-icon">🛡️</div>
              <div>
                <strong>Sicherheit</strong>
                <p>Login-Versuche werden begrenzt, VPN/Tor bei der Registrierung gesperrt. Hacker-Versuche werden protokolliert — Strafanzeige nach §§ 202a/202c StGB ist drin.</p>
              </div>
            </div>

            <div className="vv-login-info-features">
              <div className="vv-login-feat">📌 Pinnwand &amp; Gästebuch</div>
              <div className="vv-login-feat">🎵 Profilmusik</div>
              <div className="vv-login-feat">💖 Komplimente verschicken</div>
              <div className="vv-login-feat">👯 Top-5-Freunde</div>
              <div className="vv-login-feat">🎁 Geschenke-Vitrine</div>
              <div className="vv-login-feat">🥚 VIBO-Pet großziehen</div>
              <div className="vv-login-feat">🗺 Realitätskarte</div>
              <div className="vv-login-feat">📣 Buschfunk-Feed</div>
            </div>
          </div>
        </div>
      </div>

      <div className="vv-login-footer">
        <span>★</span>
        <span>VibeVibo © 2026 · made for everyone who misses the old web</span>
        <span>★</span>
      </div>
    </div>
  );
}

// Liest File, skaliert auf max-Dimension, gibt base64 JPG zurück
function readAndCompress(file, maxDim = 1024) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = reject;
      img.onload = () => {
        let { width, height } = img;
        const ratio = Math.min(1, maxDim / width, maxDim / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
