"use client";

// 💘 Heimlich verknallt — wähle heimlich, nur bei Gegenseitigkeit gibt's ein Match.
// Selbst-enthalten, dunkel. Niemand erfährt deine Wahl außer bei einem Match.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

const CARD = "rgba(22,22,27,0.92)";
const BORDER = "rgba(255,255,255,0.12)";
const TXT = "#eef1f3";
const MUT = "rgba(238,241,243,0.6)";
const PINK = "#ec4899";

function Avatar({ url, name, size = 40 }) {
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  return (
    <div style={{
      flexShrink: 0, width: size, height: size, borderRadius: 999,
      background: url ? `url(${url}) center/cover, linear-gradient(135deg,#ec4899,#be123c)` : "linear-gradient(135deg,#ec4899,#be123c)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.42, fontWeight: 900, color: "#fff",
    }}>{!url && initial}</div>
  );
}

export default function VerknalltPage() {
  const [state, setState] = useState(null); // null=lädt, "login", oder Objekt
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState("");
  const [celebrate, setCelebrate] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/crush", { credentials: "include" });
      if (r.status === 401) { setState("login"); return; }
      const d = await r.json();
      if (r.ok) setState(d);
    } catch { setState({ picks: [], matches: [], secretAdmirers: 0, max: 5 }); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function add() {
    const u = name.trim().replace(/^@/, "");
    if (!u) { setFlash("⚠ Gib einen Namen ein."); return; }
    setBusy(true); setFlash("");
    try {
      const r = await fetch("/api/crush", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", username: u }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Fehler.");
      setName("");
      if (d.matched) { setCelebrate("💞 Es hat gematcht mit " + (d.target?.displayName || d.target?.username) + "!"); }
      else { setFlash("🔒 Gespeichert — niemand erfährt es. Drück die Daumen 🤞"); }
      load();
    } catch (e) { setFlash("⚠ " + e.message); }
    finally { setBusy(false); }
  }

  async function remove(username) {
    setBusy(true); setFlash("");
    try {
      await fetch("/api/crush", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove", username }),
      });
      load();
    } catch {} finally { setBusy(false); }
  }

  const picks = state && state !== "login" ? (state.picks || []) : [];
  const matches = state && state !== "login" ? (state.matches || []) : [];
  const secretAdmirers = state && state !== "login" ? (state.secretAdmirers || 0) : 0;
  const max = state && state !== "login" ? (state.max || 5) : 5;

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "16px 14px 44px", color: TXT }}>
      <div aria-hidden style={{ position: "fixed", inset: 0, zIndex: -1, background: "linear-gradient(180deg,#1a1015 0%,#0c0d0f 100%)", backgroundColor: "#0c0d0f" }} />

      {/* Hero */}
      <div style={{ borderRadius: 16, overflow: "hidden", marginBottom: 16, background: "linear-gradient(135deg, rgba(236,72,153,0.20), rgba(255,255,255,0.03))", border: `1px solid ${BORDER}`, padding: "18px 18px 20px", boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
        <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1.4, color: "#f9a8d4" }}>💘 HEIMLICH VERKNALLT</div>
        <div style={{ fontSize: 24, fontWeight: 900, color: "#fff", marginTop: 3 }}>Wer gefällt dir insgeheim?</div>
        <div style={{ fontSize: 13, color: MUT, marginTop: 6, lineHeight: 1.5 }}>
          Wähl bis zu {max} Personen. <b style={{ color: TXT }}>Niemand erfährt, wen du gewählt hast</b> — außer ihr wählt euch <b style={{ color: "#f9a8d4" }}>gegenseitig</b>. Dann gibt's ein 💞 Match!
        </div>
      </div>

      {celebrate && (
        <div style={{ borderRadius: 14, background: "linear-gradient(135deg,#ec4899,#be123c)", padding: "14px 16px", marginBottom: 14, textAlign: "center", boxShadow: "0 6px 20px rgba(236,72,153,0.4)" }}>
          <div style={{ fontSize: 30 }}>💞</div>
          <div style={{ fontSize: 15, fontWeight: 900, color: "#fff", marginTop: 2 }}>{celebrate}</div>
          <button type="button" onClick={() => setCelebrate("")} style={{ marginTop: 8, background: "rgba(255,255,255,0.25)", color: "#fff", border: "none", borderRadius: 999, padding: "5px 14px", fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>Juhu! ✨</button>
        </div>
      )}

      {state === "login" ? (
        <div style={{ padding: 18, borderRadius: 14, background: CARD, border: `1px solid ${BORDER}`, textAlign: "center" }}>
          <div style={{ fontSize: 34 }}>🔒</div>
          <div style={{ marginTop: 6, marginBottom: 10, color: MUT }}>Zum Mitmachen bitte einloggen.</div>
          <Link href="/login?next=/verknallt" style={{ display: "inline-block", padding: "10px 18px", borderRadius: 10, background: "linear-gradient(135deg,#ec4899,#be123c)", color: "#fff", fontWeight: 800, textDecoration: "none" }}>🔑 Einloggen</Link>
        </div>
      ) : state === null ? (
        <div style={{ color: MUT }}>💘 Lädt …</div>
      ) : (
        <>
          {/* Geheime Verehrer-Teaser */}
          <div style={{ borderRadius: 14, background: CARD, border: `1px solid ${secretAdmirers > 0 ? "rgba(236,72,153,0.45)" : BORDER}`, padding: "14px 16px", marginBottom: 14, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 30 }}>{secretAdmirers > 0 ? "💌" : "🕵️"}</div>
            <div>
              {secretAdmirers > 0 ? (
                <>
                  <div style={{ fontSize: 15, fontWeight: 900, color: "#f9a8d4" }}>{secretAdmirers} {secretAdmirers === 1 ? "Person ist" : "Personen sind"} heimlich in dich verknallt!</div>
                  <div style={{ fontSize: 12, color: MUT, marginTop: 2 }}>Wähl selbst Leute — vielleicht ist genau die/der Richtige dabei und es matcht. 😉</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 14, fontWeight: 800, color: TXT }}>Noch niemand — aber das kann sich ändern.</div>
                  <div style={{ fontSize: 12, color: MUT, marginTop: 2 }}>Wähl heimlich Leute. Sobald jemand dich zurückwählt, siehst du's hier.</div>
                </>
              )}
            </div>
          </div>

          {/* Matches */}
          {matches.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 900, color: "#fff", marginBottom: 8 }}>💞 Es hat gematcht!</div>
              <div style={{ display: "grid", gap: 8 }}>
                {matches.map((m) => (
                  <div key={m.username} style={{ borderRadius: 12, background: "linear-gradient(135deg, rgba(236,72,153,0.18), rgba(190,18,60,0.10))", border: "1px solid rgba(236,72,153,0.4)", padding: 12, display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar url={m.avatarUrl} name={m.displayName || m.username} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 900, color: "#fff" }}>{m.displayName || m.username} 💘</div>
                      <div style={{ fontSize: 11.5, color: MUT }}>Ihr mögt euch beide!</div>
                    </div>
                    <Link href={`/u/${m.username}`} style={{ padding: "7px 12px", borderRadius: 999, background: "rgba(255,255,255,0.12)", color: "#fff", fontSize: 12, fontWeight: 800, textDecoration: "none" }}>Profil</Link>
                    <Link href={`/messenger/${m.username}`} style={{ padding: "7px 12px", borderRadius: 999, background: "linear-gradient(135deg,#ec4899,#be123c)", color: "#fff", fontSize: 12, fontWeight: 800, textDecoration: "none" }}>💬</Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Neue Wahl */}
          <div style={{ borderRadius: 14, background: CARD, border: `1px solid ${BORDER}`, padding: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 11.5, fontWeight: 800, color: "#f9a8d4", marginBottom: 6 }}>➕ Jemanden heimlich wählen</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") add(); }}
                placeholder="@Benutzername"
                style={{ flex: 1, minWidth: 160, boxSizing: "border-box", borderRadius: 10, padding: "11px 12px", fontSize: 14, fontFamily: "inherit", background: "rgba(0,0,0,0.3)", color: TXT, border: `1.5px solid ${BORDER}` }} />
              <button type="button" onClick={add} disabled={busy || picks.length >= max} style={{
                padding: "11px 18px", borderRadius: 10, border: "none", cursor: (busy || picks.length >= max) ? "not-allowed" : "pointer",
                background: picks.length >= max ? "rgba(255,255,255,0.15)" : "linear-gradient(135deg,#ec4899,#be123c)", color: "#fff", fontWeight: 900, fontSize: 14, fontFamily: "inherit",
              }}>{busy ? "…" : "💘 Wählen"}</button>
            </div>
            <div style={{ fontSize: 11, color: MUT, marginTop: 8 }}>
              🔒 Streng geheim. Den Namen findest du auf dem Profil der Person (unter <b style={{ color: TXT }}>@name</b>). {picks.length}/{max} gewählt.
            </div>
            {flash && <div style={{ fontSize: 12.5, fontWeight: 700, marginTop: 8, color: flash.startsWith("⚠") ? "#fca5a5" : "#86efac" }}>{flash}</div>}
          </div>

          {/* Meine Wahl */}
          <div style={{ fontSize: 13, fontWeight: 900, color: "#fff", marginBottom: 8 }}>💘 Meine geheime Wahl</div>
          {picks.length === 0 ? (
            <div style={{ padding: 18, borderRadius: 14, background: CARD, border: `1px dashed ${BORDER}`, textAlign: "center", color: MUT }}>
              Noch niemanden gewählt. Trau dich! 💘
            </div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {picks.map((p) => (
                <div key={p.username} style={{ borderRadius: 12, background: CARD, border: `1px solid ${p.matched ? "rgba(236,72,153,0.45)" : BORDER}`, padding: 12, display: "flex", alignItems: "center", gap: 10 }}>
                  <Avatar url={p.avatarUrl} name={p.displayName || p.username} size={38} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 800, color: TXT }}>{p.displayName || p.username}</div>
                    <div style={{ fontSize: 11.5, color: p.matched ? "#f9a8d4" : MUT, fontWeight: p.matched ? 800 : 600 }}>
                      {p.matched ? "💞 Match — ihr mögt euch beide!" : "⏳ wartet auf Gegenseitigkeit …"}
                    </div>
                  </div>
                  <button type="button" onClick={() => remove(p.username)} disabled={busy} title="Entfernen" style={{
                    background: "rgba(255,255,255,0.08)", color: MUT, border: `1px solid ${BORDER}`, borderRadius: 999, padding: "6px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                  }}>✕</button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
