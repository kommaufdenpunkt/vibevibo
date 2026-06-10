"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const PROVIDER_LABEL = { facebook: "Facebook", instagram: "Instagram", snapchat: "Snapchat" };

export default function SocialOnboardingPage() {
  const router = useRouter();
  const [info, setInfo] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    username: "",
    displayName: "",
    gender: "",
    birthdate: "",
    accepted: false,
    captcha: "",
    hp: "",
  });
  const [captchaQ, setCaptchaQ] = useState({ a: 0, b: 0, sum: 0 });

  useEffect(() => {
    fetch("/api/auth/social/onboarding").then(async (r) => {
      if (!r.ok) {
        router.replace("/login?err=onboard_expired");
        return;
      }
      const d = await r.json();
      setInfo(d);
      setForm((f) => ({
        ...f,
        username: d.suggestedUsername || "",
        displayName: d.displayName || d.suggestedUsername || "",
      }));
      const a = Math.floor(Math.random() * 9) + 1;
      const b = Math.floor(Math.random() * 9) + 1;
      setCaptchaQ({ a, b, sum: a + b });
    });
  }, [router]);

  function up(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setError(null);
    if (!form.accepted) { setError("Du musst die AGB akzeptieren."); return; }
    if (Number(form.captcha) !== captchaQ.sum) { setError("Captcha falsch."); return; }
    if (!form.gender) { setError("Bitte Geschlecht waehlen."); return; }
    if (!form.birthdate) { setError("Bitte Geburtsdatum angeben."); return; }
    setBusy(true);
    try {
      const r = await fetch("/api/auth/social/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.username,
          displayName: form.displayName,
          gender: form.gender,
          birthdate: form.birthdate,
          accepted: form.accepted,
          captcha: form.captcha,
          captchaSum: captchaQ.sum,
          hp: form.hp,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Fehler");
      router.push(d.redirect || "/profile");
      router.refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (!info) {
    return (
      <div className="vv-login-page">
        <div className="vv-login-hero">
          <div className="vv-login-hero-title">★ Lade Daten… ★</div>
        </div>
      </div>
    );
  }

  return (
    <div className="vv-login-page">
      <div className="vv-login-hero">
        <div className="vv-login-hero-stars">
          <span>✿</span><span>★</span><span>✩</span><span>♡</span>
          <span>♥</span><span>★</span><span>✿</span><span>✩</span>
        </div>
        <h1 className="vv-login-hero-title">★ Fast geschafft! ★</h1>
        <div className="vv-login-hero-sub">
          ✿ Wir brauchen noch ein paar Angaben von dir ✿
        </div>
      </div>

      <div className="vv-login-grid">
        <div className="vv-login-card">
          <div className="vv-login-card-title">
            ✨ {PROVIDER_LABEL[info.provider] || info.provider} verifiziert
          </div>
          <div className="vv-login-card-body">
            <div className="vv-login-hint" style={{ marginBottom: 16 }}>
              💡 Dein {PROVIDER_LABEL[info.provider] || info.provider}-Login ist bestaetigt. Vervollstaendige dein Profil — danach landet dein Account in der Warteliste fuer die Fidolin-Pruefung.
            </div>

            <form onSubmit={submit} className="vv-login-form">
              {/* Honeypot - unsichtbar fuer User, gefuellt von Bots */}
              <input
                type="text" name="website" value={form.hp}
                onChange={(e) => up("hp", e.target.value)}
                tabIndex={-1} autoComplete="off"
                style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
                aria-hidden="true"
              />

              <label className="vv-login-label">👤 Benutzername</label>
              <input
                className="vv-login-input"
                value={form.username}
                onChange={(e) => up("username", e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                maxLength={17}
                pattern="[a-z0-9_-]{3,17}"
                required
              />

              <label className="vv-login-label">✏ Anzeigename</label>
              <input
                className="vv-login-input"
                value={form.displayName}
                onChange={(e) => up("displayName", e.target.value)}
                maxLength={17}
                required
              />

              <label className="vv-login-label">⚧ Geschlecht</label>
              <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
                <button
                  type="button"
                  className={`vv-login-tab${form.gender === "m" ? " active" : ""}`}
                  onClick={() => up("gender", "m")}
                  style={{ flex: 1 }}
                >♂ Maennlich</button>
                <button
                  type="button"
                  className={`vv-login-tab${form.gender === "w" ? " active" : ""}`}
                  onClick={() => up("gender", "w")}
                  style={{ flex: 1 }}
                >♀ Weiblich</button>
              </div>

              <label className="vv-login-label">🎂 Geburtsdatum (mind. 18 Jahre)</label>
              <input
                type="date"
                className="vv-login-input"
                value={form.birthdate}
                onChange={(e) => up("birthdate", e.target.value)}
                max={new Date(Date.now() - 18 * 365.25 * 86400000).toISOString().slice(0, 10)}
                required
              />

              <label className="vv-login-label">🧮 Captcha: {captchaQ.a} + {captchaQ.b} = ?</label>
              <input
                type="number"
                inputMode="numeric"
                className="vv-login-input"
                value={form.captcha}
                onChange={(e) => up("captcha", e.target.value)}
                required
              />

              <label style={{ display: "flex", alignItems: "flex-start", gap: 8, margin: "12px 0", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={form.accepted}
                  onChange={(e) => up("accepted", e.target.checked)}
                  style={{ marginTop: 4 }}
                />
                <span style={{ fontSize: 13 }}>
                  Ich akzeptiere die <a href="/agb" target="_blank">AGB</a> und die <a href="/datenschutz" target="_blank">Datenschutzerklaerung</a> und bestaetige, dass ich mindestens 18 Jahre alt bin.
                </span>
              </label>

              {error && <div className="vv-login-error">⚠ {error}</div>}

              <div className="vv-login-actions">
                <button type="submit" className="vv-login-submit" disabled={busy}>
                  {busy ? "…" : "🎉 Account erstellen"}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="vv-login-card vv-login-card-info">
          <div className="vv-login-card-title">🌟 WARTELISTE</div>
          <div className="vv-login-card-body">
            <div className="vv-login-info-block">
              <div className="vv-login-info-icon">⏳</div>
              <div>
                <strong>Was passiert jetzt?</strong>
                <p>Dein Account wird nach dem Anlegen <em>noch nicht</em> direkt freigeschaltet. Fidolin (unsere KI) und ein Admin pruefen, dass alles passt — meistens innerhalb von 24 Stunden.</p>
              </div>
            </div>
            <div className="vv-login-info-block vv-login-info-safe">
              <div className="vv-login-info-icon">🛡️</div>
              <div>
                <strong>Warum?</strong>
                <p>So halten wir Fake-Accounts, Bots und Doppelregistrierungen draussen. Du wirst per E-Mail benachrichtigt sobald freigeschaltet.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
