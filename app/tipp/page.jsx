"use client";

// ⚽ WM-Tipp 2026 — „Deutschland 1990 bei Flutlicht" (dunkel + Schwarz-Rot-Gold-Zickzackbande).

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

const FOUR = "https://tipp.4ever1.tv";

// 🎵 Profil-Song (Refrain-Loop via YouTube-Embed, lizenzkonform)
const SONG = { id: "W_ug7KQbTGo", start: 32, end: 67, title: "Wincent Weiss – Kurz für immer" };

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
        {/* HERO */}
        <div style={{ borderRadius: 16, overflow: "hidden", marginBottom: 14, background: CARD_SOLID, border: `1px solid ${BORDER}`, boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
          <FlagBand h={11} />
          <div style={{ padding: "16px 18px 18px" }}>
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1.6, color: "#ff6b66" }}>⚽ VIBE★VIBO TIPPSPIEL · ANNO '90</div>
            <div style={{ fontSize: 28, fontWeight: 900, fontStyle: "italic", color: "#fff", marginTop: 2, letterSpacing: -0.5 }}>
              WM-TIPP 2026 <span style={{ fontStyle: "normal" }}>🇩🇪</span>
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: MUT, marginTop: 5, lineHeight: 1.45 }}>
              Tippe jedes Spiel. Punkte: <b style={{ color: TXT }}>exakt 4</b> · <b style={{ color: TXT }}>Tordifferenz 3</b> · <b style={{ color: TXT }}>Tendenz 2</b>. Tipp-Schluss ist immer der Anpfiff. K.o.-Spiele: gewertet wird das <b style={{ color: TXT }}>90-Min-Ergebnis</b> + <b style={{ color: "#ffce00" }}>1 Bonus</b> fürs richtige Weiterkommen.
            </div>
          </div>
          <FlagBand h={5} />
        </div>

        {/* TABS */}
        <div style={{ display: "flex", gap: 8, marginBottom: 14, padding: 5, borderRadius: 12, background: CARD, border: `1px solid ${BORDER}`, backdropFilter: "blur(6px)" }}>
          <TabBtn active={tab === "spiele"} onClick={() => setTab("spiele")}>⚽ Spiele</TabBtn>
          <TabBtn active={tab === "tabelle"} onClick={() => { setTab("tabelle"); loadBoard(); }}>⚡ Blitztabelle</TabBtn>
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

        {tab === "tabelle" && (
          <div style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${BORDER}` }}>
            <FlagBand h={6} />
            {board.length === 0 ? (
              <div style={{ background: CARD_SOLID }}><Muted bare>Noch keine Punkte. Importiere oben die 4ever1-Daten oder tippe los! ⚽</Muted></div>
            ) : (
              <div style={{ background: CARD_SOLID, padding: 8 }}>
                {board.map((u, i) => (
                  <div key={u.id} style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", marginBottom: 6, borderRadius: 10,
                    background: i < 3 ? "rgba(255,206,0,0.14)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${i < 3 ? "rgba(255,206,0,0.5)" : BORDER}`,
                  }}>
                    <div style={{ width: 26, textAlign: "center", fontSize: 18, fontWeight: 900, color: i === 0 ? GOLD : i === 1 ? "#cbd5e1" : i === 2 ? "#d8a657" : MUT }}>
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
                ))}
              </div>
            )}
          </div>
        )}
        </div>
      </div>
    </>
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

  // Ton hörbar machen (sofern gewünscht).
  function ensureAudible() {
    const p = playerRef.current; if (!p || !soundOnRef.current) return;
    try { p.unMute(); if (p.setVolume) p.setVolume(65); p.playVideo(); } catch {}
  }

  useEffect(() => {
    let cancelled = false;
    loadYouTubeAPI().then((YT) => {
      if (cancelled || !YT || !holderRef.current) return;
      try {
        playerRef.current = new YT.Player(holderRef.current, {
          videoId: SONG.id,
          width: "1", height: "1",
          playerVars: { autoplay: 1, controls: 0, disablekb: 1, fs: 0, mute: 1, playsinline: 1, start: SONG.start, end: SONG.end, rel: 0, modestbranding: 1 },
          events: {
            // Stumm starten (immer erlaubt), dann gleich versuchen hörbar zu schalten.
            onReady: (e) => { try { e.target.seekTo(SONG.start, true); e.target.playVideo(); } catch {}; ensureAudible(); },
            onStateChange: (e) => {
              const S = window.YT && window.YT.PlayerState;
              if (S && e.data === S.ENDED) { try { e.target.seekTo(SONG.start, true); e.target.playVideo(); } catch {} }
            },
          },
        });
      } catch {}
    });
    return () => { cancelled = true; try { playerRef.current && playerRef.current.destroy && playerRef.current.destroy(); } catch {} };
  }, []);

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
      else { soundOnRef.current = true; p.unMute(); if (p.setVolume) p.setVolume(65); p.seekTo(SONG.start, true); p.playVideo(); setSoundOn(true); }
    } catch {}
  }

  return (
    <div style={{ marginBottom: 14, borderRadius: 12, background: CARD, border: `1px solid ${BORDER}`, backdropFilter: "blur(6px)", display: "flex", alignItems: "center", gap: 10, padding: "8px 12px" }}>
      <div ref={holderRef} style={{ position: "absolute", width: 1, height: 1, left: -9999, top: -9999, opacity: 0, pointerEvents: "none" }} />
      <span style={{ fontSize: 18 }}>🎵</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 800, color: TXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{SONG.title}</div>
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
  const isFinished = (m) => m.status === "finished";
  const isLive = (m) => !isFinished(m) && m.kickoffAt && m.kickoffAt <= now;          // Anpfiff war, noch kein Ergebnis
  const isUpcoming = (m) => !isFinished(m) && (!m.kickoffAt || m.kickoffAt > now);

  const live = matches.filter(isLive).sort((a, b) => (a.kickoffAt || 0) - (b.kickoffAt || 0));
  const vorbei = matches.filter(isFinished).sort((a, b) => (b.kickoffAt || 0) - (a.kickoffAt || 0));
  const kommend = matches.filter(isUpcoming).sort((a, b) => (a.kickoffAt || 0) - (b.kickoffAt || 0));
  const zuTippen = canTip ? kommend.filter((m) => !betMap[m.id]) : [];
  const groups = { live, zu: zuTippen, kommend, vorbei };
  // Läuft gerade kommt immer zuerst.
  const def = live.length ? "live" : zuTippen.length ? "zu" : kommend.length ? "kommend" : "vorbei";
  const [sel, setSel] = useState(def);

  const chips = [];
  if (live.length) chips.push(["live", "🔴 Läuft gerade", live.length]);
  if (canTip) chips.push(["zu", "🎯 Zu tippen", zuTippen.length]);
  chips.push(["kommend", "⏳ Kommend", kommend.length]);
  chips.push(["vorbei", "✅ Vorbei", vorbei.length]);
  const list = groups[sel] || [];

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
      {list.length === 0 ? (
        <Muted>{sel === "live" ? "Gerade läuft kein Spiel." : sel === "zu" ? "Alles getippt — stark! 🎯" : sel === "kommend" ? "Keine anstehenden Spiele." : "Noch keine gespielten Spiele."}</Muted>
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
  const locked = finished || (m.kickoffAt && m.kickoffAt <= Date.now());
  const live = !finished && !!m.kickoffAt && m.kickoffAt <= Date.now();
  const [h, setH] = useState(bet ? String(bet.predHome) : "");
  const [a, setA] = useState(bet ? String(bet.predAway) : "");
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState("");
  const [showTips, setShowTips] = useState(false);
  const [adv, setAdv] = useState(bet?.advPick || "");
  const tips = m.importedTips || [];

  // K.o.-Spiel? (alles außer Gruppenphase)
  const isKO = !!m.phase && m.phase !== "group";
  const nh = h === "" ? null : Number(h);
  const na = a === "" ? null : Number(a);
  const bothSet = nh != null && na != null;
  const isDrawTip = bothSet && nh === na;
  const impliedAdv = !bothSet ? "" : nh > na ? "home" : na > nh ? "away" : ""; // klares Ergebnis ⇒ Sieger
  const effAdv = impliedAdv || adv; // bei Unentschieden zählt die manuelle Wahl

  async function save() {
    if (h === "" || a === "") { setFlash("⚠ Beide Felder ausfüllen."); return; }
    if (isKO && isDrawTip && !adv) { setFlash("⚠ Unentschieden: bitte wähle, wer weiterkommt."); return; }
    setBusy(true); setFlash("");
    try {
      const body = { matchId: m.id, predHome: Number(h), predAway: Number(a) };
      if (isKO) body.advPick = effAdv || undefined;
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 0.5, color: "#ff6b66", textTransform: "uppercase" }}>
            {PHASE_LABEL[m.phase] || m.phase}{m.groupLetter ? ` · Gruppe ${m.groupLetter}` : ""}
          </span>
          {live ? (
            <span style={{ fontSize: 10.5, fontWeight: 900, color: "#fff", background: "#DD0000", padding: "2px 8px", borderRadius: 999, letterSpacing: 0.5 }}>🔴 LÄUFT</span>
          ) : (
            <span style={{ fontSize: 11, color: MUT }}>{fmtKickoff(m.kickoffAt)}</span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ flex: 1, textAlign: "right", fontWeight: 800, fontSize: 15, color: TXT }}>
            {m.teamHome} {m.homeFlag || ""}
          </div>
          {finished ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 900, fontSize: 20, color: "#fff" }}>
                <span>{m.scoreHome}</span><span style={{ color: MUT }}>:</span><span>{m.scoreAway}</span>
              </div>
              {isKO && m.decision && m.decision !== "reg" && (
                <span style={{ fontSize: 9.5, fontWeight: 800, color: "#ffce00", letterSpacing: 0.4, whiteSpace: "nowrap" }}>
                  {m.decision === "pen"
                    ? `i.E.${m.penHome != null && m.penAway != null ? ` ${m.penHome}:${m.penAway}` : ""}`
                    : `n.V.${m.aetHome != null && m.aetAway != null ? ` ${m.aetHome}:${m.aetAway}` : ""}`}
                </span>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <select value={h} disabled={locked || !canTip}
                onChange={(e) => setH(e.target.value)} style={scoreInput(locked || !canTip)} aria-label="Tore Heim">
                <option value="">–</option>
                {SCORE_OPTS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <span style={{ color: MUT, fontWeight: 900 }}>:</span>
              <select value={a} disabled={locked || !canTip}
                onChange={(e) => setA(e.target.value)} style={scoreInput(locked || !canTip)} aria-label="Tore Auswärts">
                <option value="">–</option>
                {SCORE_OPTS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          )}
          <div style={{ flex: 1, textAlign: "left", fontWeight: 800, fontSize: 15, color: TXT }}>
            {m.awayFlag || ""} {m.teamAway}
          </div>
        </div>

        {isKO && (finished ? (
          m.winner ? (
            <div style={{ marginTop: 10, fontSize: 12, fontWeight: 700, color: "#86efac", textAlign: "center" }}>
              ✅ <b style={{ color: "#fff" }}>{m.winner === "home" ? m.teamHome : m.teamAway}</b> kommt weiter
              {bet && bet.bonus ? <span style={{ color: GOLD }}> · dein Bonus +1 🎯</span> : null}
            </div>
          ) : null
        ) : (!locked && canTip && bothSet) ? (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 11, color: MUT, marginBottom: 5 }}>
              Wer kommt weiter? {isDrawTip
                ? <b style={{ color: "#ffce00" }}>· Pflicht bei Unentschieden</b>
                : <span style={{ opacity: 0.8 }}>(durch dein Ergebnis vorgegeben)</span>}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {[["home", m.teamHome, m.homeFlag], ["away", m.teamAway, m.awayFlag]].map(([side, name, flag]) => {
                const active = effAdv === side;
                const forced = !isDrawTip && !!impliedAdv && impliedAdv !== side;
                return (
                  <button key={side} type="button" disabled={forced} onClick={() => setAdv(side)} style={{
                    flex: 1, padding: "7px 8px", borderRadius: 8, fontFamily: "inherit", fontSize: 12, fontWeight: 800,
                    cursor: forced ? "not-allowed" : "pointer", opacity: forced ? 0.4 : 1,
                    background: active ? "linear-gradient(135deg,#141414,#DD0000)" : "rgba(255,255,255,0.05)",
                    color: active ? "#fff" : MUT,
                    border: active ? "1px solid rgba(255,255,255,0.3)" : `1px solid ${BORDER}`,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>{active ? "➡ " : ""}{flag || ""} {name}</button>
                );
              })}
            </div>
          </div>
        ) : null)}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginTop: 10, minHeight: 22, flexWrap: "wrap" }}>
          <div style={{ fontSize: 11.5, color: MUT }}>
            {bet ? <>Dein Tipp: <b style={{ color: TXT }}>{bet.predHome}:{bet.predAway}</b></> : (canTip ? (locked ? "Kein Tipp abgegeben" : "Noch kein Tipp") : "")}
          </div>
          {finished && bet ? pointsBadge(bet.points) : null}
          {!locked && canTip && (
            <button type="button" onClick={save} disabled={busy} style={{
              padding: "7px 16px", borderRadius: 9, border: "none", cursor: busy ? "wait" : "pointer",
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
        body.decision = "reg"; // in 90 Min entschieden — Sieger = Führender (leitet das Backend ab)
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
