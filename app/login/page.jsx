"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useMe } from "@/lib/useMe";

const EMOJIS = ["🙂","😎","🌸","🛹","👑","🎮","💅","🎧","🦄","🌈","🔥","🌟","💖","🎀","🍀","⚡","🦋","☕"];

const DEMO = [
  { username: "anna_2003", label: "Anna* 🌸" },
  { username: "kevin_skater", label: "Kev°§kater 🛹" },
  { username: "lisa_princess", label: "♛Lisa♛ 👑" },
  { username: "max_zocker", label: "MaXxX_Zocker 🎮" },
  { username: "julia_diva", label: "Juli ♥ 💅" },
  { username: "tom_dj", label: "DJ Tom 🎧" },
];

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useMe();
  const [mode, setMode] = useState("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

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
        await api.login(form.username, form.password);
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
    <div className="vv-grid-2">
      <div className="vv-card vv-login-card">
        <h2>{mode === "login" ? "🔑 Einloggen" : "✿ Account erstellen"}</h2>
        <div className="vv-row vv-mt-8" style={{ marginBottom: 10 }}>
          <button
            type="button"
            className={`vv-btn ${mode === "login" ? "vv-btn-pink" : ""}`}
            onClick={() => setMode("login")}
          >Login</button>
          <button
            type="button"
            className={`vv-btn ${mode === "register" ? "vv-btn-pink" : ""}`}
            onClick={() => setMode("register")}
          >Registrieren</button>
        </div>
        <form onSubmit={submit}>
          <label>Benutzername</label>
          <input
            className="vv-input"
            placeholder="z.B. anna_2003"
            value={form.username}
            onChange={(e) => up("username", e.target.value)}
            autoFocus
          />
          {mode === "register" && (
            <>
              <label>Anzeigename (optional)</label>
              <input
                className="vv-input"
                placeholder="z.B. Anna* °·.¸"
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
          />
          {error && (
            <div className="vv-mt-8" style={{ color: "#a00", fontWeight: "bold" }}>
              ⚠ {error}
            </div>
          )}
          <div className="vv-mt-12">
            <button type="submit" className="vv-btn vv-btn-pink" disabled={busy}>
              ▶ {mode === "login" ? "Einloggen" : "Loslegen"}
            </button>
          </div>
        </form>
      </div>

      <div className="vv-card">
        <h3>⚡ Demo-Accounts (Passwort: <code>vibe123</code>)</h3>
        <p className="vv-muted">Direkt einloggen, ohne dich zu registrieren:</p>
        <div className="vv-friends-grid">
          {DEMO.map((u) => (
            <a
              key={u.username}
              href="#"
              className="vv-friend-tile"
              onClick={(e) => { e.preventDefault(); demoLogin(u.username); }}
            >
              <div className="vv-avatar vv-avatar-md" style={{ fontSize: 36 }}>
                {u.label.split(" ").pop()}
              </div>
              <span className="vv-friend-name">{u.label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
