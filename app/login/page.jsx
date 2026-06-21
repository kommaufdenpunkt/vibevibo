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
      {/* ❦ HERO ❦ */}
      <div className="vv-login-hero">
        <div className="vv-login-hero-stars">
          <span>✦</span><span>❦</span><span>✦</span><span>❀</span>
          <span>❦</span><span>✦</span><span>❀</span><span>✦</span>
        </div>
        <div className="vv-login-hero-avatar">
          {avatarData
            ? <img src={avatarData} alt="" />
            : <span>📸</span>}
        </div>
        <h1 className="vv-login-hero-title">VibeVibo</h1>
        <div className="vv-login-hero-sub">
          Anno 2026 · deine Erinnerungen · deine Community · dein Vibe
        </div>
      </div>

      <div className="vv-login-grid">
        {/* Login/Register Card */}
        <div className="vv-login-card">
          <div className="vv-login-card-title">
            {mode === "login" ? "❦ Eintreten ❦" : "❦ Im Buch eintragen ❦"}
          </div>
          <div className="vv-login-card-body">
            <div className="vv-login-tabs">
              <button type="button"
                className={`vv-login-tab${mode === "login" ? " active" : ""}`}
                onClick={() => { setMode("login"); setNeedsTotp(false); setTotp(""); setError(null); }}>
                ❦ Anmelden
              </button>
              <button type="button"
                className={`vv-login-tab${mode === "register" ? " active" : ""}`}
                onClick={() => { setMode("register"); setNeedsTotp(false); setTotp(""); setError(null); }}>
                ✦ Registrieren
              </button>
            </div>

            <form onSubmit={submit} className="vv-login-form">
              <label className="vv-login-label">Benutzername</label>
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
                  <label className="vv-login-label">Anzeigename (optional)</label>
                  <input
                    className="vv-login-input"
                    placeholder="z.B. Lisa"
                    value={form.displayName}
                    onChange={(e) => up("displayName", e.target.value)}
                  />

                  <label className="vv-login-label">Lichtbild (optional)</label>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    capture="user"
                    style={{ display: "none" }}
                    onChange={(e) => pickAvatar(e.target.files?.[0])}
                  />
                  <div style={{
                    display: "flex", gap: 14, alignItems: "center",
                    padding: 12,
                    background: "repeating-linear-gradient(90deg, rgba(139,111,71,0.04) 0 2px, transparent 2px 4px), rgba(249,240,219,0.7)",
                    border: "3px double #c8a25c",
                    borderRadius: 3,
                    boxShadow: "inset 0 0 12px rgba(139,111,71,0.15)",
                  }}>
                    <div style={{
                      width: 78, height: 78,
                      flexShrink: 0,
                      padding: 4,
                      background: "linear-gradient(135deg, #c8a25c 0%, #8b6f47 100%)",
                      borderRadius: 2,
                      boxShadow: "0 2px 6px rgba(61,40,23,0.4), inset 0 0 0 1px rgba(255,255,255,0.2)",
                    }}>
                      <div style={{
                        width: "100%", height: "100%",
                        background: "#f4ead5",
                        border: "1px solid rgba(139,111,71,0.5)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 30, overflow: "hidden",
                        filter: "sepia(0.15)",
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
                          padding: "10px 12px",
                          borderRadius: 3,
                          border: "2px ridge #c8a25c",
                          background: "linear-gradient(180deg, #8b6f47 0%, #5a3e1d 100%)",
                          color: "#f4ead5",
                          fontFamily: "Georgia, 'Times New Roman', serif",
                          fontWeight: 700, fontSize: 12,
                          letterSpacing: "1.2px",
                          fontVariant: "small-caps",
                          cursor: avatarBusy ? "wait" : "pointer",
                          width: "100%",
                          textShadow: "0 1px 1px rgba(0,0,0,0.4)",
                          boxShadow: "0 2px 0 #3d2817, inset 0 0 0 1px rgba(255,255,255,0.15)",
                        }}
                      >
                        {avatarBusy ? "… wird belichtet …" : avatarData ? "Anderes Lichtbild" : "Lichtbild aufnehmen"}
                      </button>
                      {avatarData && (
                        <button
                          type="button"
                          onClick={() => { setAvatarData(""); if (fileRef.current) fileRef.current.value = ""; }}
                          style={{
                            marginTop: 8, padding: "4px 10px", borderRadius: 2,
                            border: "1px solid rgba(139,111,71,0.4)",
                            background: "transparent", color: "#6b4a26",
                            fontFamily: "Georgia, serif", fontSize: 11, fontWeight: 600,
                            fontStyle: "italic",
                            cursor: "pointer",
                          }}
                        >
                          ✕ entfernen
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="vv-login-hint">
                    Dein Lichtbild wird von unserer Moderation geprüft, bevor es im Album erscheint.
                    Auch ohne Bild geht's — du kannst später eines im Profil hinterlegen.
                  </div>
                </>
              )}

              <label className="vv-login-label">Kennwort</label>
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
                  Mindestens 10 Zeichen. Wir gleichen gegen bekannte Datenlecks ab (haveibeenpwned).
                </div>
              )}

              {needsTotp && (
                <>
                  <label className="vv-login-label">Sicherheits-Code (Authenticator)</label>
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
                <div className="vv-login-error">✦ {error}</div>
              )}

              <div className="vv-login-actions">
                <button type="submit" className="vv-login-submit"
                  disabled={busy || (needsTotp && totp.length !== 6)}>
                  {busy ? "…" : (
                    mode === "login"
                      ? (needsTotp ? "Code prüfen" : "Eintreten")
                      : "Eintragen"
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
                    display: "flex", alignItems: "center", gap: 12, margin: "18px 0 12px",
                    color: "#8b6f47", fontSize: 11, fontWeight: 700,
                    fontVariant: "small-caps", letterSpacing: "3px",
                    fontFamily: "Georgia, serif",
                  }}>
                    <span style={{ flex: 1, height: 3, borderTop: "1px solid #c8a25c", borderBottom: "1px solid #c8a25c" }} />
                    <span>✦ oder ✦</span>
                    <span style={{ flex: 1, height: 3, borderTop: "1px solid #c8a25c", borderBottom: "1px solid #c8a25c" }} />
                  </div>

                  <a href="/api/auth/facebook/start?next=/" style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    gap: 10, padding: "12px 14px", borderRadius: 4,
                    background: "linear-gradient(180deg, #1f5fc8 0%, #143f87 100%)",
                    color: "#fff",
                    border: "2px ridge #c8a25c",
                    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.25), 0 3px 0 #0a2553, 0 4px 8px rgba(0,0,0,0.3)",
                    textDecoration: "none", fontFamily: "Georgia, 'Times New Roman', serif",
                    fontWeight: 700, fontSize: 14, letterSpacing: "0.4px",
                    textShadow: "0 1px 1px rgba(0,0,0,0.5)",
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
          <div className="vv-login-card-title">❦ Willkommen ❦</div>
          <div className="vv-login-card-body">
            <div className="vv-login-marquee-text">
              ✦ Profile mit Lieblingslied ✦ Pinnwand wie früher ✦ Gästebuch ✦ Buschfunk ✦ Gruppen-Stuben ✦
            </div>

            <div className="vv-login-info-block">
              <div className="vv-login-info-icon">✉</div>
              <div>
                <strong>Noch kein Eintrag?</strong>
                <p>Klick oben auf <em>Registrieren</em>. Fidolin, unser stiller Wächter, sorgt dafür, dass hier niemand belästigt wird.</p>
              </div>
            </div>

            <div className="vv-login-info-block vv-login-info-safe">
              <div className="vv-login-info-icon">⚜</div>
              <div>
                <strong>Sicherheit</strong>
                <p>Login-Versuche werden begrenzt, VPN/Tor bei der Registrierung gesperrt. Eindringlinge werden protokolliert — Strafanzeige nach §§ 202a/202c StGB ist drin.</p>
              </div>
            </div>

            <div className="vv-login-info-features">
              <div className="vv-login-feat">❦ Pinnwand &amp; Gästebuch</div>
              <div className="vv-login-feat">♪ Profilmelodie</div>
              <div className="vv-login-feat">✦ Komplimente</div>
              <div className="vv-login-feat">❀ Top-5-Freunde</div>
              <div className="vv-login-feat">✉ Geschenke-Vitrine</div>
              <div className="vv-login-feat">⚘ VIBO-Tier aufziehen</div>
              <div className="vv-login-feat">⚓ Realitätskarte</div>
              <div className="vv-login-feat">❦ Buschfunk-Anschlag</div>
            </div>
          </div>
        </div>
      </div>

      <div className="vv-login-footer">
        <span>❦</span>
        <span>VibeVibo · Anno MMXXVI · für alle, die das alte Netz vermissen</span>
        <span>❦</span>
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
