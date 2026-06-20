"use client";

// ❓ KnowMeBestQuiz — kombiniert Builder (Owner) + Taker (Andere) + Leaderboard.
// Auf Profilseite einbinden: <KnowMeBestQuiz username="sunlite" />

import { useEffect, useState } from "react";
import { useMe } from "@/lib/useMe";

export default function KnowMeBestQuiz({ username }) {
  const { me } = useMe();
  const [data, setData] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [showBuilder, setShowBuilder] = useState(false);
  const [showTaker, setShowTaker] = useState(false);

  function refresh() {
    fetch(`/api/users/${encodeURIComponent(username)}/knowme`).then((r) => r.json()).then(setData).catch(() => {});
    fetch(`/api/users/${encodeURIComponent(username)}/knowme/leaderboard`).then((r) => r.json()).then((d) => setLeaderboard(d.leaderboard || [])).catch(() => {});
  }

  useEffect(() => { if (username) refresh(); }, [username]);

  if (!data) return null;
  const { quiz, isOwner, target, myAttempt } = data;
  const isLoggedIn = !!me;

  return (
    <div style={{ background: "rgba(255,255,255,0.95)", borderRadius: 14, padding: 16 }}>
      <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 900 }}>
        ❓ Wer kennt {isOwner ? "dich" : `@${username}`} am besten?
      </h3>

      {/* Owner-View */}
      {isOwner && (!quiz || !quiz.questions?.length) && (
        <div style={{ padding: 16, textAlign: "center" }}>
          <p style={{ fontSize: 13, color: "#475569" }}>
            Erstell ein Quiz über dich (5 Fragen, 4 Antworten je). Andere raten, wer dich am besten kennt!
          </p>
          <button onClick={() => setShowBuilder(true)} style={btnPrimary({ marginTop: 10 })}>
            🛠 Quiz erstellen
          </button>
        </div>
      )}
      {isOwner && quiz?.questions?.length > 0 && (
        <div style={{ padding: 12, background: "#fafafa", borderRadius: 10, fontSize: 13, color: "#475569" }}>
          ✓ Du hast ein Quiz mit {quiz.questions.length} Fragen erstellt.
          <button onClick={() => setShowBuilder(true)} style={{ marginLeft: 8, ...btnGhost({ padding: "4px 10px", fontSize: 11 }) }}>
            ✏ Bearbeiten
          </button>
        </div>
      )}

      {/* Taker-View */}
      {!isOwner && quiz?.questions?.length > 0 && (
        <div>
          {myAttempt ? (
            <div style={{
              padding: 14, borderRadius: 10,
              background: "linear-gradient(135deg, rgba(16,185,129,0.1), rgba(6,182,212,0.05))",
              border: "1px solid rgba(16,185,129,0.25)",
            }}>
              <div style={{ fontSize: 14, fontWeight: 800 }}>
                🎯 Dein Ergebnis: <span style={{ color: "#10b981" }}>{myAttempt.score}/{myAttempt.maxScore}</span>
                {myAttempt.score === myAttempt.maxScore && " 🏆 PERFEKT!"}
                {myAttempt.score >= Math.floor(myAttempt.maxScore * 0.7) && myAttempt.score < myAttempt.maxScore && " 🌟 Stark!"}
              </div>
              {isLoggedIn && (
                <button onClick={() => setShowTaker(true)} style={{ ...btnGhost({ marginTop: 8, fontSize: 11 }) }}>
                  🔄 Nochmal versuchen
                </button>
              )}
            </div>
          ) : isLoggedIn ? (
            <button onClick={() => setShowTaker(true)} style={btnPrimary()}>
              🎯 Quiz starten ({quiz.questions.length} Fragen)
            </button>
          ) : (
            <a href="/login" style={{ ...btnPrimary({ display: "inline-block", textDecoration: "none" }) }}>
              🔓 Einloggen zum Spielen
            </a>
          )}
        </div>
      )}
      {!isOwner && !quiz && (
        <div style={{ padding: 16, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
          @{username} hat noch kein Quiz erstellt 😔
        </div>
      )}

      {/* Leaderboard */}
      {leaderboard.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>
            🏆 Top-Rater
          </div>
          {leaderboard.slice(0, 5).map((entry, i) => (
            <div key={`${entry.userId}-${i}`} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "6px 8px",
              background: i === 0 ? "rgba(251,191,36,0.1)" : i === 1 ? "rgba(148,163,184,0.1)" : i === 2 ? "rgba(180,83,9,0.08)" : "transparent",
              borderRadius: 8,
            }}>
              <div style={{ fontSize: 16, width: 22 }}>
                {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}
              </div>
              <div style={{ flex: 1, fontSize: 12, fontWeight: 700 }}>@{entry.username}</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#ec4899" }}>{entry.score}/{entry.maxScore}</div>
            </div>
          ))}
        </div>
      )}

      {showBuilder && <Builder existing={quiz?.questions || []} onClose={() => setShowBuilder(false)} onSaved={() => { setShowBuilder(false); refresh(); }} />}
      {showTaker && <Taker quiz={quiz} username={username} onClose={() => setShowTaker(false)} onDone={() => { setShowTaker(false); refresh(); }} />}
    </div>
  );
}

function Builder({ existing, onClose, onSaved }) {
  const [questions, setQuestions] = useState(existing.length > 0 ? existing : [
    { q: "", options: ["", "", "", ""], correct: 0 },
  ]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  function addQ() {
    if (questions.length >= 10) return;
    setQuestions((qs) => [...qs, { q: "", options: ["", "", "", ""], correct: 0 }]);
  }
  function removeQ(idx) {
    setQuestions((qs) => qs.filter((_, i) => i !== idx));
  }
  function updateQ(idx, patch) {
    setQuestions((qs) => qs.map((q, i) => i === idx ? { ...q, ...patch } : q));
  }
  function updateOption(qi, oi, value) {
    setQuestions((qs) => qs.map((q, i) => i === qi ? { ...q, options: q.options.map((o, j) => j === oi ? value : o) } : q));
  }

  async function save() {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/me/knowme", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      onSaved();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <Modal onClose={onClose}>
      <h3 style={{ margin: "0 0 12px", fontSize: 17, fontWeight: 900 }}>🛠 Quiz-Editor</h3>
      <p style={{ fontSize: 12, color: "#64748b", marginTop: 0, marginBottom: 16 }}>
        Mind. 1, max. 10 Fragen. Je 4 Antworten. Tipp die Korrekte an.
      </p>
      {err && <div style={{ color: "#991b1b", marginBottom: 10, fontSize: 12, fontWeight: 700 }}>⚠ {err}</div>}

      {questions.map((q, qi) => (
        <div key={qi} style={{ background: "#fafafa", padding: 12, borderRadius: 10, marginBottom: 10 }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
            <b style={{ fontSize: 12, color: "#64748b" }}>Frage {qi + 1}</b>
            {questions.length > 1 && (
              <button onClick={() => removeQ(qi)} style={{ marginLeft: "auto", background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 14 }}>×</button>
            )}
          </div>
          <input value={q.q} onChange={(e) => updateQ(qi, { q: e.target.value })} maxLength={200}
            placeholder="Was ist meine Lieblingsfarbe?"
            style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #cbd5e1", fontFamily: "inherit", fontSize: 13, boxSizing: "border-box" }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 8 }}>
            {q.options.map((o, oi) => (
              <label key={oi} style={{
                display: "flex", alignItems: "center", gap: 6, padding: 8, borderRadius: 8,
                background: q.correct === oi ? "rgba(16,185,129,0.12)" : "#fff",
                border: q.correct === oi ? "2px solid #10b981" : "1px solid #e5e5e7",
                cursor: "pointer",
              }}>
                <input type="radio" name={`q${qi}`} checked={q.correct === oi}
                  onChange={() => updateQ(qi, { correct: oi })}
                  style={{ accentColor: "#10b981" }} />
                <input value={o} onChange={(e) => updateOption(qi, oi, e.target.value)} maxLength={120}
                  placeholder={`Antwort ${oi + 1}`}
                  style={{ flex: 1, border: "none", background: "transparent", fontFamily: "inherit", fontSize: 12, outline: "none" }} />
              </label>
            ))}
          </div>
        </div>
      ))}

      <button onClick={addQ} disabled={questions.length >= 10} style={{ ...btnGhost({ width: "100%", marginBottom: 12, opacity: questions.length >= 10 ? 0.5 : 1 }) }}>
        + Weitere Frage ({questions.length}/10)
      </button>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onClose} style={{ ...btnGhost({ flex: 1 }) }}>Abbrechen</button>
        <button onClick={save} disabled={busy} style={{ ...btnPrimary({ flex: 2 }) }}>
          {busy ? "⏳…" : "💾 Quiz speichern"}
        </button>
      </div>
      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 8, textAlign: "center" }}>
        ⚠ Beim Speichern werden alle bisherigen Ratings zurückgesetzt
      </div>
    </Modal>
  );
}

function Taker({ quiz, username, onClose, onDone }) {
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState(Array(quiz.questions.length).fill(-1));
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  function pick(opt) {
    const next = [...answers]; next[idx] = opt; setAnswers(next);
    if (idx < quiz.questions.length - 1) {
      setTimeout(() => setIdx(idx + 1), 250);
    }
  }

  async function submit() {
    setBusy(true); setErr("");
    try {
      const r = await fetch(`/api/users/${encodeURIComponent(username)}/knowme/attempt`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setResult(d);
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  if (result) {
    return (
      <Modal onClose={onDone}>
        <div style={{ textAlign: "center", padding: 16 }}>
          <div style={{ fontSize: 60 }}>{result.score === result.max ? "🏆" : result.score >= result.max * 0.7 ? "🌟" : result.score >= result.max * 0.4 ? "👍" : "🤔"}</div>
          <h3 style={{ fontSize: 22, fontWeight: 900, margin: "8px 0" }}>
            {result.score} / {result.max}
          </h3>
          <p style={{ fontSize: 13, color: "#64748b" }}>
            {result.score === result.max ? "Perfekt! Du kennst @" + username + " in- und auswendig!"
            : result.score >= result.max * 0.7 ? "Sehr gut!"
            : result.score >= result.max * 0.4 ? "Geht so 😅"
            : "Da müsst ihr nochmal Quality-Time einplanen 😂"}
          </p>
          <button onClick={onDone} style={{ ...btnPrimary({ marginTop: 14, width: "100%" }) }}>
            ✓ Schließen
          </button>
        </div>
      </Modal>
    );
  }

  const q = quiz.questions[idx];
  const allAnswered = answers.every((a) => a !== -1);

  return (
    <Modal onClose={onClose}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>
          Frage {idx + 1} / {quiz.questions.length}
        </div>
        <div style={{ width: "100%", height: 6, background: "#e5e5e7", borderRadius: 999 }}>
          <div style={{
            width: `${((idx + 1) / quiz.questions.length) * 100}%`, height: "100%",
            background: "linear-gradient(135deg, #ec4899, #a855f7)", borderRadius: 999,
          }} />
        </div>
      </div>

      <h3 style={{ fontSize: 16, fontWeight: 800, marginTop: 12, marginBottom: 14 }}>{q.q}</h3>

      <div style={{ display: "grid", gap: 8 }}>
        {q.options.map((o, i) => (
          <button key={i} onClick={() => pick(i)} style={{
            padding: 14, borderRadius: 10, fontSize: 13, fontWeight: 700, textAlign: "left",
            background: answers[idx] === i ? "linear-gradient(135deg, rgba(236,72,153,0.15), rgba(168,85,247,0.1))" : "#fafafa",
            border: answers[idx] === i ? "2px solid #ec4899" : "1px solid #e5e5e7",
            cursor: "pointer", fontFamily: "inherit",
          }}>
            <b style={{ color: "#a855f7", marginRight: 8 }}>{String.fromCharCode(65 + i)}</b> {o}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        {idx > 0 && (
          <button onClick={() => setIdx(idx - 1)} style={{ ...btnGhost({ flex: 1 }) }}>← Zurück</button>
        )}
        {idx < quiz.questions.length - 1 && (
          <button onClick={() => setIdx(idx + 1)} style={{ ...btnGhost({ flex: 1 }) }}>Weiter →</button>
        )}
        {idx === quiz.questions.length - 1 && (
          <button onClick={submit} disabled={!allAnswered || busy} style={{ ...btnPrimary({ flex: 2, opacity: allAnswered ? 1 : 0.5 }) }}>
            {busy ? "⏳…" : "✓ Auswerten"}
          </button>
        )}
      </div>
      {err && <div style={{ color: "#991b1b", marginTop: 8, fontSize: 12 }}>⚠ {err}</div>}
    </Modal>
  );
}

function Modal({ onClose, children }) {
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "#fff", padding: 22, borderRadius: 18, maxWidth: 500, width: "100%",
        maxHeight: "90vh", overflowY: "auto",
      }}>{children}</div>
    </div>
  );
}

function btnPrimary(x = {}) { return { padding: 12, borderRadius: 10, background: "linear-gradient(135deg,#ec4899,#a855f7)", color: "#fff", border: "none", fontFamily: "inherit", fontSize: 14, fontWeight: 800, cursor: "pointer", ...x }; }
function btnGhost(x = {}) { return { padding: 10, borderRadius: 10, background: "#f5f5f7", color: "#475569", border: "1px solid #e5e5e7", fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer", ...x }; }
