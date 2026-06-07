"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useMe } from "@/lib/useMe";
import InstallTeaser from "./InstallTeaser";
import LandingExtras from "./LandingExtras";

const HOOKS = [
  "Tokio Hotel auf einem Klapphandy",
  "*gruschelt* von einem Fremden",
  "Top 8 Friends sortieren",
  "Eine Rose verschenken",
  "Hintergrundmusik auf dem Profil",
  "Glitzer-Smileys in der Pinnwand",
  "ICQ Uh-Oh!",
  "Mixtape brennen für den Schwarm",
  "MSN-Nicknames mit ★彡 Symbolen ★彡",
];

// Bild im Browser auf 400x400 verkleinern (mittig beschnitten) -> kleines JPEG
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = reject;
      img.onload = () => {
        const size = 400;
        const canvas = document.createElement("canvas");
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext("2d");
        const scale = Math.max(size / img.width, size / img.height);
        const w = img.width * scale, h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// Schwebende Nostalgie-Karten - jede sieht aus wie ein UI-Element aus der Zeit
const NOSTALGIA_CARDS = [
  {
    type: "icq",
    render: () => (
      <>
        <div className="vv-card-header">ICQ # 4 521 337</div>
        <div className="vv-card-body">
          <span className="vv-icq-dot" /> <strong>Anna* °·.¸</strong> ist online
        </div>
        <div className="vv-card-meta">seit 14:23</div>
      </>
    ),
  },
  {
    type: "pinnwand",
    render: () => (
      <>
        <div className="vv-card-pin" />
        <div className="vv-card-body">✦ Hdl du knuddel ✦<br /><em>- Kev ♥</em></div>
        <div className="vv-card-meta">Pinnwand 2007</div>
      </>
    ),
  },
  {
    type: "geschenk",
    render: () => (
      <>
        <div className="vv-card-gift-icon">🌹</div>
        <div className="vv-card-body"><strong>Eine Rose</strong><br />für dich von ♛Lisa♛</div>
      </>
    ),
  },
  {
    type: "msn",
    render: () => (
      <>
        <div className="vv-card-header">★彡 ana ★彡</div>
        <div className="vv-card-body">
          <div className="vv-msn-line"><strong>kev:</strong> lol :D</div>
          <div className="vv-msn-line"><strong>ana:</strong> jaaa hdl :*</div>
        </div>
      </>
    ),
  },
  {
    type: "mp3",
    render: () => (
      <>
        <div className="vv-card-body">
          <div className="vv-mp3-eq"><span /><span /><span /><span /></div>
          ♪ Tokio Hotel<br />
          <em>Durch den Monsun</em>
        </div>
        <div className="vv-mp3-bar"><div className="vv-mp3-fill" /></div>
      </>
    ),
  },
  {
    type: "gruschel",
    render: () => (
      <>
        <div className="vv-card-gift-icon">🫶</div>
        <div className="vv-card-body"><em>*gruschelt*</em><br /><strong>von Juli ♥</strong></div>
      </>
    ),
  },
  {
    type: "top8",
    render: () => (
      <>
        <div className="vv-card-header">Top 8 Friends</div>
        <div className="vv-top8-grid">
          <span>🌸</span><span>🛹</span><span>👑</span><span>🎮</span>
          <span>💅</span><span>🎧</span><span>🦄</span><span>+</span>
        </div>
      </>
    ),
  },
  {
    type: "foto",
    render: () => (
      <>
        <div className="vv-card-foto">📷</div>
        <div className="vv-card-body"><em>Sommer 2007</em><br />mit den Mädels 💕</div>
      </>
    ),
  },
  {
    type: "status",
    render: () => (
      <>
        <div className="vv-card-header">Mood</div>
        <div className="vv-card-body">verliebt 💘💘💘</div>
        <div className="vv-card-meta">vor 5 min</div>
      </>
    ),
  },
  {
    type: "smiley",
    render: () => (
      <>
        <div className="vv-card-body">
          <span className="vv-smiley-rain">:-D :-* &lt;3 :3 ^_^ xD</span>
        </div>
      </>
    ),
  },
  {
    type: "geschenk2",
    render: () => (
      <>
        <div className="vv-card-gift-icon">📼</div>
        <div className="vv-card-body"><strong>Mixtape</strong><br />„Für meinen Liebling"</div>
      </>
    ),
  },
  {
    type: "online",
    render: () => (
      <>
        <div className="vv-card-body"><strong>Wer ist online?</strong></div>
        <div className="vv-online-list">
          <span><span className="vv-icq-dot" /> Anna</span>
          <span><span className="vv-icq-dot" /> Kev</span>
          <span><span className="vv-icq-dot" /> Lisa</span>
        </div>
      </>
    ),
  },
];

// 18 Karten mit verteilten Positionen und Verzögerungen
const CARD_POSITIONS = Array.from({ length: 18 }, (_, i) => {
  const cardIdx = i % NOSTALGIA_CARDS.length;
  return {
    cardIdx,
    left: `${(i * 13.7) % 95 + 2}%`,
    delay: `-${(i * 2.3) % 30}s`,
    duration: `${28 + (i % 5) * 4}s`,
    scale: 0.7 + ((i % 4) * 0.12),
    rotate: ((i * 17) % 24) - 12,
  };
});

export default function Landing() {
  const router = useRouter();
  const { refresh } = useMe();
  const [hookIdx, setHookIdx] = useState(0);
  const [mode, setMode] = useState("idle");
  const [form, setForm] = useState({ username: "", password: "", displayName: "", gender: "", birthdate: "" });
  const [pics, setPics] = useState([]);
  const picInputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [waitlisted, setWaitlisted] = useState(false);
  const [stats, setStats] = useState({ users: 0, online: 0 });
  const inputRef = useRef(null);

  useEffect(() => {
    const t = setInterval(() => setHookIdx((i) => (i + 1) % HOOKS.length), 2400);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const load = () => api.listUsers()
      .then((d) => setStats({ users: d.users.length, online: d.users.filter((u) => u.online).length }))
      .catch(() => {});
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (mode === "register" || mode === "login") {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [mode]);

  async function onPickPics(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    try {
      const added = [];
      for (const f of files) {
        if (pics.length + added.length >= 9) break;
        added.push(await fileToDataUrl(f));
      }
      setPics((p) => [...p, ...added].slice(0, 9));
    } catch {
      setError("Bild konnte nicht geladen werden.");
    }
  }

  function removePic(i) {
    setPics((p) => p.filter((_, idx) => idx !== i));
  }

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "register") {
        const res = await api.register({
          username: form.username.trim(),
          displayName: form.displayName.trim() || form.username.trim(),
          password: form.password,
          gender: form.gender,
          birthdate: form.birthdate,
          images: pics,
        });
        // Registrierung => Warteliste, kein direkter Login
        if (res?.waitlist) {
          setWaitlisted(true);
          setBusy(false);
          return;
        }
      } else {
        await api.login(form.username.trim(), form.password);
        await refresh();
        router.push("/profile");
        router.refresh();
        return;
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="vv-splash">
      {/* Schwebende Nostalgie-Karten im Hintergrund */}
      <div className="vv-nostalgia-bg" aria-hidden="true">
        {CARD_POSITIONS.map((p, i) => {
          const card = NOSTALGIA_CARDS[p.cardIdx];
          return (
            <div
              key={i}
              className={`vv-nostalgia-card vv-card-${card.type}`}
              style={{
                left: p.left,
                animationDelay: p.delay,
                animationDuration: p.duration,
                "--card-scale": p.scale,
                "--card-rotate": `${p.rotate}deg`,
              }}
            >
              {card.render()}
            </div>
          );
        })}
        <div className="vv-splash-glow" />
      </div>

      {/* Hero-Content */}
      <div className="vv-splash-content">
        <div className="vv-splash-stats">
          <span className="vv-pulse-dot" />
          {stats.online > 0 ? (
            <span><strong>{stats.online}</strong> online · <strong>{stats.users}</strong> Mitglieder</span>
          ) : (
            <span>community gerade live</span>
          )}
        </div>

        <h1 className="vv-splash-title">
          Vibe<span className="vv-splash-star">★</span>Vibo
        </h1>

        <div className="vv-splash-hook-wrap">
          <span className="vv-splash-hook-label">erinnerst du dich an</span>
          <span key={hookIdx} className="vv-splash-hook">{HOOKS[hookIdx]}?</span>
        </div>

        {/* 🛡 Trust-Badges - bauen sofort Vertrauen auf */}
        <div style={{
          display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 6,
          margin: "8px auto 18px", maxWidth: 560,
        }}>
          {[
            { e: "🇩🇪", t: "Gehostet in DE" },
            { e: "🛡", t: "DSGVO konform" },
            { e: "💸", t: "Kostenlos" },
            { e: "🤖", t: "KI-Moderation" },
            { e: "❤️", t: "Kein Algorithmus" },
          ].map(({ e, t }) => (
            <span key={t} style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "5px 10px", borderRadius: 999,
              background: "rgba(255,255,255,0.92)",
              border: "1.5px solid rgba(255,62,157,0.35)",
              color: "#831843", fontWeight: 800, fontSize: 11.5,
              letterSpacing: 0.3, fontFamily: "Arial, sans-serif",
              boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
            }}>
              <span style={{ fontSize: 14 }}>{e}</span>{t}
            </span>
          ))}
        </div>

        {waitlisted ? (
          <div className="vv-waitlist-box">
            <div className="vv-waitlist-emoji">💌</div>
            <h2>Du stehst auf der Warteliste!</h2>
            <p>
              Schön dass du dabei sein willst! Wir schalten neue Mitglieder
              nach und nach frei – du bekommst Zugang, sobald du dran bist.
            </p>
            <button type="button" className="vv-btn-cta vv-btn-cta-ghost" onClick={() => { setWaitlisted(false); setMode("idle"); }}>
              ← zurück
            </button>
          </div>
        ) : mode === "idle" ? (
          <div className="vv-splash-cta">
            <button type="button" className="vv-btn-cta vv-btn-cta-primary" onClick={() => setMode("register")}>
              ⚡ Auf die Warteliste
            </button>
            <button type="button" className="vv-btn-cta vv-btn-cta-ghost" onClick={() => setMode("login")}>
              schon freigeschaltet? Einloggen
            </button>
          </div>
        ) : null}

        {!waitlisted && (mode === "register" || mode === "login") && (
          <form className="vv-splash-form" onSubmit={submit}>
            <div className="vv-splash-form-title">
              {mode === "register" ? "✿ Auf die Warteliste ✿" : "🔑 Welcome back"}
              <button type="button" className="vv-splash-form-close" onClick={() => { setMode("idle"); setError(null); }} aria-label="Schließen">×</button>
            </div>

            <input
              ref={inputRef}
              type="text"
              className="vv-splash-input"
              placeholder="Username (z.B. cool_kid_2007)"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              autoComplete="username"
              required
            />

            {mode === "register" && (
              <>
                <input
                  type="text"
                  className="vv-splash-input"
                  placeholder="Anzeigename (z.B. ♛Anna♛)"
                  value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                />

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    {[["m", "♂ m"], ["w", "♀ w"]].map(([val, label]) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setForm({ ...form, gender: val })}
                        style={{
                          padding: "8px 12px", borderRadius: 10, cursor: "pointer", fontWeight: "bold",
                          border: form.gender === val ? "2px solid #ff3e9d" : "2px solid #ddd",
                          background: form.gender === val ? (val === "m" ? "#2a7fff" : "#ff3e9d") : "#fff",
                          color: form.gender === val ? "#fff" : "#555",
                        }}
                      >{label}</button>
                    ))}
                  </div>
                  <input
                    type="date"
                    className="vv-splash-input"
                    style={{ flex: 1, margin: 0 }}
                    value={form.birthdate}
                    max={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setForm({ ...form, birthdate: e.target.value })}
                    required
                    aria-label="Geburtsdatum"
                  />
                </div>
                <div style={{ fontSize: 11, color: "#888", marginTop: -2 }}>Geschlecht &amp; Geburtsdatum – <strong>VibeVibo ist ab 18</strong> (dein Alter wird angezeigt, z.B. „w 21")</div>

                <div style={{ margin: "4px 0 2px" }}>
                  <button
                    type="button"
                    onClick={() => picInputRef.current?.click()}
                    style={{ width: "100%", padding: "10px", borderRadius: 10, border: "2px dashed #ff8fd0", background: "rgba(255,255,255,0.7)", color: "#c2185b", fontWeight: "bold", cursor: "pointer" }}
                  >
                    📷 Profilbild(er) wählen {pics.length > 0 ? `(${pics.length}/9)` : ""}
                  </button>
                  <input ref={picInputRef} type="file" accept="image/png,image/jpeg,image/webp" multiple hidden onChange={onPickPics} />
                  {pics.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                      {pics.map((src, i) => (
                        <span key={i} style={{ position: "relative", width: 48, height: 48 }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={src} alt="" style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 8 }} />
                          <button
                            type="button"
                            onClick={() => removePic(i)}
                            aria-label="Entfernen"
                            style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: "50%", border: "none", background: "#222", color: "#fff", fontSize: 12, lineHeight: "18px", cursor: "pointer", padding: 0 }}
                          >×</button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: "#7a4", marginTop: 6, lineHeight: 1.4 }}>
                    🤖 Deine Profilbilder prüft <strong>Fidolin</strong> (unsere KI) oder unser Moderatoren-Team –
                    sie werden danach <strong>freigeschaltet oder abgelehnt</strong>. Du kannst sie auch später jederzeit ändern.
                  </div>
                </div>
              </>
            )}

            <input
              type="password"
              className="vv-splash-input"
              placeholder={mode === "register" ? "Passwort wählen (mind. 4 Zeichen)" : "Passwort"}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              autoComplete={mode === "register" ? "new-password" : "current-password"}
              required
            />

            {error && <div className="vv-splash-error">⚠ {error}</div>}

            <button type="submit" className="vv-btn-cta vv-btn-cta-primary" disabled={busy}>
              {busy ? "..." : (mode === "register" ? "▶ Auf die Warteliste" : "▶ Einloggen")}
            </button>

            <div className="vv-splash-switch">
              {mode === "register" ? (
                <>schon freigeschaltet? <a href="#" onClick={(e) => { e.preventDefault(); setMode("login"); setError(null); }}>einloggen</a></>
              ) : (
                <>neu hier? <a href="#" onClick={(e) => { e.preventDefault(); setMode("register"); setError(null); }}>auf die Warteliste</a></>
              )}
            </div>
          </form>
        )}

        {/* "Wie früher" – Feature-Galerie der Pre-Facebook-Ära */}
        <div style={{
          marginTop: 36, padding: "20px 18px", borderRadius: 18,
          background: "rgba(255,255,255,0.92)", backdropFilter: "blur(4px)",
          boxShadow: "0 10px 40px rgba(0,0,0,0.18)", maxWidth: 760, marginLeft: "auto", marginRight: "auto",
        }}>
          <div style={{ textAlign: "center", marginBottom: 4 }}>
            <span style={{ display: "inline-block", padding: "3px 10px", background: "#ff3e9d", color: "#fff", borderRadius: 12, fontSize: 11, fontWeight: "bold", letterSpacing: 1 }}>VOR FACEBOOK</span>
          </div>
          <h2 style={{ textAlign: "center", margin: "8px 0 2px", color: "#222", fontFamily: "Arial, sans-serif" }}>📼 Alles, was wir vermisst haben</h2>
          <p style={{ textAlign: "center", color: "#666", fontSize: 13, marginTop: 0, marginBottom: 16 }}>Kein Algorithmus. Keine Werbung. Nur Menschen.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
            {[
              ["📌", "Pinnwand", "Glitzer-Smileys & Memories"],
              ["🫶", "*gruscheln*", "Der kleine anonyme Gruß"],
              ["🎁", "Geschenke", "Rose, Bier, Glücksklee"],
              ["🎵", "Profil-Musik", "Dein Lieblingssong im Hintergrund"],
              ["🟢", "ICQ-Status", "Wo bin ich? Was mache ich?"],
              ["💬", "Oh-Oh-Sound", "Bei jeder neuen Nachricht"],
              ["📸", "Foto-Alben", "Erinnerungen sortiert"],
              ["🎨", "Profil-Skin", "Eigenes CSS, wie damals"],
              ["⭐", "Top-Freunde", "Bald wieder anpinnbar"],
              ["📖", "Gästebuch", "Klassisch, kommt zurück"],
            ].map(([icon, title, sub]) => (
              <div key={title} style={{
                padding: "10px 8px", borderRadius: 12, background: "#fff7fc", border: "1px solid #fde4f0",
                textAlign: "center", display: "flex", flexDirection: "column", gap: 2, color: "#222",
              }}>
                <div style={{ fontSize: 22 }}>{icon}</div>
                <div style={{ fontWeight: "bold", fontSize: 13, color: "#c2185b" }}>{title}</div>
                <div style={{ fontSize: 11, color: "#777" }}>{sub}</div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 14, fontSize: 12, color: "#888", fontStyle: "italic" }}>
            ✿ Profil-Hintergrund mit Lieblingssong · Pinnwand · gruscheln · Geschenke · ICQ-Status ✿
          </div>
        </div>

        {/* App-Install CTA – auch fuer Nicht-Eingeloggte sichtbar */}
        <div style={{ textAlign: "center", marginTop: 24 }}>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event("vv-pwa-install"))}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "10px 18px", borderRadius: 999,
              background: "rgba(255,255,255,0.95)", color: "#1f5fa8",
              border: "2px solid rgba(255,255,255,0.6)",
              fontWeight: "bold", fontSize: 14, cursor: "pointer",
              boxShadow: "0 4px 14px rgba(0,0,0,0.18)",
              fontFamily: "Arial, sans-serif",
            }}
          >
            📱 Als App installieren (Haupt-App + Messenger)
          </button>
          <div style={{ fontSize: 11, color: "#fff", textShadow: "0 1px 2px rgba(0,0,0,0.4)", marginTop: 6, opacity: 0.92 }}>
            Für iPhone &amp; Android – mit Schritt-für-Schritt-Anleitung
          </div>
          <InstallTeaser />
        </div>

        {/* Große Info-Sektionen: Stats · Features · Pricing · FAQ · Trust · Final-CTA + Werbung */}
        <LandingExtras />

        <div className="vv-splash-mini-disclaimer">
          Erinnert an MySpace, SchülerVZ, Jappy, Lokalisten, wer-kennt-wen, Knuddels &amp; Co. – nicht angeschlossen, nur inspiriert. ★
        </div>
      </div>
    </div>
  );
}
