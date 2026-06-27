"use client";

// ⚽ WM-Tipp 2026 — durchgehendes Dark-Stadion-Theme.
//   Rasen-/Nacht-Hintergrund + dunkle Glas-Karten mit hellem Text + dezente Pitch-Markierungen.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

const FOUR = "https://tipp.4ever1.tv";

// Palette (Dark-Stadion)
const TXT = "#eaf1ed";
const MUT = "rgba(234,241,237,0.6)";
const GREEN = "#22c55e";
const BLUE = "#3b82f6";
const GOLD = "#fbbf24";
const CARD = "rgba(12, 26, 20, 0.62)";
const CARD_BORDER = "rgba(255,255,255,0.12)";

// Hintergrund: Nachthimmel-Blau oben → Rasengrün unten + feine Mähstreifen.
const PITCH_BG =
  "repeating-linear-gradient(90deg, rgba(255,255,255,0.022) 0 64px, rgba(255,255,255,0) 64px 128px)," +
  "linear-gradient(180deg, #0b1f3a 0%, #0c2e2a 42%, #0a3321 70%, #06241a 100%)";

function avatarUrl(a) {
  if (!a) return null;
  return a.startsWith("/uploads") ? FOUR + a : a;
}

const PHASE_LABEL = {
  group: "Gruppenphase", r32: "Sechzehntelfinale", r16: "Achtelfinale",
  qf: "Viertelfinale", sf: "Halbfinale", "3rd": "Spiel um Platz 3", third: "Spiel um Platz 3", final: "Finale",
};

function fmtKickoff(ts) {
  if (!ts) return "Termin offen";
  try {
    return new Date(ts).toLocaleString("de-DE", {
      weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
    }) + " Uhr";
  } catch { return "—"; }
}

function ptColor(p) {
  return p === 4 ? "#4ade80" : p === 3 ? "#60a5fa" : p === 2 ? "#fcd34d" : "#94a3b8";
}
function pointsBadge(p) {
  const label = { 4: "Volltreffer", 3: "Tordifferenz", 2: "Tendenz", 0: "Daneben" }[p] || "Daneben";
  const c = ptColor(p);
  return (
    <span style={{ background: `${c}22`, color: c, border: `1px solid ${c}66`, padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 800, whiteSpace: "nowrap" }}>
      +{p} · {label}
    </span>
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
    <div style={{ position: "relative", background: PITCH_BG, backgroundAttachment: "fixed", minHeight: "100vh", padding: "18px 0 40px", overflow: "hidden" }}>
      {/* Dezente Pitch-Markierungen */}
      <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: 150, left: "50%", width: 300, height: 300, transform: "translateX(-50%)", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.05)" }} />
        <div style={{ position: "absolute", top: 298, left: 0, right: 0, height: 2, background: "rgba(255,255,255,0.045)" }} />
        <div style={{ position: "absolute", top: 290, left: "50%", width: 16, height: 16, transform: "translateX(-50%)", borderRadius: "50%", background: "rgba(255,255,255,0.07)" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 760, margin: "0 auto", padding: "0 14px" }}>
        {/* HERO */}
        <div style={{
          borderRadius: 16, padding: "18px 16px", marginBottom: 14,
          background: "linear-gradient(135deg, #103a8e, #1e63d6 50%, #16a34a)",
          border: "1px solid rgba(255,255,255,0.18)", boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
          color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.5)",
        }}>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 2, opacity: 0.92 }}>⚽ VIBE★VIBO TIPPSPIEL</div>
          <div style={{ fontSize: 26, fontWeight: 900, marginTop: 2 }}>WM-Tipp 2026</div>
          <div style={{ fontSize: 12.5, fontWeight: 600, marginTop: 4, opacity: 0.95, lineHeight: 1.45 }}>
            Tippe jedes Spiel. Punkte: <b>exakt 4</b> · <b>Tordifferenz 3</b> · <b>Tendenz 2</b>. Tipp-Schluss ist immer der Anpfiff.
          </div>
        </div>

        {/* TABS */}
        <div style={{
          display: "flex", gap: 8, marginBottom: 14, padding: 5, borderRadius: 12,
          background: CARD, border: `1px solid ${CARD_BORDER}`, backdropFilter: "blur(6px)",
        }}>
          <TabBtn active={tab === "spiele"} onClick={() => setTab("spiele")}>⚽ Spiele</TabBtn>
          <TabBtn active={tab === "tabelle"} onClick={() => { setTab("tabelle"); loadBoard(); }}>🏆 Bestenliste</TabBtn>
        </div>

        {err && (
          <div style={{ padding: 14, borderRadius: 10, background: "rgba(239,68,68,0.16)", border: "1px solid rgba(239,68,68,0.45)", color: "#fecaca", fontWeight: 700, marginBottom: 12 }}>⚠ {err}</div>
        )}

        {tab === "spiele" && (
          <>
            {data?.isAdmin && <AdminPanel onChanged={() => { load(); loadBoard(); }} matches={data?.matches || []} />}
            {loading ? (
              <Muted>⏳ Lädt …</Muted>
            ) : (data?.matches || []).length === 0 ? (
              <Muted>Noch keine Spiele. {data?.isAdmin ? "Importiere oben die Daten von 4ever1 oder leg Spiele an! ⚽" : "Bald geht's los! ⚽"}</Muted>
            ) : (
              (data.matches).map((m) => (
                <MatchCard key={m.id} m={m} bet={betMap[m.id]} canTip={!!data?.me} onSaved={() => load()} />
              ))
            )}
          </>
        )}

        {tab === "tabelle" && (
          <div>
            {board.length === 0 ? (
              <Muted>Noch keine Punkte. Importiere oben die 4ever1-Daten oder tippe los! ⚽</Muted>
            ) : (
              board.map((u, i) => (
                <div key={u.id} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", marginBottom: 8, borderRadius: 12,
                  background: i < 3 ? "rgba(251,191,36,0.12)" : CARD,
                  border: `1px solid ${i < 3 ? "rgba(251,191,36,0.4)" : CARD_BORDER}`, backdropFilter: "blur(6px)",
                }}>
                  <div style={{ width: 28, textAlign: "center", fontSize: 18, fontWeight: 900, color: i === 0 ? GOLD : i === 1 ? "#cbd5e1" : i === 2 ? "#d8a657" : MUT }}>
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                  </div>
                  {avatarUrl(u.avatarUrl) && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={avatarUrl(u.avatarUrl)} alt="" style={{ width: 30, height: 30, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "1px solid rgba(255,255,255,0.2)" }} />
                  )}
                  {u.imported ? (
                    <div style={{ flex: 1, color: TXT, fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {u.displayName}<span style={{ color: MUT, fontSize: 11, fontWeight: 500 }}> · {u.bets} Spiele</span>
                    </div>
                  ) : (
                    <Link href={`/u/${u.username}`} style={{ flex: 1, color: TXT, textDecoration: "none", fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {u.displayName || u.username}<span style={{ color: MUT, fontSize: 11, fontWeight: 500 }}> · {u.bets} Tipps</span>
                    </Link>
                  )}
                  <div style={{ fontWeight: 900, fontSize: 16, color: GOLD }}>{u.points}</div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, children }) {
  return (
    <button type="button" onClick={onClick} style={{
      flex: 1, padding: "11px 12px", borderRadius: 9, fontFamily: "inherit",
      background: active ? "linear-gradient(135deg, #16a34a, #15803d)" : "transparent",
      color: active ? "#fff" : MUT,
      border: active ? "1px solid rgba(255,255,255,0.25)" : "1px solid transparent",
      fontSize: 14, fontWeight: 800, cursor: "pointer",
      boxShadow: active ? "0 2px 10px rgba(22,163,74,0.4)" : "none",
      textShadow: active ? "0 1px 1px rgba(0,0,0,0.3)" : "none",
    }}>{children}</button>
  );
}

function Muted({ children }) {
  return (
    <div style={{ padding: 28, textAlign: "center", color: MUT, fontSize: 14, lineHeight: 1.6, background: CARD, borderRadius: 14, border: `1px dashed ${CARD_BORDER}`, backdropFilter: "blur(6px)" }}>
      {children}
    </div>
  );
}

function MatchCard({ m, bet, canTip, onSaved }) {
  const finished = m.status === "finished";
  const locked = finished || (m.kickoffAt && m.kickoffAt <= Date.now());
  const [h, setH] = useState(bet ? String(bet.predHome) : "");
  const [a, setA] = useState(bet ? String(bet.predAway) : "");
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState("");
  const [showTips, setShowTips] = useState(false);
  const tips = m.importedTips || [];

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
    <div style={{ marginBottom: 10, padding: 14, borderRadius: 14, background: CARD, border: `1px solid ${CARD_BORDER}`, backdropFilter: "blur(6px)", boxShadow: "0 2px 10px rgba(0,0,0,0.25)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 0.5, color: "#7dd3a0", textTransform: "uppercase" }}>
          {PHASE_LABEL[m.phase] || m.phase}{m.groupLetter ? ` · Gruppe ${m.groupLetter}` : ""}
        </span>
        <span style={{ fontSize: 11, color: MUT }}>{fmtKickoff(m.kickoffAt)}</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ flex: 1, textAlign: "right", fontWeight: 800, fontSize: 15, color: TXT }}>
          {m.teamHome} {m.homeFlag || ""}
        </div>
        {finished ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 900, fontSize: 20, color: "#fff" }}>
            <span>{m.scoreHome}</span><span style={{ color: MUT }}>:</span><span>{m.scoreAway}</span>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input inputMode="numeric" value={h} disabled={locked || !canTip} maxLength={2}
              onChange={(e) => setH(e.target.value.replace(/[^0-9]/g, ""))} style={scoreInput(locked || !canTip)} />
            <span style={{ color: MUT, fontWeight: 900 }}>:</span>
            <input inputMode="numeric" value={a} disabled={locked || !canTip} maxLength={2}
              onChange={(e) => setA(e.target.value.replace(/[^0-9]/g, ""))} style={scoreInput(locked || !canTip)} />
          </div>
        )}
        <div style={{ flex: 1, textAlign: "left", fontWeight: 800, fontSize: 15, color: TXT }}>
          {m.awayFlag || ""} {m.teamAway}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginTop: 10, minHeight: 22, flexWrap: "wrap" }}>
        <div style={{ fontSize: 11.5, color: MUT }}>
          {bet ? <>Dein Tipp: <b style={{ color: TXT }}>{bet.predHome}:{bet.predAway}</b></> : (canTip ? (locked ? "Kein Tipp abgegeben" : "Noch kein Tipp") : "")}
        </div>
        {finished && bet ? pointsBadge(bet.points) : null}
        {!locked && canTip && (
          <button type="button" onClick={save} disabled={busy} style={{
            padding: "7px 16px", borderRadius: 9, border: "none", cursor: busy ? "wait" : "pointer",
            background: "linear-gradient(135deg, #16a34a, #15803d)", color: "#fff", fontWeight: 800, fontSize: 12.5,
            fontFamily: "inherit", boxShadow: "0 2px 8px rgba(22,163,74,0.4)",
          }}>{busy ? "…" : bet ? "Ändern" : "Tippen"}</button>
        )}
      </div>
      {flash && <div style={{ marginTop: 6, fontSize: 11.5, fontWeight: 700, color: flash.startsWith("⚠") ? "#fca5a5" : "#86efac" }}>{flash}</div>}

      {tips.length > 0 && (
        <div style={{ marginTop: 8, borderTop: `1px solid ${CARD_BORDER}`, paddingTop: 8 }}>
          <button type="button" onClick={() => setShowTips((s) => !s)} style={{
            background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
            color: "#7dd3a0", fontSize: 12, fontWeight: 800, padding: 0,
          }}>
            {showTips ? "▲" : "▼"} 👁 {tips.length} Tipps der Runde
          </button>
          {showTips && (
            <div style={{ marginTop: 6, display: "grid", gap: 4 }}>
              {tips.map((t, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: TXT }}>
                  {avatarUrl(t.avatar) ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={avatarUrl(t.avatar)} alt="" style={{ width: 20, height: 20, borderRadius: "50%", objectFit: "cover" }} />
                  ) : <span style={{ width: 20, textAlign: "center" }}>👤</span>}
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.tipper}</span>
                  <b>{t.home}:{t.away}</b>{t.joker ? <span title="Joker">🃏</span> : null}
                  {finished && t.points != null && (
                    <span style={{ color: ptColor(t.points), fontWeight: 800, fontSize: 11 }}>+{t.points}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function scoreInput(locked) {
  return {
    width: 42, height: 40, textAlign: "center", fontSize: 18, fontWeight: 900, borderRadius: 10,
    border: `1.5px solid ${locked ? "rgba(255,255,255,0.12)" : "rgba(34,197,94,0.5)"}`,
    background: locked ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.25)", color: TXT, fontFamily: "inherit", boxSizing: "border-box",
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
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState("");

  async function post(body) {
    const r = await fetch("/api/tipp/admin", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d?.error || "Fehler.");
    return d;
  }

  async function runImport() {
    if (!confirm("Alle Daten von tipp.4ever1.tv holen und übernehmen?\n(Teams, Spiele, Ergebnisse, Bestenliste, alle Tipps)")) return;
    setImporting(true); setImportMsg("⏳ Hole Daten von 4ever1 … das dauert ein paar Sekunden.");
    try {
      const r = await fetch("/api/tipp/import-4ever1", { method: "POST", credentials: "include" });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Import fehlgeschlagen.");
      setImportMsg(`✅ Import fertig: ${d.teams} Teams · ${d.matches} Spiele · ${d.users} Tipper · ${d.tips} Tipps.`);
      onChanged?.();
    } catch (e) { setImportMsg("⚠ " + e.message); }
    finally { setImporting(false); }
  }

  async function createMatch() {
    if (!home.trim() || !away.trim()) { setMsg("⚠ Beide Teams nötig."); return; }
    setBusy(true); setMsg("");
    try {
      await post({ action: "create_match", teamHome: home.trim(), teamAway: away.trim(), phase, kickoffAt: kickoff || null });
      setHome(""); setAway(""); setKickoff(""); setMsg("✅ Spiel angelegt."); onChanged?.();
    } catch (e) { setMsg("⚠ " + e.message); }
    finally { setBusy(false); }
  }

  async function setResult(id) {
    const sh = prompt("Tore Heim?"); if (sh === null) return;
    const sa = prompt("Tore Auswärts?"); if (sa === null) return;
    try { await post({ action: "set_result", matchId: id, scoreHome: Number(sh), scoreAway: Number(sa) }); onChanged?.(); }
    catch (e) { alert("⚠ " + e.message); }
  }

  async function del(id) {
    if (!confirm("Spiel wirklich löschen?")) return;
    try { await post({ action: "delete_match", matchId: id }); onChanged?.(); }
    catch (e) { alert("⚠ " + e.message); }
  }

  return (
    <div style={{ marginBottom: 14, borderRadius: 14, border: "1px solid rgba(249,115,22,0.5)", background: "rgba(48,28,8,0.55)", backdropFilter: "blur(6px)", overflow: "hidden" }}>
      <button type="button" onClick={() => setOpen((o) => !o)} style={{
        width: "100%", padding: "11px 14px", textAlign: "left", cursor: "pointer",
        background: "none", border: "none", color: "#fdba74", fontWeight: 800, fontSize: 13.5, fontFamily: "inherit",
      }}>🛠 Admin: Import & Spiele {open ? "▲" : "▼"}</button>
      {open && (
        <div style={{ padding: "0 14px 14px" }}>
          <div style={{ marginBottom: 12, padding: 12, borderRadius: 10, background: "rgba(0,0,0,0.25)", border: `1px solid ${CARD_BORDER}` }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: TXT, marginBottom: 4 }}>📥 Von tipp.4ever1.tv übernehmen</div>
            <div style={{ fontSize: 11.5, color: MUT, marginBottom: 8, lineHeight: 1.4 }}>
              Holt Teams, Spiele, Ergebnisse, Bestenliste und alle Tipps direkt von 4ever1. Mehrfach ausführbar (aktualisiert).
            </div>
            <button type="button" onClick={runImport} disabled={importing} style={{
              padding: "9px 14px", borderRadius: 9, border: "none", cursor: importing ? "wait" : "pointer",
              background: "linear-gradient(135deg, #16a34a, #15803d)", color: "#fff", fontWeight: 800, fontSize: 13, fontFamily: "inherit",
            }}>{importing ? "⏳ Importiere …" : "⬇️ Jetzt von 4ever1 importieren"}</button>
            {importMsg && <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: importMsg.startsWith("⚠") ? "#fca5a5" : importMsg.startsWith("✅") ? "#86efac" : MUT }}>{importMsg}</div>}
          </div>

          <div style={{ display: "grid", gap: 6, marginBottom: 8 }}>
            <div style={{ display: "flex", gap: 6 }}>
              <input value={home} onChange={(e) => setHome(e.target.value)} placeholder="Heim" style={adminInput} />
              <input value={away} onChange={(e) => setAway(e.target.value)} placeholder="Auswärts" style={adminInput} />
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <select value={phase} onChange={(e) => setPhase(e.target.value)} style={{ ...adminInput, flex: "0 0 150px" }}>
                <option value="group">Gruppenphase</option>
                <option value="r16">Achtelfinale</option>
                <option value="qf">Viertelfinale</option>
                <option value="sf">Halbfinale</option>
                <option value="final">Finale</option>
              </select>
              <input type="datetime-local" value={kickoff} onChange={(e) => setKickoff(e.target.value)} style={adminInput} />
            </div>
            <button type="button" onClick={createMatch} disabled={busy} style={{
              padding: "9px 14px", borderRadius: 9, border: "none", cursor: "pointer",
              background: "linear-gradient(135deg, #f97316, #ea580c)", color: "#fff", fontWeight: 800, fontSize: 13, fontFamily: "inherit",
            }}>{busy ? "…" : "➕ Spiel manuell anlegen"}</button>
            {msg && <div style={{ fontSize: 11.5, fontWeight: 700, color: msg.startsWith("⚠") ? "#fca5a5" : "#86efac" }}>{msg}</div>}
          </div>

          {(matches || []).length > 0 && (
            <div style={{ marginTop: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: MUT, marginBottom: 4 }}>SPIELE VERWALTEN ({matches.length})</div>
              <div style={{ maxHeight: 240, overflowY: "auto" }}>
                {matches.map((m) => (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 0", fontSize: 12, color: TXT, borderBottom: `1px solid ${CARD_BORDER}` }}>
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {m.teamHome} – {m.teamAway} {m.status === "finished" ? `(${m.scoreHome}:${m.scoreAway})` : ""}
                    </span>
                    <button type="button" onClick={() => setResult(m.id)} style={miniBtn("#60a5fa")}>Ergebnis</button>
                    <button type="button" onClick={() => del(m.id)} style={miniBtn("#f87171")}>🗑</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const adminInput = {
  flex: 1, padding: "9px 11px", borderRadius: 8, fontSize: 12.5, minWidth: 0,
  border: "1px solid rgba(255,255,255,0.18)", background: "rgba(0,0,0,0.3)", color: TXT, fontFamily: "inherit", boxSizing: "border-box",
};

function miniBtn(color) {
  return {
    padding: "4px 9px", borderRadius: 7, border: `1px solid ${color}66`,
    background: `${color}22`, color, fontSize: 11, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
  };
}
