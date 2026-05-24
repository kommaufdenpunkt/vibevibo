"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useMe } from "@/lib/useMe";

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

const EMOJIS = ["🙂","😎","🌸","🛹","👑","🎮","💅","🎧","🦄","🌈","🔥","🌟","💖","🎀"];

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
  const [form, setForm] = useState({ username: "", password: "", displayName: "", emoji: "🌸" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ users: 0, online: 0 });
  const inputRef = useRef(null);

  useEffect(() => {
    const t = setInterval(() => setHookIdx((i) => (i + 1) % HOOKS.length), 2400);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    api.listUsers()
      .then((d) => setStats({ users: d.users.length, online: d.users.filter((u) => u.online).length }))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (mode === "register" || mode === "login") {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [mode]);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "register") {
        await api.register({
          username: form.username.trim(),
          displayName: form.displayName.trim() || form.username.trim(),
          password: form.password,
          emoji: form.emoji,
        });
      } else {
        await api.login(form.username.trim(), form.password);
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

  async function demoLogin(username) {
    setBusy(true);
    setError(null);
    try {
      await api.login(username, "vibe123");
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

        {mode === "idle" && (
          <div className="vv-splash-cta">
            <button type="button" className="vv-btn-cta vv-btn-cta-primary" onClick={() => setMode("register")}>
              ⚡ Account erstellen
            </button>
            <button type="button" className="vv-btn-cta vv-btn-cta-ghost" onClick={() => setMode("login")}>
              schon Mitglied? Einloggen
            </button>
          </div>
        )}

        {(mode === "register" || mode === "login") && (
          <form className="vv-splash-form" onSubmit={submit}>
            <div className="vv-splash-form-title">
              {mode === "register" ? "✿ Profil in 10 Sekunden ✿" : "🔑 Welcome back"}
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
                <div className="vv-splash-emoji-row">
                  <span className="vv-splash-emoji-label">Avatar:</span>
                  {EMOJIS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      className={`vv-splash-emoji${form.emoji === e ? " vv-active" : ""}`}
                      onClick={() => setForm({ ...form, emoji: e })}
                    >{e}</button>
                  ))}
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
              {busy ? "..." : (mode === "register" ? "▶ Profil erstellen" : "▶ Einloggen")}
            </button>

            <div className="vv-splash-switch">
              {mode === "register" ? (
                <>schon dabei? <a href="#" onClick={(e) => { e.preventDefault(); setMode("login"); setError(null); }}>einloggen</a></>
              ) : (
                <>neu hier? <a href="#" onClick={(e) => { e.preventDefault(); setMode("register"); setError(null); }}>Account anlegen</a></>
              )}
            </div>
          </form>
        )}

        {mode === "idle" && stats.users > 0 && (
          <div className="vv-splash-demos">
            <div className="vv-splash-demos-label">… oder schnell mit einem Demo-Profil reinschauen:</div>
            <div className="vv-splash-demo-row">
              {[
                { u: "anna_2003", e: "🌸", n: "Anna" },
                { u: "kevin_skater", e: "🛹", n: "Kev" },
                { u: "lisa_princess", e: "👑", n: "Lisa" },
                { u: "max_zocker", e: "🎮", n: "MaX" },
              ].map((d) => (
                <button
                  key={d.u}
                  type="button"
                  className="vv-splash-demo"
                  onClick={() => demoLogin(d.u)}
                  disabled={busy}
                >
                  <span className="vv-splash-demo-emoji">{d.e}</span>
                  <span className="vv-splash-demo-name">{d.n}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="vv-splash-mini-disclaimer">
          Erinnert an MySpace, SchülerVZ, Jappy, Lokalisten, wer-kennt-wen &amp; Co. – nicht angeschlossen, nur inspiriert.
        </div>
      </div>
    </div>
  );
}
