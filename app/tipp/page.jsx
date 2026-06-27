"use client";

// ⚽ WM-Tipp 2026 — voll integriert in VibeVibo.
//   • Spiele tippen (sperrt beim Anpfiff) · Punkte: exakt 4 · Tordifferenz 3 · Tendenz 2
//   • Bestenliste · Admin-Panel (Spiele + Ergebnisse) nur für Admins
//
// Helles VibeVibo-Kartendesign: weiße Karten + dunkler Text, königsblau/orange Akzente.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

const BLUE = "#1e40af";
const ORANGE = "#f97316";
const INK = "#1c1c1e";
const MUTED = "#475569";

const PHASE_LABEL = {
  group: "Gruppenphase",
  r32: "Sechzehntelfinale",
  r16: "Achtelfinale",
  qf: "Viertelfinale",
  sf: "Halbfinale",
  third: "Spiel um Platz 3",
  final: "Finale",
};

function fmtKickoff(ts) {
  if (!ts) return "Termin offen";
  try {
    return new Date(ts).toLocaleString("de-DE", {
      weekday: "short", day: "2-digit", month: "2-digit",
      hour: "2-digit", minute: "2-digit",
    }) + " Uhr";
  } catch { return "—"; }
}

function pointsBadge(p) {
  const map = { 4: ["#16a34a", "Volltreffer"], 3: ["#1e40af", "Tordifferenz"], 2: ["#b45309", "Tendenz"], 0: ["#6b7280", "Daneben"] };
  const [c, label] = map[p] || map[0];
  return (
    <span style={{
      background: `${c}18`, color: c, border: `1px solid ${c}55`,
      padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 800, whiteSpace: "nowrap",
    }}>+{p} · {label}</span>
  );
}

export default function TippPage() {
  const [tab, setTab] = useState("spiele");
  const [data, setData] = useState(null);
  const [board, setBoard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    try {
      const r = await fetch("/api/tipp/matches", { credentials: "include" });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Konnte Spiele nicht laden.");
      setData(d);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }, []);

  const loadBoard = useCallback(async () => {
    try {
      const r = await fetch("/api/tipp/leaderboard", { credentials: "include" });
      const d = await r.json();
      if (r.ok) setBoard(d.leaderboard || []);
    } catch {}
  }, []);

  useEffect(() => { load(); loadBoard(); }, [load, loadBoard]);

  const betMap = {};
  (data?.myBets || []).forEach((b) => { betMap[b.matchId] = b; });

  return (
    <div style={{ maxWidth: 760, margin: "16px auto", padding: 14 }}>
      {/* HERO */}
      <div style={{
        borderRadius: 16, padding: "18px 16px", marginBottom: 14,
        background: "linear-gradient(135deg, #1e40af, #3b82f6 55%, #f97316)",
        border: "3px ridge rgba(255,255,255,0.45)",
        boxShadow: "0 6px 20px rgba(30,64,175,0.35)", color: "#fff",
        textShadow: "0 1px 3px rgba(0,0,0,0.45)",
      }}>
        <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 2, opacity: 0.95 }}>⚽ VIBE★VIBO TIPPSPIEL</div>
        <div style={{ fontSize: 26, fontWeight: 900, marginTop: 2 }}>WM-Tipp 2026</div>
        <div style={{ fontSize: 12.5, fontWeight: 600, marginTop: 4, opacity: 0.97, lineHeight: 1.45 }}>
          Tippe jedes Spiel. Punkte: <b>exakt 4</b> · <b>Tordifferenz 3</b> · <b>Tendenz 2</b>. Tipp-Schluss ist immer der Anpfiff.
        </div>
      </div>

      {/* TABS */}
      <div style={{
        display: "flex", gap: 8, marginBottom: 14, padding: 5, borderRadius: 12,
        background: "rgba(255,255,255,0.7)", border: "1px solid rgba(0,0,0,0.08)",
        boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
      }}>
        <TabBtn active={tab === "spiele"} onClick={() => setTab("spiele")}>⚽ Spiele</TabBtn>
        <TabBtn active={tab === "tabelle"} onClick={() => { setTab("tabelle"); loadBoard(); }}>🏆 Bestenliste</TabBtn>
      </div>

      {err && (
        <div style={{ padding: 14, borderRadius: 10, background: "#fee2e2", border: "1px solid #fecaca", color: "#991b1b", fontWeight: 700, marginBottom: 12 }}>
          ⚠ {err}
        </div>
      )}

      {/* SPIELE */}
      {tab === "spiele" && (
        <>
          {data?.isAdmin && <AdminPanel onChanged={() => { load(); loadBoard(); }} matches={data?.matches || []} />}

          {loading ? (
            <Muted>⏳ Lädt …</Muted>
          ) : !data?.me ? (
            <Muted>
              🔑 <Link href="/login?next=/tipp" style={{ color: BLUE, fontWeight: 800 }}>Einloggen</Link>, um mitzutippen.
            </Muted>
          ) : (data?.matches || []).length === 0 ? (
            <Muted>Noch keine Spiele angelegt. {data?.isAdmin ? "Leg oben welche an! ⚽" : "Bald geht's los! ⚽"}</Muted>
          ) : (
            (data.matches).map((m) => (
              <MatchCard key={m.id} m={m} bet={betMap[m.id]} onSaved={() => { load(); }} />
            ))
          )}
        </>
      )}

      {/* BESTENLISTE */}
      {tab === "tabelle" && (
        <div>
          {board.length === 0 ? (
            <Muted>Noch keine Punkte vergeben. Sei der/die Erste! ⚽</Muted>
          ) : (
            board.map((u, i) => (
              <div key={u.id} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
                marginBottom: 8, borderRadius: 12,
                background: i < 3 ? "#fff7ed" : "#ffffff",
                border: `1px solid ${i < 3 ? "rgba(249,115,22,0.4)" : "rgba(0,0,0,0.08)"}`,
                boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
              }}>
                <div style={{ width: 28, textAlign: "center", fontSize: 18, fontWeight: 900, color: i === 0 ? "#d97706" : i === 1 ? "#64748b" : i === 2 ? "#b45309" : "#94a3b8" }}>
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                </div>
                <Link href={`/u/${u.username}`} style={{ flex: 1, color: INK, textDecoration: "none", fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {u.displayName || u.username}
                  <span style={{ color: MUTED, fontSize: 11, fontWeight: 500 }}> · {u.bets} Tipps</span>
                </Link>
                <div style={{ fontWeight: 900, fontSize: 16, color: ORANGE }}>{u.points}</div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function TabBtn({ active, onClick, children }) {
  return (
    <button type="button" onClick={onClick} style={{
      flex: 1, padding: "11px 12px", borderRadius: 9, fontFamily: "inherit",
      background: active ? "linear-gradient(135deg, #1e40af, #3b82f6)" : "#ffffff",
      color: active ? "#fff" : MUTED,
      border: active ? "1px solid rgba(255,255,255,0.5)" : "1px solid rgba(0,0,0,0.1)",
      fontSize: 14, fontWeight: 800, cursor: "pointer",
      boxShadow: active ? "0 2px 8px rgba(30,64,175,0.3)" : "none",
      textShadow: active ? "0 1px 1px rgba(0,0,0,0.25)" : "none",
    }}>{children}</button>
  );
}

function Muted({ children }) {
  return (
    <div style={{
      padding: 28, textAlign: "center", color: MUTED, fontSize: 14, lineHeight: 1.6,
      background: "rgba(255,255,255,0.7)", borderRadius: 14, border: "1px dashed rgba(0,0,0,0.1)",
    }}>
      {children}
    </div>
  );
}

function MatchCard({ m, bet, onSaved }) {
  const finished = m.status === "finished";
  const locked = finished || (m.kickoffAt && m.kickoffAt <= Date.now());
  const [h, setH] = useState(bet ? String(bet.predHome) : "");
  const [a, setA] = useState(bet ? String(bet.predAway) : "");
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState("");

  async function save() {
    if (h === "" || a === "") { setFlash("⚠ Beide Felder ausfüllen."); return; }
    setBusy(true); setFlash("");
    try {
      const r = await fetch("/api/tipp/bet", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId: m.id, predHome: Number(h), predAway: Number(a) }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Speichern fehlgeschlagen.");
      setFlash("✅ Tipp gespeichert!");
      setTimeout(() => setFlash(""), 2500);
      onSaved?.();
    } catch (e) { setFlash("⚠ " + e.message); }
    finally { setBusy(false); }
  }

  return (
    <div style={{
      marginBottom: 10, padding: 14, borderRadius: 14,
      background: "#ffffff", border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 0.5, color: BLUE, textTransform: "uppercase" }}>
          {PHASE_LABEL[m.phase] || m.phase}
        </span>
        <span style={{ fontSize: 11, color: MUTED }}>{fmtKickoff(m.kickoffAt)}</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ flex: 1, textAlign: "right", fontWeight: 800, fontSize: 15, color: INK }}>{m.teamHome}</div>

        {finished ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 900, fontSize: 20, color: INK }}>
            <span>{m.scoreHome}</span><span style={{ color: "#94a3b8" }}>:</span><span>{m.scoreAway}</span>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input inputMode="numeric" value={h} disabled={locked} maxLength={2}
              onChange={(e) => setH(e.target.value.replace(/[^0-9]/g, ""))}
              style={scoreInput(locked)} />
            <span style={{ color: "#94a3b8", fontWeight: 900 }}>:</span>
            <input inputMode="numeric" value={a} disabled={locked} maxLength={2}
              onChange={(e) => setA(e.target.value.replace(/[^0-9]/g, ""))}
              style={scoreInput(locked)} />
          </div>
        )}

        <div style={{ flex: 1, textAlign: "left", fontWeight: 800, fontSize: 15, color: INK }}>{m.teamAway}</div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginTop: 10, minHeight: 24, flexWrap: "wrap" }}>
        <div style={{ fontSize: 11.5, color: MUTED }}>
          {bet ? <>Dein Tipp: <b style={{ color: INK }}>{bet.predHome}:{bet.predAway}</b></> : (locked ? "Kein Tipp abgegeben" : "Noch kein Tipp")}
        </div>
        {finished && bet ? pointsBadge(bet.points) : null}
        {!locked && (
          <button type="button" onClick={save} disabled={busy} style={{
            padding: "7px 16px", borderRadius: 9, border: "none", cursor: busy ? "wait" : "pointer",
            background: "linear-gradient(135deg, #1e40af, #3b82f6)", color: "#fff",
            fontWeight: 800, fontSize: 12.5, fontFamily: "inherit", boxShadow: "0 2px 6px rgba(30,64,175,0.3)",
          }}>{busy ? "…" : bet ? "Ändern" : "Tippen"}</button>
        )}
      </div>
      {flash && <div style={{ marginTop: 6, fontSize: 11.5, fontWeight: 700, color: flash.startsWith("⚠") ? "#b91c1c" : "#15803d" }}>{flash}</div>}
      {locked && !finished && <div style={{ marginTop: 6, fontSize: 11, color: "#94a3b8" }}>🔒 Tipp-Schluss erreicht</div>}
    </div>
  );
}

function scoreInput(locked) {
  return {
    width: 42, height: 40, textAlign: "center", fontSize: 18, fontWeight: 900,
    borderRadius: 10, border: `1.5px solid ${locked ? "rgba(0,0,0,0.12)" : "rgba(30,64,175,0.4)"}`,
    background: locked ? "#f1f5f9" : "#fff",
    color: INK, fontFamily: "inherit", boxSizing: "border-box",
  };
}

// ---- Admin ----
function AdminPanel({ onChanged, matches }) {
  const [open, setOpen] = useState(false);
  const [home, setHome] = useState("");
  const [away, setAway] = useState("");
  const [phase, setPhase] = useState("group");
  const [kickoff, setKickoff] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function post(body) {
    const r = await fetch("/api/tipp/admin", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d?.error || "Fehler.");
    return d;
  }

  async function createMatch() {
    if (!home.trim() || !away.trim()) { setMsg("⚠ Beide Teams nötig."); return; }
    setBusy(true); setMsg("");
    try {
      await post({ action: "create_match", teamHome: home.trim(), teamAway: away.trim(), phase, kickoffAt: kickoff || null });
      setHome(""); setAway(""); setKickoff("");
      setMsg("✅ Spiel angelegt.");
      onChanged?.();
    } catch (e) { setMsg("⚠ " + e.message); }
    finally { setBusy(false); }
  }

  async function setResult(id) {
    const sh = prompt("Tore Heim?");
    if (sh === null) return;
    const sa = prompt("Tore Auswärts?");
    if (sa === null) return;
    try {
      await post({ action: "set_result", matchId: id, scoreHome: Number(sh), scoreAway: Number(sa) });
      onChanged?.();
    } catch (e) { alert("⚠ " + e.message); }
  }

  async function del(id) {
    if (!confirm("Spiel wirklich löschen? Alle Tipps dazu gehen verloren.")) return;
    try { await post({ action: "delete_match", matchId: id }); onChanged?.(); }
    catch (e) { alert("⚠ " + e.message); }
  }

  return (
    <div style={{ marginBottom: 14, borderRadius: 14, border: "1px solid rgba(249,115,22,0.45)", background: "#fffbeb", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
      <button type="button" onClick={() => setOpen((o) => !o)} style={{
        width: "100%", padding: "11px 14px", textAlign: "left", cursor: "pointer",
        background: "none", border: "none", color: "#b45309", fontWeight: 800, fontSize: 13.5, fontFamily: "inherit",
      }}>
        🛠 Admin: Spiele & Ergebnisse {open ? "▲" : "▼"}
      </button>
      {open && (
        <div style={{ padding: "0 14px 14px" }}>
          <div style={{ display: "grid", gap: 6, marginBottom: 8 }}>
            <div style={{ display: "flex", gap: 6 }}>
              <input value={home} onChange={(e) => setHome(e.target.value)} placeholder="Heim (z. B. Deutschland)" style={adminInput} />
              <input value={away} onChange={(e) => setAway(e.target.value)} placeholder="Auswärts (z. B. Brasilien)" style={adminInput} />
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <select value={phase} onChange={(e) => setPhase(e.target.value)} style={{ ...adminInput, flex: "0 0 150px" }}>
                <option value="group">Gruppenphase</option>
                <option value="r32">Sechzehntelfinale</option>
                <option value="r16">Achtelfinale</option>
                <option value="qf">Viertelfinale</option>
                <option value="sf">Halbfinale</option>
                <option value="third">Spiel um Platz 3</option>
                <option value="final">Finale</option>
              </select>
              <input type="datetime-local" value={kickoff} onChange={(e) => setKickoff(e.target.value)} style={adminInput} />
            </div>
            <button type="button" onClick={createMatch} disabled={busy} style={{
              padding: "9px 14px", borderRadius: 9, border: "none", cursor: "pointer",
              background: "linear-gradient(135deg, #f97316, #ea580c)", color: "#fff", fontWeight: 800, fontSize: 13, fontFamily: "inherit",
            }}>{busy ? "…" : "➕ Spiel anlegen"}</button>
            {msg && <div style={{ fontSize: 11.5, fontWeight: 700, color: msg.startsWith("⚠") ? "#b91c1c" : "#15803d" }}>{msg}</div>}
          </div>

          {(matches || []).length > 0 && (
            <div style={{ marginTop: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: MUTED, marginBottom: 4 }}>SPIELE VERWALTEN</div>
              {matches.map((m) => (
                <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 0", fontSize: 12, color: INK, borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {m.teamHome} – {m.teamAway} {m.status === "finished" ? `(${m.scoreHome}:${m.scoreAway})` : ""}
                  </span>
                  <button type="button" onClick={() => setResult(m.id)} style={miniBtn("#1e40af")}>Ergebnis</button>
                  <button type="button" onClick={() => del(m.id)} style={miniBtn("#ef4444")}>🗑</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const adminInput = {
  flex: 1, padding: "9px 11px", borderRadius: 8, fontSize: 12.5, minWidth: 0,
  border: "1px solid rgba(0,0,0,0.15)", background: "#fff",
  color: INK, fontFamily: "inherit", boxSizing: "border-box",
};

function miniBtn(color) {
  return {
    padding: "4px 9px", borderRadius: 7, border: `1px solid ${color}55`,
    background: `${color}14`, color, fontSize: 11, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
  };
}
