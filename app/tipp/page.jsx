"use client";

// ⚽ WM-Tipp 2026 — „Deutschland 1990 bei Flutlicht" (dunkel + Schwarz-Rot-Gold-Zickzackbande).

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

const FOUR = "https://tipp.4ever1.tv";

// 🎵 Profil-Songs (Refrain-Loop via YouTube-Embed, lizenzkonform).
// Beim Seitenaufruf wird ABWECHSELND der nächste Song gespielt (rotiert via localStorage).
const SONGS = [
  { id: "W_ug7KQbTGo", start: 32, end: 67, title: "Wincent Weiss – Kurz für immer" },
  { id: "SniCL4xbRqw", start: 38, end: 74, title: "Helene Fischer – Heute Nacht" },
];
function pickSong() {
  if (typeof window === "undefined") return SONGS[0];
  let n = 0;
  try {
    const prev = parseInt(localStorage.getItem("vv_song_idx") || "-1", 10);
    n = ((Number.isFinite(prev) ? prev : -1) + 1) % SONGS.length;
    if (!Number.isFinite(n) || n < 0) n = 0;
    localStorage.setItem("vv_song_idx", String(n));
  } catch {}
  return SONGS[n] || SONGS[0];
}

let _ytApiPromise = null;
function loadYouTubeAPI() {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (_ytApiPromise) return _ytApiPromise;
  _ytApiPromise = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { try { prev && prev(); } catch {} resolve(window.YT); };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  });
  return _ytApiPromise;
}

// Palette (dunkel + Deutschland-Flagge)
const SCHWARZ = "#0e0e11";
const ROT = "#e0241f";
const GOLD = "#FFCE00";
const TXT = "#eef1f3";
const MUT = "rgba(238,241,243,0.6)";
const CARD = "rgba(26,26,31,0.72)";
const CARD_SOLID = "rgba(22,22,27,0.92)";
const BORDER = "rgba(255,255,255,0.12)";

// Die ikonische 90er-Zickzack-Bande (Schwarz-Rot-Gold, diagonal).
const FLAG_STRIPE = "repeating-linear-gradient(115deg, #141414 0 8px, #DD0000 8px 16px, #FFCE00 16px 24px)";
// Dunkler Hintergrund (Flutlicht-Nacht) mit Hauch Diagonale.
const PAGE_BG =
  "repeating-linear-gradient(115deg, rgba(255,255,255,0.015) 0 60px, rgba(255,255,255,0) 60px 120px)," +
  "linear-gradient(180deg, #141519 0%, #101013 55%, #0c0d0f 100%)";

function FlagBand({ h = 8 }) {
  return <div aria-hidden style={{ height: h, background: FLAG_STRIPE }} />;
}

function avatarUrl(a) {
  if (!a) return null;
  return a.startsWith("/uploads") ? FOUR + a : a;
}

const PHASE_LABEL = {
  group: "Gruppenphase", r32: "Sechzehntelfinale", r16: "Achtelfinale",
  qf: "Viertelfinale", sf: "Halbfinale", "3rd": "Spiel um Platz 3", third: "Spiel um Platz 3", final: "Finale",
};

// Tore-Auswahl im Tipp-Dropdown (0–10 reicht für jedes realistische Ergebnis).
const SCORE_OPTS = Array.from({ length: 11 }, (_, i) => i);

// K.o.-Entscheidungsart (4ever1-Wertung): Belohnung wenn richtig, Abzug wenn falsch.
const DEC_LONG = { reg: "In 90 Minuten", aet: "Verlängerung", pen: "Elfmeterschießen" };
const DEC_SHORT = { reg: "90 Min", aet: "n.V.", pen: "i.E." };
const DEC_REWARD = { reg: 1, aet: 3, pen: 5 };
const DEC_PENALTY = { reg: -2, aet: -3, pen: -4 };
const DEC_ORDER = ["reg", "aet", "pen"];

// Header (.vv-banner) + Footer (.vv-footer) dunkel — NUR wenn <html> die Klasse "tipp-dark" trägt.
// Logo & Navigation bleiben (heller Text auf dunkler Fläche), Links bleiben gold lesbar.
const TIPP_CHROME_CSS = `
html.tipp-dark, html.tipp-dark body { background: #0c0d0f !important; }
html.tipp-dark .vv-banner {
  background: linear-gradient(180deg, #17181c 0%, #0c0d0f 100%) !important;
  border: none !important;
  border-bottom: 2px solid rgba(255,206,0,0.45) !important;
  box-shadow: 0 2px 12px rgba(0,0,0,0.6) !important;
}
html.tipp-dark .vv-banner .vv-slogan { color: #c9ccd1 !important; }
html.tipp-dark .vv-footer {
  background: #0c0d0f !important;
  color: #9aa0a6 !important;
  border: none !important;
  border-top: 2px solid rgba(221,0,0,0.4) !important;
  box-shadow: none !important;
}
html.tipp-dark .vv-footer a { color: #ffce00 !important; }
html.tipp-dark .vv-footer .vv-muted { color: #71767c !important; }
`;

function fmtKickoff(ts) {
  if (!ts) return "Termin offen";
  try {
    return new Date(ts).toLocaleString("de-DE", {
      weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
    }) + " Uhr";
  } catch { return "—"; }
}

function ptColor(p) {
  return p === 4 ? "#4ade80" : p === 3 ? "#60a5fa" : p === 2 ? "#fcd34d" : "#cbd5e1";
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
// Generischer Punkte-Badge (auch negativ — K.o.-Wertung mit Abzügen).
function tippBadge(p) {
  const n = Number(p) || 0;
  const c = n > 0 ? "#4ade80" : n < 0 ? "#f87171" : "#cbd5e1";
  return (
    <span style={{ background: `${c}22`, color: c, border: `1px solid ${c}66`, padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 800, whiteSpace: "nowrap" }}>
      {n > 0 ? "+" : ""}{n} Pkt
    </span>
  );
}

// 🔴 Einheitliche Spiel-Status-Erkennung — überall identisch genutzt.
// Primär 4ever1-Status (läuft = Status ist weder 'scheduled' noch 'finished'),
// Anstoßzeit nur als Notnagel (angepfiffen & plausibel < 2,5 h her).
const LIVE_FALLBACK_MS = 150 * 60 * 1000;
const _NOT_LIVE_STATUS = new Set(["", "scheduled", "upcoming", "pending", "ns", "postponed", "tbd"]);
function matchFinished(m) { return m && m.status === "finished"; }
function matchState(m, now) {
  if (!m) return "upcoming";
  if (m.status === "finished") return "finished";
  const st = String(m.status || "").toLowerCase();
  if (st && !_NOT_LIVE_STATUS.has(st)) return "live"; // 4ever1 sagt eindeutig: läuft
  if (m.kickoffAt && m.kickoffAt <= now) {
    return m.kickoffAt > now - LIVE_FALLBACK_MS ? "live" : "stale"; // angepfiffen: kurz=live, lange her=gespielt
  }
  return "upcoming";
}
function matchLive(m, now) { return matchState(m, now) === "live"; }

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

  // Stilles Nachladen — KEIN Spinner, KEIN Flackern, Auswahl/Scroll bleiben.
  const silentLoad = useCallback(async () => {
    try {
      const r = await fetch("/api/tipp/matches", { credentials: "include" });
      const d = await r.json();
      if (r.ok) setData(d);
    } catch {}
  }, []);

  const loadBoard = useCallback(async () => {
    try {
      const r = await fetch("/api/tipp/leaderboard", { credentials: "include" });
      const d = await r.json();
      if (r.ok) setBoard(d.leaderboard || []);
    } catch {}
  }, []);

  useEffect(() => { load(); loadBoard(); }, [load, loadBoard]);

  // Live: alle 45 s still aktualisieren + beim Zurückkehren zum Tab. So tauchen
  // neue/laufende Spiele von selbst auf, ohne sichtbares Neuladen.
  useEffect(() => {
    const t = setInterval(() => { silentLoad(); loadBoard(); }, 20000);
    const onFocus = () => { silentLoad(); loadBoard(); };
    window.addEventListener("focus", onFocus);
    return () => { clearInterval(t); window.removeEventListener("focus", onFocus); };
  }, [silentLoad, loadBoard]);

  // Macht den globalen Header (.vv-banner) + Footer (.vv-footer) NUR auf /tipp dunkel.
  // Klasse am <html>; Cleanup beim Verlassen → Rest von vibevibo.de bleibt unverändert.
  useEffect(() => {
    const el = document.documentElement;
    el.classList.add("tipp-dark");
    return () => el.classList.remove("tipp-dark");
  }, []);

  const betMap = {};
  (data?.myBets || []).forEach((b) => { betMap[b.matchId] = b; });

  return (
    <>
      {/* Header + Footer NUR auf /tipp dunkel (greift über html.tipp-dark, Rest der Seite bleibt hell). */}
      <style dangerouslySetInnerHTML={{ __html: TIPP_CHROME_CSS }} />
      {/* Voll-Viewport-Hintergrund: deckt ALLES ab (auch hinter Footer/Werbung unter dem Inhalt). */}
      <div aria-hidden style={{ position: "fixed", inset: 0, zIndex: -1, background: PAGE_BG, backgroundColor: "#0c0d0f", backgroundAttachment: "fixed" }} />
      <div style={{ minHeight: "100vh", padding: "18px 0 44px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 14px" }}>
        <SongPlayer />
        <NextUp matches={data?.matches || []} />
        {/* HERO */}
        <div style={{ borderRadius: 16, overflow: "hidden", marginBottom: 14, background: CARD_SOLID, border: `1px solid ${BORDER}`, boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
          <FlagBand h={11} />
          <div style={{ padding: "16px 18px 18px" }}>
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1.6, color: "#ff6b66" }}>⚽ VIBE★VIBO TIPPSPIEL · ANNO '90</div>
            <div style={{ fontSize: 28, fontWeight: 900, fontStyle: "italic", color: "#fff", marginTop: 2, letterSpacing: -0.5 }}>
              WM-TIPP 2026 <span style={{ fontStyle: "normal" }}>🇩🇪</span>
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: MUT, marginTop: 5, lineHeight: 1.5 }}>
              <b style={{ color: TXT }}>Gruppenphase:</b> Ergebnis tippen — exakt <b style={{ color: TXT }}>4</b> · Tordifferenz <b style={{ color: TXT }}>3</b> · Tendenz <b style={{ color: TXT }}>2</b>.
              <br />
              <b style={{ color: "#ffce00" }}>K.o.-Runde – Sieg oder Aus:</b> Ergebnis tippen (4/3/2) <b style={{ color: TXT }}>plus</b> <b style={{ color: TXT }}>Wer kommt weiter?</b> (+1) und <b style={{ color: TXT }}>Wie wird entschieden?</b> — 90 Min <b style={{ color: TXT }}>+1</b> · Verlängerung <b style={{ color: TXT }}>+3</b> · Elfmeter <b style={{ color: TXT }}>+5</b>. Daneben kostet's <b style={{ color: "#f87171" }}>−2 / −3 / −4</b>. Je mutiger, desto fetter!
              <br />
              <span style={{ opacity: 0.85 }}>Tipp-Schluss: <b style={{ color: TXT }}>20 Minuten vor Anpfiff</b>.</span>
            </div>
          </div>
          <FlagBand h={5} />
        </div>

        {/* TABS */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14, padding: 5, borderRadius: 12, background: CARD, border: `1px solid ${BORDER}`, backdropFilter: "blur(6px)" }}>
          <TabBtn active={tab === "spiele"} onClick={() => setTab("spiele")}>⚽ Spiele</TabBtn>
          <TabBtn active={tab === "tabelle"} onClick={() => { setTab("tabelle"); loadBoard(); }}>⚡ Tabelle</TabBtn>
          <TabBtn active={tab === "auswertung"} onClick={() => setTab("auswertung")}>📊 Auswertung</TabBtn>
          <TabBtn active={tab === "orakel"} onClick={() => setTab("orakel")}>🔮 Orakel</TabBtn>
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
              <SpieleListe matches={data.matches} betMap={betMap} canTip={!!data?.me} onSaved={() => load()} />
            )}
          </>
        )}

        {tab === "tabelle" && <Blitztabelle board={board} matches={data?.matches || []} />}

        {tab === "auswertung" && <Auswertung />}
        {tab === "orakel" && <PodiumOrakel canTip={!!data?.me} />}
        </div>
      </div>
    </>
  );
}

// Provisorische Punkte (Gruppen-Wertung 4/3/2) für die Live-Hochrechnung.
function projGroupScore(ph, pa, sh, sa) {
  if (ph == null || pa == null || sh == null || sa == null) return 0;
  const PH = Number(ph), PA = Number(pa), SH = Number(sh), SA = Number(sa);
  if (![PH, PA, SH, SA].every(Number.isFinite)) return 0;
  if (PH === SH && PA === SA) return 4;          // exaktes Ergebnis
  if (PH - PA === SH - SA) return 3;             // Tordifferenz
  const sgn = (x) => (x > 0 ? 1 : x < 0 ? -1 : 0);
  if (sgn(PH - PA) === sgn(SH - SA)) return 2;   // Tendenz
  return 0;
}

// 📅 Spielplan — alle Spiele nach Runde gruppiert (wann spielt wer), aktualisiert sich automatisch.
function Spielplan({ matches, betMap = {}, canTip, onSaved }) {
  const now = Date.now();
  const order = ["group", "r32", "r16", "qf", "sf", "third", "3rd", "final"];
  const byPhase = {};
  for (const m of (matches || [])) { const p = m.phase || "group"; (byPhase[p] = byPhase[p] || []).push(m); }
  const phases = Object.keys(byPhase).sort((a, b) => {
    const ia = order.indexOf(a), ib = order.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  if (!phases.length) return <Muted>Noch keine Spiele — der Plan füllt sich automatisch von 4ever1. ⚽</Muted>;
  const dateShort = (ts) => ts ? new Date(ts).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" }) : "offen";
  const timeShort = (ts) => ts ? new Date(ts).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) : "";

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ fontSize: 12, color: MUT }}>📅 Kompletter Spielplan — <b style={{ color: TXT }}>anstehende Spiele kannst du hier direkt tippen</b>. Auto-Update von 4ever1.</div>
      {phases.map((p) => {
        const games = byPhase[p].slice().sort((a, b) => (a.kickoffAt || 0) - (b.kickoffAt || 0));
        const dated = games.filter((g) => g.kickoffAt);
        let range = "Termin offen";
        if (dated.length) {
          const first = dateShort(dated[0].kickoffAt), last = dateShort(dated[dated.length - 1].kickoffAt);
          range = first + (last !== first ? " – " + last : "");
        }
        return (
          <div key={p} style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${BORDER}`, background: CARD_SOLID }}>
            <FlagBand h={5} />
            <div style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, borderBottom: `1px solid ${BORDER}` }}>
              <span style={{ fontSize: 13.5, fontWeight: 900, color: "#fff" }}>{PHASE_LABEL[p] || p}</span>
              <span style={{ fontSize: 11, color: MUT, fontWeight: 700, whiteSpace: "nowrap" }}>{range} · {games.length} Spiele</span>
            </div>
            <div style={{ padding: 8, display: "grid", gap: 4 }}>
              {games.map((m) => {
                const st = matchState(m, now);
                // Anstehende Spiele → volle Tipp-Karte (tippbar bis 20 Min vor Anpfiff)
                if (st === "upcoming") {
                  return <MatchCard key={m.id} m={m} bet={betMap[m.id]} canTip={canTip} onSaved={onSaved} />;
                }
                // Gespielte / laufende Spiele → kompakte Zeile mit Ergebnis/Live-Stand
                return (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 8px", borderRadius: 8, background: "rgba(255,255,255,0.03)" }}>
                    <div style={{ width: 88, flexShrink: 0, fontSize: 10.5, color: MUT, lineHeight: 1.3, fontVariantNumeric: "tabular-nums" }}>
                      {m.kickoffAt ? <>{dateShort(m.kickoffAt)}<br />{timeShort(m.kickoffAt)} Uhr</> : "Termin offen"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, color: TXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {m.homeFlag || ""} {m.teamHome} – {m.teamAway} {m.awayFlag || ""}
                    </div>
                    <div style={{ flexShrink: 0, textAlign: "right", minWidth: 56 }}>
                      {st === "finished" ? (
                        <span style={{ fontWeight: 900, color: "#fff", fontSize: 13 }}>{m.scoreHome != null ? `${m.scoreHome}:${m.scoreAway}` : "–"}</span>
                      ) : (
                        <span style={{ fontWeight: 900, color: "#ff5a55", fontSize: 11.5, whiteSpace: "nowrap" }}>{m.scoreHome != null ? `${m.scoreHome}:${m.scoreAway} ` : ""}● LIVE</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ⚡ Blitztabelle — Gesamtpunkte in WEISS, daneben Live-Hochrechnung „+X → neue Summe"
// für aktuell LAUFENDE Spiele (was käme dazu, wenn sie jetzt so endeten).
function Blitztabelle({ board, matches }) {
  const now = Date.now();
  const liveMatches = (matches || []).filter(
    (m) => matchLive(m, now) && m.scoreHome != null && m.scoreAway != null
  );
  const delta = {};
  for (const m of liveMatches) {
    for (const t of (m.importedTips || [])) {
      const p = projGroupScore(t.home, t.away, m.scoreHome, m.scoreAway);
      if (!p || !t.tipper) continue;
      delta[t.tipper] = (delta[t.tipper] || 0) + p;
    }
  }
  const anyLive = liveMatches.length > 0;

  return (
    <div style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${BORDER}` }}>
      <FlagBand h={6} />
      {board.length === 0 ? (
        <div style={{ background: CARD_SOLID }}><Muted bare>Noch keine Punkte. Importiere oben die 4ever1-Daten oder tippe los! ⚽</Muted></div>
      ) : (
        <div style={{ background: CARD_SOLID, padding: 8 }}>
          {anyLive && (
            <div style={{ fontSize: 11.5, color: "#ffce00", fontWeight: 700, padding: "4px 8px 10px", lineHeight: 1.4 }}>
              ⚡ Live-Hochrechnung: laufende Spiele sind als <b style={{ color: "#4ade80" }}>+Punkte</b> <span style={{ color: MUT }}>→</span> <b style={{ color: "#fff" }}>neue Summe</b> eingerechnet.
            </div>
          )}
          {board.map((u, i) => {
            const d = delta[u.displayName] || delta[u.username] || 0;
            const newTotal = (Number(u.points) || 0) + d;
            const rankColor = i === 0 ? GOLD : i === 1 ? "#cbd5e1" : i === 2 ? "#d8a657" : MUT;
            return (
              <div key={u.id} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", marginBottom: 6, borderRadius: 12,
                background: i < 3 ? "linear-gradient(135deg, rgba(255,206,0,0.16), rgba(255,255,255,0.03))" : "rgba(255,255,255,0.04)",
                border: `1px solid ${i < 3 ? "rgba(255,206,0,0.45)" : BORDER}`,
                boxShadow: i < 3 ? "0 2px 10px rgba(0,0,0,0.35)" : "none",
              }}>
                <div style={{ width: 26, textAlign: "center", fontSize: 18, fontWeight: 900, color: rankColor }}>
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                </div>
                {avatarUrl(u.avatarUrl) && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={avatarUrl(u.avatarUrl)} alt="" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "1px solid rgba(255,255,255,0.2)" }} />
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
                {/* Punkte: Summe in WEISS, daneben +Zuwachs → neue Summe (nur bei Live-Spielen) */}
                <div style={{ textAlign: "right", flexShrink: 0, minWidth: 54 }}>
                  <div style={{ fontWeight: 900, fontSize: 18, color: "#fff", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{u.points}</div>
                  {d > 0 && (
                    <div style={{ fontSize: 11.5, fontWeight: 800, marginTop: 3, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                      <span style={{ color: "#4ade80" }}>+{d}</span>
                      <span style={{ color: MUT }}> → </span>
                      <span style={{ color: "#fff" }}>{newTotal}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// 📊 Auswertung — alle Tipps öffentlich, pro Spiel, mit Punkten (erst ab Anpfiff sichtbar).
function Auswertung() {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState({});
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/tipp/evaluation", { credentials: "include" });
        const d = await r.json();
        if (r.ok) setData(d);
      } catch {}
    })();
  }, []);
  if (!data) return <Muted>⏳ Lädt …</Muted>;
  const now = Date.now();
  const matches = (data.matches || []).slice().sort((a, b) => (b.kickoffAt || 0) - (a.kickoffAt || 0));
  if (matches.length === 0) return <Muted>Noch keine Spiele. Importiere oben die 4ever1-Daten! ⚽</Muted>;

  // ALLE Tipper sammeln (8 importierte + echte) — mit Gesamtpunkten + Tipp je Spiel.
  // Tipper nach NAME (klein, getrimmt) zusammenführen — so wird der echte Account
  // automatisch mit dem importierten 4ever1-Tipper gleichen Namens verknüpft (kein Doppel).
  const tip = {};
  const norm = (s) => String(s || "").trim().toLowerCase();
  (data.importedTips || []).forEach((t) => {
    if (!t.tipper) return;
    const k = norm(t.tipper);
    tip[k] = tip[k] || { key: k, name: t.tipper, avatar: t.avatar, total: 0, ext: {}, real: {} };
    if (!tip[k].avatar && t.avatar) tip[k].avatar = t.avatar;
    if (t.points != null) tip[k].total += Number(t.points) || 0;
    tip[k].ext[t.extMatchId] = t;
  });
  (data.realBets || []).forEach((b) => {
    const nm = b.displayName || b.username; if (!nm) return;
    const k = norm(b.username || nm);
    tip[k] = tip[k] || { key: k, name: nm, avatar: b.avatarUrl, total: 0, ext: {}, real: {} };
    if (!tip[k].avatar && b.avatarUrl) tip[k].avatar = b.avatarUrl;
    if (b.points != null) tip[k].total += Number(b.points) || 0;
    tip[k].real[b.matchId] = b;
  });
  const tippers = Object.values(tip).sort((a, b) => b.total - a.total);

  // 🏅 Bester Tipper je Runde (nur beendete Spiele)
  const phaseOrder = ["group", "r32", "r16", "qf", "sf", "third", "3rd", "final"];
  const finById = {}, finByExt = {};
  matches.forEach((m) => {
    const fin = m.status === "finished";
    finById[m.id] = { phase: m.phase || "group", fin };
    if (m.extId != null) finByExt[m.extId] = { phase: m.phase || "group", fin };
  });
  const perPhase = {};
  tippers.forEach((u) => {
    for (const ext in u.ext) {
      const t = u.ext[ext], info = finByExt[ext];
      if (!info || !info.fin || t.points == null) continue;
      (perPhase[info.phase] = perPhase[info.phase] || {});
      perPhase[info.phase][u.name] = (perPhase[info.phase][u.name] || 0) + Number(t.points || 0);
    }
    for (const mid in u.real) {
      const b = u.real[mid], info = finById[mid];
      if (!info || !info.fin || b.points == null) continue;
      (perPhase[info.phase] = perPhase[info.phase] || {});
      perPhase[info.phase][u.name] = (perPhase[info.phase][u.name] || 0) + Number(b.points || 0);
    }
  });
  const roundWinners = phaseOrder.filter((ph) => perPhase[ph]).map((ph) => {
    const entries = Object.entries(perPhase[ph]).sort((a, b) => b[1] - a[1]);
    return { phase: ph, name: entries[0][0], pts: entries[0][1] };
  });

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ fontSize: 12.5, color: TXT, fontWeight: 700, marginBottom: 2 }}>Wer hat was getippt — und wie kamen die Punkte zustande? <span style={{ color: MUT, fontWeight: 500 }}>Fremde Tipps erst ab Anpfiff.</span></div>
      <div style={{ fontSize: 10.5, color: MUT, lineHeight: 1.5, padding: "6px 10px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, marginBottom: 2 }}>
        🎯 <b style={{ color: TXT }}>4</b> exakt · <b style={{ color: TXT }}>3</b> Tordiff. · <b style={{ color: TXT }}>2</b> Tendenz · ➡️ Weiterkommen <b style={{ color: TXT }}>+1</b> · ⏱️ 90 Min/Verl./Elfm. <b style={{ color: "#4ade80" }}>+1/+3/+5</b> <b style={{ color: "#f87171" }}>−2/−3/−4</b> · 🔮 Podium-Orakel
      </div>

      {/* 🏅 Tipper der Runde */}
      {roundWinners.length > 0 && (
        <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${BORDER}`, background: CARD_SOLID, marginBottom: 4 }}>
          <div style={{ padding: "9px 12px", fontSize: 12, fontWeight: 800, color: MUT, borderBottom: `1px solid ${BORDER}` }}>🏅 Tipper der Runde</div>
          <div style={{ padding: 8, display: "grid", gap: 3 }}>
            {roundWinners.map((w) => (
              <div key={w.phase} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: TXT, padding: "5px 6px" }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: "#ff6b66", textTransform: "uppercase", width: 84, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{PHASE_LABEL[w.phase] || w.phase}</span>
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 700 }}>🏅 {w.name}</span>
                <b style={{ color: w.pts > 0 ? "#4ade80" : w.pts < 0 ? "#f87171" : "#cbd5e1", fontVariantNumeric: "tabular-nums" }}>{w.pts > 0 ? "+" : ""}{w.pts}</b>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 🏅 Gesamtpunkte aller Tipper */}
      {tippers.length > 0 && (
        <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${BORDER}`, background: CARD_SOLID, marginBottom: 4 }}>
          <div style={{ padding: "9px 12px", fontSize: 12, fontWeight: 800, color: MUT, borderBottom: `1px solid ${BORDER}` }}>🏅 Punkte gesamt ({tippers.length})</div>
          <div style={{ padding: 8, display: "grid", gap: 3 }}>
            {tippers.map((u, i) => (
              <div key={u.key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: TXT, padding: "5px 6px" }}>
                <span style={{ width: 20, textAlign: "center", fontWeight: 900, color: i === 0 ? GOLD : i === 1 ? "#cbd5e1" : i === 2 ? "#d8a657" : MUT }}>{i + 1}</span>
                {avatarUrl(u.avatar) ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={avatarUrl(u.avatar)} alt="" style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover" }} />
                ) : <span style={{ width: 22, textAlign: "center" }}>👤</span>}
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 700 }}>{u.name}</span>
                <b style={{ color: u.total > 0 ? "#4ade80" : u.total < 0 ? "#f87171" : "#cbd5e1", fontVariantNumeric: "tabular-nums" }}>{u.total > 0 ? "+" : ""}{u.total}</b>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pro Spiel: ALLE Tipper mit ihren Punkten (nach Punkten sortiert) */}
      {matches.map((m) => {
        const started = m.status === "finished" || (m.kickoffAt && m.kickoffAt <= now);
        const finishedM = m.status === "finished";
        const isKO = m.phase && m.phase !== "group";
        const isOpen = !!open[m.id];
        const rows = tippers.map((u) => {
          const t = u.ext[m.extId], b = u.real[m.id];
          let tipStr = "nicht getippt", joker = false, pts = null, has = false;
          if (t) { has = true; tipStr = `${t.home}:${t.away}`; joker = !!t.joker; pts = finishedM ? t.points : null; }
          else if (b) {
            has = true;
            tipStr = isKO
              ? `${b.advPick ? (b.advPick === "home" ? m.teamHome : m.teamAway) : "—"}${b.decPick ? " · " + (DEC_SHORT[b.decPick] || "") : ""}`
              : `${b.predHome}:${b.predAway}`;
            pts = finishedM ? b.points : null;
          }
          return { u, tipStr, joker, pts, has };
        }).sort((a, b) => (b.pts ?? -1e9) - (a.pts ?? -1e9));
        const tipCount = rows.filter((r) => r.has).length;
        const stateM = matchState(m, now);
        const metaLeft = m.phase === "group" && m.groupLetter ? `Gr. ${m.groupLetter}` : (PHASE_LABEL[m.phase] || m.phase || "");
        return (
          <div key={m.id} style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${BORDER}`, background: CARD }}>
            <button type="button" onClick={() => setOpen((o) => ({ ...o, [m.id]: !o[m.id] }))} style={{
              width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
              padding: "10px 12px", color: TXT, display: "flex", alignItems: "center", gap: 8,
            }}>
              <span style={{ fontSize: 15, flexShrink: 0 }}>{stateM === "finished" ? "✅" : stateM === "live" ? "🔴" : "⏳"}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 800, fontSize: 13 }}>
                  {m.homeFlag || ""} {m.teamHome} <b style={{ color: "#fff" }}>{stateM === "finished" && m.scoreHome != null ? `${m.scoreHome}:${m.scoreAway}` : stateM === "live" && m.scoreHome != null ? `${m.scoreHome}:${m.scoreAway}` : "–:–"}</b> {m.teamAway} {m.awayFlag || ""}
                </div>
                <div style={{ fontSize: 10.5, color: MUT, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {metaLeft} · {fmtKickoff(m.kickoffAt)} · {tipCount} Tipp(s)
                </div>
              </div>
              <span style={{ color: MUT, fontSize: 11, flexShrink: 0 }}>{isOpen ? "▲" : "▼"}</span>
            </button>
            {isOpen && (
              <div style={{ padding: "0 12px 10px" }}>
                {!started ? (
                  <div style={{ fontSize: 12, color: MUT, padding: "6px 0" }}>🔒 Tipps sichtbar ab Anpfiff.</div>
                ) : (
                  <div style={{ display: "grid", gap: 4 }}>
                    {rows.map((r) => (
                      <AuswRow key={r.u.key} name={r.u.name} avatar={r.u.avatar} tip={r.tipStr} joker={r.joker} pts={r.pts} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AuswRow({ name, avatar, tip, joker, pts }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: TXT }}>
      {avatarUrl(avatar) ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={avatarUrl(avatar)} alt="" style={{ width: 20, height: 20, borderRadius: "50%", objectFit: "cover" }} />
      ) : <span style={{ width: 20, textAlign: "center" }}>👤</span>}
      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
      <b style={{ whiteSpace: "nowrap" }}>{tip}</b>{joker ? <span title="Joker">🃏</span> : null}
      {pts != null && <span style={{ color: pts > 0 ? "#4ade80" : pts < 0 ? "#f87171" : "#cbd5e1", fontWeight: 800, fontSize: 11 }}>{pts > 0 ? "+" : ""}{pts}</span>}
    </div>
  );
}

// 🔮 Podium Orakel — Top 3 tippen (Weltmeister / Vize / Platz 3)
function PodiumOrakel({ canTip }) {
  const [teams, setTeams] = useState([]);
  const [pick, setPick] = useState({ champion: "", second: "", third: "" });
  const [board, setBoard] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/tipp/podium", { credentials: "include" });
      const d = await r.json();
      if (r.ok) {
        setTeams(d.teams || []);
        if (d.podium) setPick({ champion: d.podium.champion || "", second: d.podium.second || "", third: d.podium.third || "" });
        setBoard(d.board || []);
      }
    } catch {}
    finally { setLoaded(true); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const teamName = (code) => { const t = teams.find((x) => x.code === code); return t ? `${t.flag || ""} ${t.name}` : (code || "—"); };
  function setSlot(slot, code) { setPick((p) => ({ ...p, [slot]: code })); }
  function optionsFor(slot) {
    const used = new Set(["champion", "second", "third"].filter((k) => k !== slot).map((k) => pick[k]).filter(Boolean));
    return teams.filter((t) => !used.has(t.code));
  }

  async function save() {
    setBusy(true); setMsg("");
    try {
      const r = await fetch("/api/tipp/podium", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pick),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Speichern fehlgeschlagen.");
      setMsg("✅ Orakel gespeichert!");
      setTimeout(() => setMsg(""), 2500);
      load();
    } catch (e) { setMsg("⚠ " + e.message); }
    finally { setBusy(false); }
  }

  const SLOTS = [
    { key: "champion", label: "🥇 Weltmeister", color: GOLD },
    { key: "second", label: "🥈 Vize-Weltmeister", color: "#cbd5e1" },
    { key: "third", label: "🥉 Platz 3", color: "#d8a657" },
  ];

  return (
    <div>
      <div style={{ borderRadius: 16, overflow: "hidden", marginBottom: 14, background: CARD_SOLID, border: `1px solid ${BORDER}`, boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
        <FlagBand h={8} />
        <div style={{ padding: "16px 16px 18px" }}>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1.4, color: "#ff6b66" }}>🔮 PODIUM ORAKEL</div>
          <div style={{ fontSize: 13, color: MUT, marginTop: 4, lineHeight: 1.45 }}>
            Wer holt den Pokal? Tippe dein <b style={{ color: TXT }}>Top-3-Podium</b> der WM 2026.
          </div>
          {teams.length === 0 ? (
            <Muted>{loaded ? "Noch keine Teams da — der Admin muss zuerst die 4ever1-Daten importieren. ⚽" : "⏳ Lädt …"}</Muted>
          ) : (
            <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
              {SLOTS.map((s) => (
                <div key={s.key}>
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: s.color, marginBottom: 5 }}>{s.label}</div>
                  <select value={pick[s.key]} disabled={!canTip || busy}
                    onChange={(e) => setSlot(s.key, e.target.value)}
                    style={{ width: "100%", padding: "11px 12px", borderRadius: 10, fontSize: 14, fontFamily: "inherit", boxSizing: "border-box",
                      background: "rgba(0,0,0,0.3)", color: TXT, border: `1.5px solid ${BORDER}` }}>
                    <option value="">— Team wählen —</option>
                    {optionsFor(s.key).map((t) => <option key={t.code} value={t.code}>{t.flag || ""} {t.name}</option>)}
                  </select>
                </div>
              ))}
              {canTip ? (
                <button type="button" onClick={save} disabled={busy} style={{
                  marginTop: 4, padding: "11px 16px", borderRadius: 10, border: "none", cursor: busy ? "wait" : "pointer",
                  background: "linear-gradient(135deg, #FFCE00, #e0b400)", color: "#141414", fontWeight: 900, fontSize: 14, fontFamily: "inherit",
                }}>{busy ? "…" : "🔮 Orakel speichern"}</button>
              ) : (
                <Muted>Zum Orakeln bitte einloggen.</Muted>
              )}
              {msg && <div style={{ fontSize: 12, fontWeight: 700, color: msg.startsWith("⚠") ? "#fca5a5" : "#86efac" }}>{msg}</div>}
            </div>
          )}
        </div>
        <FlagBand h={5} />
      </div>

      {board.length > 0 && (
        <div style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${BORDER}`, background: CARD_SOLID }}>
          <div style={{ padding: "10px 14px", fontSize: 12, fontWeight: 800, color: MUT, borderBottom: `1px solid ${BORDER}` }}>👁 Was die anderen orakeln ({board.length})</div>
          <div style={{ padding: 8 }}>
            {board.map((u, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderBottom: `1px solid ${BORDER}` }}>
                {avatarUrl(u.avatarUrl) ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={avatarUrl(u.avatarUrl)} alt="" style={{ width: 26, height: 26, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                ) : <span style={{ width: 26, textAlign: "center" }}>👤</span>}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: TXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.displayName || u.username}</div>
                  <div style={{ fontSize: 11.5, color: MUT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    🥇 {teamName(u.champion)} · 🥈 {teamName(u.second)} · 🥉 {teamName(u.third)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ⏱ Nächstes Spiel + nächstes Deutschland-Spiel mit Live-Countdown.
function NextUp({ matches }) {
  const [, force] = useState(0);
  useEffect(() => { const t = setInterval(() => force((x) => x + 1), 1000); return () => clearInterval(t); }, []);
  const now = Date.now();
  const liveNow = (matches || []).filter((m) => matchLive(m, now)).sort((a, b) => (a.kickoffAt || 0) - (b.kickoffAt || 0));
  const upcoming = (matches || [])
    .filter((m) => matchState(m, now) === "upcoming" && m.kickoffAt && m.kickoffAt > now)
    .sort((a, b) => a.kickoffAt - b.kickoffAt);
  // Die nächsten Spiele zeigen (nicht nur eins) — bis zu 6 anstehende.
  const nextGames = upcoming.slice(0, 6);
  const firstMin = upcoming.length ? Math.floor(upcoming[0].kickoffAt / 60000) : null;
  const isDE = (m) => /deutschland|germany/i.test(m.teamHome || "") || /deutschland|germany/i.test(m.teamAway || "");
  const nextDE = upcoming.find(isDE);
  if (!liveNow.length && !nextGames.length && !nextDE) return null;

  function cd(ts) {
    const s = Math.max(0, Math.floor((ts - now) / 1000));
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
    return d > 0 ? `${d}T ${h}h ${m}m` : h > 0 ? `${h}h ${m}m ${ss}s` : `${m}m ${ss}s`;
  }
  const Card = ({ label, m, accent, live }) => !m ? null : (
    <div style={{ flex: "1 1 220px", minWidth: 0, borderRadius: 12, padding: "10px 12px", background: CARD, border: `1px solid ${live ? "rgba(221,0,0,0.6)" : BORDER}` }}>
      <div style={{ fontSize: 10.5, fontWeight: 800, color: accent, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 13.5, fontWeight: 800, color: TXT, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {m.homeFlag || ""} {m.teamHome} – {m.teamAway} {m.awayFlag || ""}
      </div>
      {live ? (
        <div style={{ fontSize: 16, fontWeight: 900, color: "#ff5a55", marginTop: 4, fontVariantNumeric: "tabular-nums" }}>
          {m.scoreHome != null ? `${m.scoreHome}:${m.scoreAway}` : "0:0"} <span style={{ fontSize: 10, fontWeight: 900 }}>● LIVE</span>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 12, color: MUT, marginTop: 2 }}>{fmtKickoff(m.kickoffAt)}</div>
          <div style={{ fontSize: 16, fontWeight: 900, color: accent, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>⏳ {cd(m.kickoffAt)}</div>
        </>
      )}
    </div>
  );
  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
      {liveNow.map((m) => <Card key={"l" + m.id} label="🔴 Jetzt live" m={m} accent="#ff5a55" live />)}
      {nextGames.map((m, i) => {
        const sameAsFirst = firstMin != null && Math.floor(m.kickoffAt / 60000) === firstMin;
        return (
          <Card key={"n" + m.id} m={m} accent="#ff6b66"
            label={i === 0 ? "Nächstes Spiel" : sameAsFirst ? "Zeitgleich" : "Danach"} />
        );
      })}
      {nextDE && !nextGames.some((x) => x.id === nextDE.id) && !liveNow.some((x) => x.id === nextDE.id) && (
        <Card label="Deutschland 🇩🇪" m={nextDE} accent="#ffce00" />
      )}
    </div>
  );
}

// 🎵 Profil-Song-Loop (YouTube-Embed, Refrain-Schleife). Standardmäßig AN —
// der Refrain läuft stumm los und wird bei der ERSTEN Nutzer-Geste (Klick/Tipp/Scroll)
// hörbar (Browser-Autoplay-Sperre). Bleibt an, bis man bewusst auf „🔇 Aus" klickt.
function SongPlayer() {
  const holderRef = useRef(null);
  const playerRef = useRef(null);
  const [soundOn, setSoundOn] = useState(true); // Wunsch-Zustand: AN
  const soundOnRef = useRef(true);
  soundOnRef.current = soundOn;
  // Beim Seitenaufruf abwechselnd der nächste Song (rotiert via localStorage).
  const [song, setSong] = useState(SONGS[0]);
  const [chosen, setChosen] = useState(false);
  const songRef = useRef(SONGS[0]);
  songRef.current = song;
  useEffect(() => { setSong(pickSong()); setChosen(true); }, []);

  // Ton hörbar machen (sofern gewünscht).
  function ensureAudible() {
    const p = playerRef.current; if (!p || !soundOnRef.current) return;
    try { p.unMute(); if (p.setVolume) p.setVolume(65); p.playVideo(); } catch {}
  }

  // Player erst bauen, wenn der (rotierte) Song feststeht — sonst Doppel-Init/Flackern.
  useEffect(() => {
    if (!chosen) return;
    let cancelled = false;
    const cur = songRef.current;
    loadYouTubeAPI().then((YT) => {
      if (cancelled || !YT || !holderRef.current) return;
      try {
        playerRef.current = new YT.Player(holderRef.current, {
          videoId: cur.id,
          width: "1", height: "1",
          playerVars: { autoplay: 1, controls: 0, disablekb: 1, fs: 0, mute: 1, playsinline: 1, start: cur.start, end: cur.end, rel: 0, modestbranding: 1 },
          events: {
            // Stumm starten (immer erlaubt), dann gleich versuchen hörbar zu schalten.
            onReady: (e) => { try { e.target.seekTo(songRef.current.start, true); e.target.playVideo(); } catch {}; ensureAudible(); },
            onStateChange: (e) => {
              const S = window.YT && window.YT.PlayerState;
              if (S && e.data === S.ENDED) { try { e.target.seekTo(songRef.current.start, true); e.target.playVideo(); } catch {} }
            },
          },
        });
      } catch {}
    });
    return () => { cancelled = true; try { playerRef.current && playerRef.current.destroy && playerRef.current.destroy(); } catch {} };
  }, [chosen]);

  // Erste Nutzer-Geste irgendwo auf der Seite → Ton freischalten (einmalig).
  useEffect(() => {
    function onFirstGesture() {
      ensureAudible();
      window.removeEventListener("pointerdown", onFirstGesture);
      window.removeEventListener("keydown", onFirstGesture);
      window.removeEventListener("touchstart", onFirstGesture);
    }
    window.addEventListener("pointerdown", onFirstGesture, { once: true });
    window.addEventListener("keydown", onFirstGesture, { once: true });
    window.addEventListener("touchstart", onFirstGesture, { once: true });
    return () => {
      window.removeEventListener("pointerdown", onFirstGesture);
      window.removeEventListener("keydown", onFirstGesture);
      window.removeEventListener("touchstart", onFirstGesture);
    };
  }, []);

  function toggle() {
    const p = playerRef.current; if (!p) return;
    try {
      if (soundOn) { p.mute(); setSoundOn(false); }
      else { soundOnRef.current = true; p.unMute(); if (p.setVolume) p.setVolume(65); p.seekTo(songRef.current.start, true); p.playVideo(); setSoundOn(true); }
    } catch {}
  }

  return (
    <div style={{ marginBottom: 14, borderRadius: 12, background: CARD, border: `1px solid ${BORDER}`, backdropFilter: "blur(6px)", display: "flex", alignItems: "center", gap: 10, padding: "8px 12px" }}>
      <div ref={holderRef} style={{ position: "absolute", width: 1, height: 1, left: -9999, top: -9999, opacity: 0, pointerEvents: "none" }} />
      <span style={{ fontSize: 18 }}>🎵</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 800, color: TXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{song.title}</div>
        <div style={{ fontSize: 10.5, color: MUT }}>Refrain in Schleife · Profil-Song</div>
      </div>
      <button type="button" onClick={toggle} style={{
        padding: "8px 14px", borderRadius: 999, border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 800, fontSize: 12.5,
        background: soundOn ? "linear-gradient(135deg,#16a34a,#15803d)" : "linear-gradient(135deg,#141414,#DD0000)", color: "#fff",
      }}>{soundOn ? "🔊 An" : "🔇 Aus"}</button>
    </div>
  );
}

// Spiele in Gruppen: 🔴 Läuft · 🎯 Zu tippen · ⏳ Kommend · ✅ Vorbei — Schluss mit Endlos-Scrollen.
function SpieleListe({ matches, betMap, canTip, onSaved }) {
  const now = Date.now();
  const live = matches.filter((m) => matchState(m, now) === "live").sort((a, b) => (a.kickoffAt || 0) - (b.kickoffAt || 0));
  const vorbei = matches.filter((m) => { const s = matchState(m, now); return s === "finished" || s === "stale"; }).sort((a, b) => (b.kickoffAt || 0) - (a.kickoffAt || 0));
  const kommend = matches.filter((m) => matchState(m, now) === "upcoming").sort((a, b) => (a.kickoffAt || 0) - (b.kickoffAt || 0));
  const DEADLINE = 20 * 60 * 1000; // Tipp-Schluss 20 Min vor Anpfiff
  const zuTippen = canTip ? kommend.filter((m) => !betMap[m.id] && (!m.kickoffAt || m.kickoffAt > now + DEADLINE)) : [];
  // 📅 Plan zeigt NUR Spiele, die noch gespielt werden müssen (anstehend + live).
  // Fertige Spiele leben in der Auswertung ("wer hat was getippt + Punkte") — wie auf 4ever1.
  const planMatches = matches.filter((m) => { const s = matchState(m, now); return s === "upcoming" || s === "live"; });
  const groups = { live, zu: zuTippen };
  const def = live.length ? "live" : zuTippen.length ? "zu" : "plan";
  const [sel, setSel] = useState(def);

  const chips = [];
  if (live.length) chips.push(["live", "🔴 Läuft gerade", live.length]);
  if (canTip) chips.push(["zu", "🎯 Zu tippen", zuTippen.length]);
  chips.push(["plan", "📅 Plan", planMatches.length]);
  const list = sel === "plan" ? null : (groups[sel] || []);

  return (
    <>
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        {chips.map(([k, label, n]) => {
          const active = sel === k;
          return (
            <button key={k} type="button" onClick={() => setSel(k)} style={{
              padding: "8px 13px", borderRadius: 999, fontFamily: "inherit", fontSize: 12.5, fontWeight: 800, cursor: "pointer",
              background: active ? "linear-gradient(135deg,#141414,#DD0000)" : "rgba(255,255,255,0.06)",
              color: active ? "#fff" : MUT, border: active ? "1px solid rgba(255,255,255,0.25)" : `1px solid ${BORDER}`,
            }}>{label} <span style={{ opacity: 0.85 }}>({n})</span></button>
          );
        })}
      </div>
      {sel === "plan" ? (
        planMatches.length === 0
          ? <Muted>Alle Spiele gespielt — die Ergebnisse + Tipps findest du in der 📊 Auswertung.</Muted>
          : <Spielplan matches={planMatches} betMap={betMap} canTip={canTip} onSaved={onSaved} />
      ) : list.length === 0 ? (
        <Muted>{sel === "live" ? "Gerade läuft kein Spiel." : "Alles getippt — stark! 🎯"}</Muted>
      ) : (
        list.map((m) => <MatchCard key={m.id} m={m} bet={betMap[m.id]} canTip={canTip} onSaved={onSaved} />)
      )}
    </>
  );
}

function TabBtn({ active, onClick, children }) {
  return (
    <button type="button" onClick={onClick} style={{
      flex: 1, padding: "11px 12px", borderRadius: 9, fontFamily: "inherit",
      background: active ? "linear-gradient(135deg, #141414, #DD0000)" : "transparent",
      color: active ? "#fff" : MUT,
      border: active ? "1px solid rgba(255,255,255,0.25)" : "1px solid transparent",
      fontSize: 14, fontWeight: 800, cursor: "pointer",
      boxShadow: active ? "0 2px 10px rgba(221,0,0,0.4)" : "none",
    }}>{children}</button>
  );
}

function Muted({ children, bare }) {
  const inner = (
    <div style={{ padding: 28, textAlign: "center", color: MUT, fontSize: 14, lineHeight: 1.6 }}>{children}</div>
  );
  if (bare) return inner;
  return (
    <div style={{ background: CARD, borderRadius: 14, border: `1px dashed ${BORDER}`, backdropFilter: "blur(6px)" }}>{inner}</div>
  );
}

function MatchCard({ m, bet, canTip, onSaved }) {
  const finished = m.status === "finished";
  const TIP_DEADLINE_MS = 20 * 60 * 1000; // Tipp-Schluss 20 Min vor Anpfiff
  const state = matchState(m, Date.now());
  const locked = finished || (m.kickoffAt && m.kickoffAt <= Date.now() + TIP_DEADLINE_MS);
  const live = state === "live";
  const played = state !== "upcoming"; // beendet, live oder „gespielt ohne Ergebnis" → Spielstand statt Tipp-Felder
  const isKO = !!m.phase && m.phase !== "group";

  const [h, setH] = useState(bet && bet.predHome != null ? String(bet.predHome) : "");
  const [a, setA] = useState(bet && bet.predAway != null ? String(bet.predAway) : "");
  const [adv, setAdv] = useState(bet?.advPick || "");   // K.o.: wer kommt weiter
  const [dec, setDec] = useState(bet?.decPick || "");   // K.o.: wie entschieden (reg/aet/pen)
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState("");
  const [showTips, setShowTips] = useState(false);
  const tips = m.importedTips || [];
  const canEdit = !locked && canTip;
  const hasScore = m.scoreHome != null && m.scoreAway != null;

  async function save() {
    setBusy(true); setFlash("");
    try {
      let body;
      if (h === "" || a === "") { setFlash("⚠ Bitte das Ergebnis (Tore) ausfüllen."); setBusy(false); return; }
      if (isKO) {
        const drawTip = Number(h) === Number(a);
        if (!dec) { setFlash("⚠ Wähle: 90 Min, Verlängerung oder Elfmeter."); setBusy(false); return; }
        if (drawTip && dec === "reg") { setFlash("⚠ Unentschieden kann nicht in 90 Min entschieden werden — Verlängerung oder Elfmeter wählen."); setBusy(false); return; }
        if (!adv) { setFlash("⚠ Wähle, wer weiterkommt."); setBusy(false); return; }
        body = { matchId: m.id, predHome: Number(h), predAway: Number(a), advPick: adv, decPick: dec };
      } else {
        body = { matchId: m.id, predHome: Number(h), predAway: Number(a) };
      }
      const r = await fetch("/api/tipp/bet", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
    <div style={{ marginBottom: 10, borderRadius: 14, overflow: "hidden", background: CARD, border: `1px solid ${BORDER}`, backdropFilter: "blur(6px)", boxShadow: "0 2px 10px rgba(0,0,0,0.3)", display: "flex" }}>
      <div aria-hidden style={{ width: 6, background: FLAG_STRIPE, flexShrink: 0 }} />
      <div style={{ flex: 1, padding: 14, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 6 }}>
          <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 0.5, color: "#ff6b66", textTransform: "uppercase" }}>
            {PHASE_LABEL[m.phase] || m.phase}{m.groupLetter ? ` · Gruppe ${m.groupLetter}` : ""}{isKO ? " · Sieg oder Aus" : ""}
          </span>
          {live ? (
            <span style={{ fontSize: 10.5, fontWeight: 900, color: "#fff", background: "#DD0000", padding: "2px 8px", borderRadius: 999, letterSpacing: 0.5, whiteSpace: "nowrap" }}>🔴 LÄUFT</span>
          ) : (
            <span style={{ fontSize: 11, color: MUT, whiteSpace: "nowrap" }}>{fmtKickoff(m.kickoffAt)}</span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ flex: 1, textAlign: "right", fontWeight: 800, fontSize: 15, color: TXT, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
            {m.teamHome} {m.homeFlag || ""}
          </div>
          {played ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1, flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 900, fontSize: 22, color: live ? "#ff5a55" : "#fff", textShadow: live ? "0 0 10px rgba(221,0,0,0.5)" : "none" }}>
                {hasScore ? <><span>{m.scoreHome}</span><span style={{ color: MUT }}>:</span><span>{m.scoreAway}</span></> : <span style={{ color: MUT }}>{live ? "0:0" : "–"}</span>}
              </div>
              {live && <span style={{ fontSize: 9.5, fontWeight: 900, color: "#ff5a55", letterSpacing: 0.5 }}>● LIVE</span>}
              {isKO && m.decision && m.decision !== "reg" && (
                <span style={{ fontSize: 9.5, fontWeight: 800, color: "#ffce00", letterSpacing: 0.4, whiteSpace: "nowrap" }}>
                  {m.decision === "pen"
                    ? `i.E.${m.penHome != null && m.penAway != null ? ` ${m.penHome}:${m.penAway}` : ""}`
                    : `n.V.${m.aetHome != null && m.aetAway != null ? ` ${m.aetHome}:${m.aetAway}` : ""}`}
                </span>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              <select value={h} disabled={!canEdit}
                onChange={(e) => setH(e.target.value)} style={scoreInput(!canEdit)} aria-label="Tore Heim">
                <option value="">–</option>
                {SCORE_OPTS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <span style={{ color: MUT, fontWeight: 900 }}>:</span>
              <select value={a} disabled={!canEdit}
                onChange={(e) => setA(e.target.value)} style={scoreInput(!canEdit)} aria-label="Tore Auswärts">
                <option value="">–</option>
                {SCORE_OPTS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          )}
          <div style={{ flex: 1, textAlign: "left", fontWeight: 800, fontSize: 15, color: TXT, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
            {m.awayFlag || ""} {m.teamAway}
          </div>
        </div>

        {/* K.o.-Tipp: Tore (oben) + Wer kommt weiter + Entscheidung (90 Min/Verl./Elfmeter, je mit Punkten).
            Bei Unentschieden ist „90 Min" gesperrt und es kommt ein Hinweis. Alles bis 20 Min vor Anpfiff änderbar. */}
        {isKO && canEdit && (() => {
          const bothFilled = h !== "" && a !== "";
          const drawTip = bothFilled && Number(h) === Number(a);
          return (
            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              {drawTip && (
                <div style={{ fontSize: 11.5, color: "#ffce00", fontWeight: 700, lineHeight: 1.4, background: "rgba(255,206,0,0.10)", border: "1px solid rgba(255,206,0,0.35)", borderRadius: 9, padding: "8px 11px" }}>
                  ⚖ <b>Unentschieden</b> nach 90 Min — es muss verlängert werden: wähle <b>Verlängerung</b> oder <b>Elfmeter</b> und <b>wer weiterkommt</b>.
                </div>
              )}
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#ff6b66", marginBottom: 5 }}>➡ Wer kommt weiter? <span style={{ color: MUT, fontWeight: 600 }}>(+1)</span></div>
                <div style={{ display: "flex", gap: 6 }}>
                  {[["home", m.teamHome, m.homeFlag], ["away", m.teamAway, m.awayFlag]].map(([side, name, flag]) => {
                    const active = adv === side;
                    return (
                      <button key={side} type="button" onClick={() => setAdv(side)} style={{
                        flex: 1, minWidth: 0, padding: "10px 8px", borderRadius: 9, fontFamily: "inherit", fontSize: 12.5, fontWeight: 800,
                        cursor: "pointer", background: active ? "linear-gradient(135deg,#141414,#DD0000)" : "rgba(255,255,255,0.05)",
                        color: active ? "#fff" : MUT, border: active ? "1px solid rgba(255,255,255,0.35)" : `1px solid ${BORDER}`,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>{active ? "✓ " : ""}{flag || ""} {name}</button>
                    );
                  })}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#ff6b66", marginBottom: 5 }}>⏱ Wie fällt die Entscheidung? <span style={{ color: MUT, fontWeight: 600 }}>(richtig + / falsch −)</span></div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {DEC_ORDER.map((k) => {
                    const disabled = drawTip && k === "reg"; // 90 Min bei Unentschieden nicht möglich
                    const active = dec === k && !disabled;
                    return (
                      <button key={k} type="button" disabled={disabled} onClick={() => { if (!disabled) setDec(k); }} style={{
                        flex: "1 1 100px", minWidth: 0, padding: "9px 6px", borderRadius: 9, fontFamily: "inherit", fontSize: 11.5, fontWeight: 800,
                        cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.4 : 1,
                        background: active ? "linear-gradient(135deg,#141414,#DD0000)" : "rgba(255,255,255,0.05)",
                        color: active ? "#fff" : MUT, border: active ? "1px solid rgba(255,255,255,0.35)" : `1px solid ${BORDER}`,
                        lineHeight: 1.25, textAlign: "center",
                      }}>
                        {DEC_LONG[k]}<br /><span style={{ fontSize: 10, color: active ? "#ffce00" : MUT }}>+{DEC_REWARD[k]} / {DEC_PENALTY[k]}</span>
                        {disabled && <><br /><span style={{ fontSize: 9, color: MUT }}>bei Unent. nicht möglich</span></>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}

        {/* K.o. abgeschlossen: wer ist weiter + Punkte */}
        {isKO && finished && m.winner && (
          <div style={{ marginTop: 10, fontSize: 12, fontWeight: 700, color: "#86efac", textAlign: "center" }}>
            ✅ <b style={{ color: "#fff" }}>{m.winner === "home" ? m.teamHome : m.teamAway}</b> kommt weiter
            <span style={{ color: MUT, fontWeight: 600 }}> · entschieden {DEC_SHORT[m.decision] || "—"}</span>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginTop: 10, minHeight: 22, flexWrap: "wrap" }}>
          <div style={{ fontSize: 11.5, color: MUT }}>
            {bet ? (
              isKO
                ? <>Dein Tipp: <b style={{ color: TXT }}>{bet.predHome != null ? `${bet.predHome}:${bet.predAway}` : "—"}</b>{bet.advPick ? <> · {bet.advPick === "home" ? m.teamHome : m.teamAway}</> : null}{bet.decPick ? <> · {DEC_SHORT[bet.decPick]}</> : null}</>
                : <>Dein Tipp: <b style={{ color: TXT }}>{bet.predHome}:{bet.predAway}</b></>
            ) : (canTip ? (locked ? "Kein Tipp abgegeben" : "Noch kein Tipp") : "")}
          </div>
          {finished && bet ? (isKO ? tippBadge(bet.points) : pointsBadge(bet.points)) : null}
          {canEdit && (
            <button type="button" onClick={save} disabled={busy} style={{
              padding: "8px 18px", borderRadius: 9, border: "none", cursor: busy ? "wait" : "pointer",
              background: "linear-gradient(135deg, #DD0000, #a30000)", color: "#fff", fontWeight: 800, fontSize: 12.5,
              fontFamily: "inherit", boxShadow: "0 2px 6px rgba(221,0,0,0.35)",
            }}>{busy ? "…" : bet ? "Ändern" : "Tippen"}</button>
          )}
        </div>
        {flash && <div style={{ marginTop: 6, fontSize: 11.5, fontWeight: 700, color: flash.startsWith("⚠") ? "#fca5a5" : "#86efac" }}>{flash}</div>}

        {tips.length > 0 && (
          <div style={{ marginTop: 8, borderTop: `1px solid ${BORDER}`, paddingTop: 8 }}>
            <button type="button" onClick={() => setShowTips((s) => !s)} style={{
              background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
              color: "#ff6b66", fontSize: 12, fontWeight: 800, padding: 0,
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
    </div>
  );
}

function scoreInput(locked) {
  return {
    width: 48, height: 40, textAlign: "center", textAlignLast: "center", fontSize: 18, fontWeight: 900, borderRadius: 10,
    border: `1.5px solid ${locked ? "rgba(255,255,255,0.12)" : "rgba(221,0,0,0.55)"}`,
    background: locked ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.3)", color: TXT, fontFamily: "inherit", boxSizing: "border-box",
    appearance: "none", WebkitAppearance: "none", MozAppearance: "none",
    cursor: locked ? "default" : "pointer", padding: "0 2px",
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
  const [backingUp, setBackingUp] = useState(false);
  const [backupMsg, setBackupMsg] = useState("");

  async function runBackup() {
    setBackingUp(true); setBackupMsg("⏳ Erstelle Backup …");
    try {
      const r = await fetch("/api/tipp/backup", { method: "POST", credentials: "include" });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Backup fehlgeschlagen.");
      const kb = Math.round((d.size || 0) / 1024);
      setBackupMsg(`✅ Backup erstellt (${kb} KB): ${d.path}`);
    } catch (e) { setBackupMsg("⚠ " + e.message); }
    finally { setBackingUp(false); }
  }

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
    if (!confirm("Alle Daten von tipp.4ever1.tv holen und übernehmen?\n(Teams, Spiele, Ergebnisse, Blitztabelle, alle Tipps)")) return;
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

  async function setResult(m) {
    const id = m.id;
    const sh = prompt(`Tore ${m.teamHome} (nach 90 Min)?`, m.scoreHome ?? ""); if (sh === null) return;
    const sa = prompt(`Tore ${m.teamAway} (nach 90 Min)?`, m.scoreAway ?? ""); if (sa === null) return;
    const body = { action: "set_result", matchId: id, scoreHome: Number(sh), scoreAway: Number(sa) };
    const isKO = m.phase && m.phase !== "group";
    if (isKO) {
      if (Number(sh) === Number(sa)) {
        // Unentschieden nach 90 Min → Verlängerung/Elfmeter + Sieger
        const dec = (prompt("Entschieden durch?  v = Verlängerung (n.V.)   ·   e = Elfmeter (i.E.)", "e") || "").toLowerCase();
        body.decision = dec.startsWith("v") ? "aet" : "pen";
        const w = (prompt(`Wer kommt weiter?  h = ${m.teamHome}   ·   a = ${m.teamAway}`, "h") || "").toLowerCase();
        body.winner = w.startsWith("a") ? "away" : "home";
        if (body.decision === "pen") {
          const ph = prompt("Elfmeter-Endstand Heim? (optional)", ""); if (ph) body.penHome = Number(ph);
          const pa = prompt("Elfmeter-Endstand Auswärts? (optional)", ""); if (pa) body.penAway = Number(pa);
        } else {
          const ah = prompt("Endstand nach Verlängerung Heim? (optional)", ""); if (ah) body.aetHome = Number(ah);
          const aa = prompt("Endstand nach Verlängerung Auswärts? (optional)", ""); if (aa) body.aetAway = Number(aa);
        }
      } else {
        body.decision = "reg"; // in 90 Min entschieden
        body.winner = Number(sh) > Number(sa) ? "home" : "away"; // Sieger = Führender
      }
    }
    try { await post(body); onChanged?.(); }
    catch (e) { alert("⚠ " + e.message); }
  }

  async function del(id) {
    if (!confirm("Spiel wirklich löschen?")) return;
    try { await post({ action: "delete_match", matchId: id }); onChanged?.(); }
    catch (e) { alert("⚠ " + e.message); }
  }

  return (
    <div style={{ marginBottom: 14, borderRadius: 14, overflow: "hidden", border: `1px solid ${BORDER}`, background: CARD_SOLID, boxShadow: "0 2px 10px rgba(0,0,0,0.3)" }}>
      <FlagBand h={5} />
      <button type="button" onClick={() => setOpen((o) => !o)} style={{
        width: "100%", padding: "11px 14px", textAlign: "left", cursor: "pointer",
        background: "none", border: "none", color: "#fff", fontWeight: 800, fontSize: 13.5, fontFamily: "inherit",
      }}>🛠 Admin: Import & Spiele {open ? "▲" : "▼"}</button>
      {open && (
        <div style={{ padding: "0 14px 14px" }}>
          <div style={{ marginBottom: 12, padding: 12, borderRadius: 10, background: "rgba(0,0,0,0.28)", border: `1px solid ${BORDER}` }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: TXT, marginBottom: 4 }}>📥 Von tipp.4ever1.tv übernehmen</div>
            <div style={{ fontSize: 11.5, color: MUT, marginBottom: 8, lineHeight: 1.4 }}>
              Holt Teams, Spiele, Ergebnisse, Blitztabelle und alle Tipps direkt von 4ever1. Mehrfach ausführbar (aktualisiert).
            </div>
            <button type="button" onClick={runImport} disabled={importing} style={{
              padding: "9px 14px", borderRadius: 9, border: "none", cursor: importing ? "wait" : "pointer",
              background: "linear-gradient(135deg, #141414, #DD0000)", color: "#fff", fontWeight: 800, fontSize: 13, fontFamily: "inherit",
            }}>{importing ? "⏳ Importiere …" : "⬇️ Jetzt von 4ever1 importieren"}</button>
            {importMsg && <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: importMsg.startsWith("⚠") ? "#fca5a5" : importMsg.startsWith("✅") ? "#86efac" : MUT }}>{importMsg}</div>}
          </div>

          <div style={{ marginBottom: 12, padding: 12, borderRadius: 10, background: "rgba(22,101,52,0.18)", border: "1px solid rgba(22,163,74,0.4)" }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: TXT, marginBottom: 4 }}>🛟 Datenbank-Backup</div>
            <div style={{ fontSize: 11.5, color: MUT, marginBottom: 8, lineHeight: 1.4 }}>
              Erstellt sofort eine konsistente Sicherungskopie der kompletten Live-Datenbank. Die letzten 10 Backups bleiben erhalten.
            </div>
            <button type="button" onClick={runBackup} disabled={backingUp} style={{
              padding: "9px 14px", borderRadius: 9, border: "none", cursor: backingUp ? "wait" : "pointer",
              background: "linear-gradient(135deg, #16a34a, #15803d)", color: "#fff", fontWeight: 800, fontSize: 13, fontFamily: "inherit",
            }}>{backingUp ? "⏳ Sichere …" : "🛟 Backup jetzt erstellen"}</button>
            {backupMsg && <div style={{ marginTop: 8, fontSize: 11.5, fontWeight: 700, wordBreak: "break-all", color: backupMsg.startsWith("⚠") ? "#fca5a5" : backupMsg.startsWith("✅") ? "#86efac" : MUT }}>{backupMsg}</div>}
          </div>

          <div style={{ display: "grid", gap: 6, marginBottom: 8 }}>
            <div style={{ display: "flex", gap: 6 }}>
              <input value={home} onChange={(e) => setHome(e.target.value)} placeholder="Heim" style={adminInput} />
              <input value={away} onChange={(e) => setAway(e.target.value)} placeholder="Auswärts" style={adminInput} />
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <select value={phase} onChange={(e) => setPhase(e.target.value)} style={{ ...adminInput, flex: "0 0 150px" }}>
                <option value="group">Gruppenphase</option>
                <option value="r32">Sechzehntelfinale</option>
                <option value="r16">Achtelfinale</option>
                <option value="qf">Viertelfinale</option>
                <option value="sf">Halbfinale</option>
                <option value="3rd">Spiel um Platz 3</option>
                <option value="final">Finale</option>
              </select>
              <input type="datetime-local" value={kickoff} onChange={(e) => setKickoff(e.target.value)} style={adminInput} />
            </div>
            <button type="button" onClick={createMatch} disabled={busy} style={{
              padding: "9px 14px", borderRadius: 9, border: "none", cursor: "pointer",
              background: "linear-gradient(135deg, #FFCE00, #e0b400)", color: "#141414", fontWeight: 800, fontSize: 13, fontFamily: "inherit",
            }}>{busy ? "…" : "➕ Spiel manuell anlegen"}</button>
            {msg && <div style={{ fontSize: 11.5, fontWeight: 700, color: msg.startsWith("⚠") ? "#fca5a5" : "#86efac" }}>{msg}</div>}
          </div>

          {(matches || []).length > 0 && (
            <div style={{ marginTop: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: MUT, marginBottom: 4 }}>SPIELE VERWALTEN ({matches.length})</div>
              <div style={{ maxHeight: 240, overflowY: "auto" }}>
                {matches.map((m) => (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 0", fontSize: 12, color: TXT, borderBottom: `1px solid ${BORDER}` }}>
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {m.teamHome} – {m.teamAway} {m.status === "finished" ? `(${m.scoreHome}:${m.scoreAway})` : ""}
                    </span>
                    <button type="button" onClick={() => setResult(m)} style={miniBtn("#60a5fa")}>Ergebnis</button>
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
