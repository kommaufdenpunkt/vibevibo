"use client";

// 🧠 Quiz-Night für Coms — async Quiz mit Score + Leaderboard.
// Members erstellen Quiz, andere nehmen teil wann sie wollen.

import { useCallback, useEffect, useState } from "react";

export default function ComQuizzes({ slug, isMember, isOwner, themeColor = "#ec4899" }) {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [msg, setMsg] = useState(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/groups/${encodeURIComponent(slug)}/quizzes`, { credentials: "include" });
      const d = await r.json();
      if (r.ok) setQuizzes(d.quizzes || []);
    } catch {}
    finally { setLoading(false); }
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  async function deleteQuiz(quizId) {
    if (!confirm("Quiz komplett löschen?")) return;
    try {
      const r = await fetch(`/api/groups/${encodeURIComponent(slug)}/quizzes/${quizId}`, {
        method: "DELETE", credentials: "include",
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Fehler");
      setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
      setActiveQuiz(null);
    } catch (e) { showFlash(false, e.message); }
  }

  async function closeQuiz(quizId) {
    if (!confirm("Quiz schließen? Keine weiteren Teilnahmen möglich.")) return;
    try {
      const r = await fetch(`/api/groups/${encodeURIComponent(slug)}/quizzes/${quizId}`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "close" }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Fehler");
      setQuizzes((prev) => prev.map((q) => q.id === quizId ? d.quiz : q));
    } catch (e) { showFlash(false, e.message); }
  }

  function showFlash(ok, text) {
    setMsg({ ok, text });
    setTimeout(() => setMsg(null), 4000);
  }

  if (loading) return null;

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8, marginBottom: 8,
        padding: "0 4px",
      }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: "#fff", textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}>
          🧠 Quizze {quizzes.length > 0 && `(${quizzes.length})`}
        </span>
        {isMember && !showCreate && !activeQuiz && (
          <button onClick={() => setShowCreate(true)} style={{
            marginLeft: "auto", padding: "6px 12px", borderRadius: 999,
            border: "none", background: themeColor, color: "#fff",
            fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
          }}>+ Neues Quiz</button>
        )}
      </div>

      {msg && (
        <div style={{
          padding: 8, borderRadius: 8, marginBottom: 8, fontWeight: 700, fontSize: 13,
          background: msg.ok ? "#dcfce7" : "#fee2e2",
          color: msg.ok ? "#166534" : "#991b1b",
        }}>{msg.text}</div>
      )}

      {showCreate && (
        <QuizCreator
          slug={slug} themeColor={themeColor}
          onCancel={() => setShowCreate(false)}
          onCreated={(quiz) => {
            setQuizzes((prev) => [quiz, ...prev]);
            setShowCreate(false);
            showFlash(true, "✓ Quiz erstellt!");
          }}
          onError={(e) => showFlash(false, e)}
        />
      )}

      {activeQuiz && (
        <QuizPlayer
          slug={slug} quizId={activeQuiz} themeColor={themeColor}
          isOwner={isOwner}
          onClose={() => { setActiveQuiz(null); load(); }}
        />
      )}

      {!showCreate && !activeQuiz && quizzes.map((q) => (
        <QuizCard key={q.id} quiz={q} themeColor={themeColor}
          onOpen={() => setActiveQuiz(q.id)}
          onClose={isOwner ? () => closeQuiz(q.id) : null}
          onDelete={isOwner ? () => deleteQuiz(q.id) : null}
        />
      ))}
    </div>
  );
}

function QuizCard({ quiz, themeColor, onOpen, onClose, onDelete }) {
  const myAttempt = quiz.myAttempt;
  return (
    <div style={{
      background: "rgba(255,255,255,0.96)", borderRadius: 12,
      padding: 12, marginBottom: 8, border: `2px solid ${themeColor}33`,
      cursor: "pointer",
    }} onClick={onOpen}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 24 }}>🧠</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#1f2937" }}>
            {quiz.title}
            {quiz.closed && <span style={{
              marginLeft: 6, padding: "1px 6px", borderRadius: 6,
              background: "#e2e8f0", color: "#475569", fontSize: 10, fontWeight: 700,
            }}>GESCHLOSSEN</span>}
          </div>
          <div style={{ fontSize: 11, color: "#64748b" }}>
            von @{quiz.authorUsername} · {quiz.questionCount} Fragen · {quiz.totalAttempts} Teilnehmer
            {myAttempt && (
              <> · <b style={{ color: themeColor }}>Du: {myAttempt.score}/{myAttempt.maxScore}</b></>
            )}
          </div>
        </div>
        {(onClose || onDelete) && (
          <details onClick={(e) => e.stopPropagation()} style={{ position: "relative" }}>
            <summary style={{ cursor: "pointer", listStyle: "none", padding: 4, color: "#64748b", fontSize: 16 }}>⋯</summary>
            <div style={{
              position: "absolute", right: 0, top: "100%", marginTop: 4,
              background: "#fff", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              padding: 4, zIndex: 10, minWidth: 140,
            }}>
              {onClose && !quiz.closed && (
                <button onClick={onClose} style={menuItem}>🔒 Schließen</button>
              )}
              {onDelete && (
                <button onClick={onDelete} style={{ ...menuItem, color: "#b91c1c" }}>🗑 Löschen</button>
              )}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

function QuizCreator({ slug, themeColor, onCancel, onCreated, onError }) {
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState([{ q: "", options: ["", ""], correctIdx: 0 }]);
  const [busy, setBusy] = useState(false);

  function addQuestion() {
    if (questions.length >= 15) return;
    setQuestions((p) => [...p, { q: "", options: ["", ""], correctIdx: 0 }]);
  }
  function removeQuestion(i) {
    setQuestions((p) => p.filter((_, idx) => idx !== i));
  }
  function updateQ(i, patch) {
    setQuestions((p) => p.map((q, idx) => idx === i ? { ...q, ...patch } : q));
  }
  function updateOpt(qi, oi, v) {
    setQuestions((p) => p.map((q, idx) => idx === qi
      ? { ...q, options: q.options.map((o, j) => j === oi ? v : o) }
      : q));
  }
  function addOpt(qi) {
    setQuestions((p) => p.map((q, idx) => idx === qi && q.options.length < 4
      ? { ...q, options: [...q.options, ""] } : q));
  }
  function removeOpt(qi, oi) {
    setQuestions((p) => p.map((q, idx) => {
      if (idx !== qi || q.options.length <= 2) return q;
      const opts = q.options.filter((_, j) => j !== oi);
      const correctIdx = q.correctIdx >= opts.length ? 0 : q.correctIdx;
      return { ...q, options: opts, correctIdx };
    }));
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await fetch(`/api/groups/${encodeURIComponent(slug)}/quizzes`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, questions }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Fehler");
      onCreated(d.quiz);
    } catch (e) { onError(e.message); }
    finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} style={{
      background: "rgba(255,255,255,0.96)", borderRadius: 12,
      padding: 12, marginBottom: 10, border: `2px solid ${themeColor}55`,
    }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: "#475569", marginBottom: 6 }}>TITEL</div>
      <input className="vv-input" value={title} onChange={(e) => setTitle(e.target.value)}
        maxLength={160} placeholder="z.B. 90er-Hits, Geographie-Wissen, Com-Insider…"
        style={{ width: "100%", boxSizing: "border-box", marginBottom: 12 }} />

      {questions.map((q, qi) => (
        <div key={qi} style={{
          padding: 10, borderRadius: 10, marginBottom: 8,
          background: "#f8fafc", border: "1px solid rgba(0,0,0,0.06)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <b style={{ fontSize: 12, color: "#475569" }}>FRAGE {qi + 1}</b>
            {questions.length > 1 && (
              <button type="button" onClick={() => removeQuestion(qi)}
                style={{ marginLeft: "auto", padding: "2px 8px", borderRadius: 6,
                  border: "1px solid #fecaca", background: "#fef2f2",
                  color: "#b91c1c", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>
                ✕ Frage löschen
              </button>
            )}
          </div>
          <input className="vv-input" value={q.q} maxLength={240}
            onChange={(e) => updateQ(qi, { q: e.target.value })}
            placeholder="z.B. Welches Jahr…"
            style={{ width: "100%", boxSizing: "border-box", marginBottom: 8 }} />

          <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 4 }}>
            ANTWORT-OPTIONEN (✓ markiert die richtige Antwort)
          </div>
          {q.options.map((o, oi) => (
            <div key={oi} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
              <button type="button" onClick={() => updateQ(qi, { correctIdx: oi })}
                style={{
                  width: 28, height: 28, borderRadius: 6, cursor: "pointer",
                  border: `2px solid ${q.correctIdx === oi ? "#16a34a" : "#cbd5e1"}`,
                  background: q.correctIdx === oi ? "#dcfce7" : "#fff",
                  color: q.correctIdx === oi ? "#16a34a" : "#94a3b8",
                  fontWeight: 800, fontSize: 14,
                }}>{q.correctIdx === oi ? "✓" : "○"}</button>
              <input className="vv-input" value={o} maxLength={120}
                onChange={(e) => updateOpt(qi, oi, e.target.value)}
                placeholder={`Option ${oi + 1}`}
                style={{ flex: 1 }} />
              {q.options.length > 2 && (
                <button type="button" onClick={() => removeOpt(qi, oi)}
                  style={{ padding: "0 8px", borderRadius: 6,
                    border: "1px solid #fecaca", background: "#fef2f2",
                    color: "#b91c1c", cursor: "pointer", fontWeight: 700 }}>✕</button>
              )}
            </div>
          ))}
          {q.options.length < 4 && (
            <button type="button" onClick={() => addOpt(qi)} style={{
              padding: "4px 10px", borderRadius: 6, marginTop: 4,
              border: "1px dashed #cbd5e1", background: "transparent",
              color: "#64748b", fontWeight: 700, fontSize: 11, cursor: "pointer",
            }}>+ Option</button>
          )}
        </div>
      ))}

      {questions.length < 15 && (
        <button type="button" onClick={addQuestion} style={{
          width: "100%", padding: 8, borderRadius: 8, marginBottom: 10,
          border: "1px dashed #cbd5e1", background: "transparent",
          color: "#64748b", fontWeight: 700, fontSize: 12, cursor: "pointer",
        }}>+ Frage hinzufügen ({questions.length}/15)</button>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" onClick={onCancel} className="vv-btn" style={{ flex: 1 }}>Abbrechen</button>
        <button type="submit" disabled={busy} className="vv-btn-big vv-btn-big-pink"
          style={{ flex: 2, padding: 10, fontSize: 14 }}>
          {busy ? "Speichere…" : "🧠 Quiz erstellen"}
        </button>
      </div>
    </form>
  );
}

function QuizPlayer({ slug, quizId, themeColor, isOwner, onClose }) {
  const [data, setData] = useState(null);
  const [answers, setAnswers] = useState({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    fetch(`/api/groups/${encodeURIComponent(slug)}/quizzes/${quizId}`, { credentials: "include" })
      .then((r) => r.json()).then(setData).catch(() => {});
  }, [slug, quizId]);

  async function submit() {
    setBusy(true);
    const answersArr = data.quiz.questions.map((_, i) => answers[i] ?? -1);
    try {
      const r = await fetch(`/api/groups/${encodeURIComponent(slug)}/quizzes/${quizId}/attempt`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: answersArr }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Fehler");
      setResult(d);
    } catch (e) { alert(e.message); }
    finally { setBusy(false); }
  }

  if (!data) return <div style={{
    background: "rgba(255,255,255,0.96)", borderRadius: 12, padding: 14, marginBottom: 8,
  }}>⏳ Lade Quiz…</div>;

  const { quiz, leaderboard } = data;
  const alreadyAttempted = !!quiz.myAttempt;
  const showResults = result || alreadyAttempted;

  const totalAnswered = Object.keys(answers).length;
  const allAnswered = totalAnswered === quiz.questions.length;

  return (
    <div style={{
      background: "rgba(255,255,255,0.96)", borderRadius: 12, padding: 14, marginBottom: 8,
      border: `2px solid ${themeColor}55`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <button onClick={onClose} style={{
          padding: "4px 10px", borderRadius: 6, border: "1px solid #cbd5e1",
          background: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 12,
        }}>← Zurück</button>
        <h3 style={{ margin: 0, color: "#1f2937", flex: 1 }}>🧠 {quiz.title}</h3>
        {quiz.closed && <span style={{
          padding: "2px 8px", borderRadius: 6, background: "#e2e8f0",
          color: "#475569", fontSize: 11, fontWeight: 800,
        }}>GESCHLOSSEN</span>}
      </div>

      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10 }}>
        von @{quiz.authorUsername} · {quiz.questionCount} Fragen · {quiz.totalAttempts} Teilnehmer
      </div>

      {!showResults && quiz.questions.map((q, qi) => (
        <div key={qi} style={{
          padding: 10, borderRadius: 10, marginBottom: 8,
          background: "#f8fafc", border: "1px solid rgba(0,0,0,0.06)",
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1f2937", marginBottom: 8 }}>
            {qi + 1}. {q.q}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {q.options.map((opt, oi) => (
              <button key={oi} onClick={() => setAnswers((p) => ({ ...p, [qi]: oi }))}
                style={{
                  padding: "8px 12px", borderRadius: 8, textAlign: "left",
                  border: `2px solid ${answers[qi] === oi ? themeColor : "rgba(0,0,0,0.08)"}`,
                  background: answers[qi] === oi ? "#fdf2f8" : "#fff",
                  cursor: "pointer", fontFamily: "inherit", fontSize: 13,
                  color: "#1f2937", fontWeight: 600,
                }}>
                {answers[qi] === oi && "✓ "}{opt}
              </button>
            ))}
          </div>
        </div>
      ))}

      {!showResults && (
        <button onClick={submit} disabled={busy || !allAnswered}
          style={{
            width: "100%", padding: 12, borderRadius: 10,
            border: "none", cursor: allAnswered ? "pointer" : "not-allowed",
            background: allAnswered ? themeColor : "#cbd5e1",
            color: "#fff", fontWeight: 800, fontSize: 14, fontFamily: "inherit",
            marginTop: 8,
          }}>
          {busy ? "⏳ Sende…" : allAnswered ? "✓ Auswerten" : `Bitte alle ${quiz.questions.length} Fragen beantworten (${totalAnswered}/${quiz.questions.length})`}
        </button>
      )}

      {showResults && (() => {
        const myScore = result?.result?.score ?? quiz.myAttempt?.score;
        const myMax = result?.result?.maxScore ?? quiz.myAttempt?.maxScore;
        const breakdown = result?.result?.breakdown;
        return (
          <>
            <div style={{
              padding: 14, borderRadius: 12, marginBottom: 12,
              background: "linear-gradient(135deg, #ecfdf5, #d1fae5)",
              border: "2px solid #86efac", textAlign: "center",
            }}>
              <div style={{ fontSize: 32, fontWeight: 900, color: "#166534" }}>
                {myScore} / {myMax}
              </div>
              <div style={{ fontSize: 12, color: "#15803d", marginTop: 2 }}>
                {Math.round((myScore / myMax) * 100)}% — {scoreLabel(myScore, myMax)}
              </div>
            </div>

            {/* Antworten-Review wenn Breakdown verfügbar */}
            {breakdown && quiz.questions.map((q, qi) => {
              const b = breakdown[qi];
              return (
                <div key={qi} style={{
                  padding: 8, borderRadius: 8, marginBottom: 6,
                  background: b.ok ? "#dcfce7" : "#fee2e2",
                  border: `1px solid ${b.ok ? "#86efac" : "#fca5a5"}`,
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#1f2937" }}>
                    {b.ok ? "✓" : "✗"} {qi + 1}. {q.q}
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                    {!b.ok && <>Deine: <b>{q.options[b.picked] || "—"}</b> · </>}
                    Richtig: <b>{q.options[b.correct]}</b>
                  </div>
                </div>
              );
            })}

            <div style={{ fontSize: 12, fontWeight: 800, color: "#475569", margin: "14px 0 6px" }}>
              🏆 LEADERBOARD
            </div>
            {(result?.leaderboard || leaderboard || []).map((row, i) => (
              <div key={row.userId} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: 8, borderRadius: 8, marginBottom: 4,
                background: i < 3 ? "#fef3c7" : "#f8fafc",
              }}>
                <span style={{ fontSize: 18, fontWeight: 900, color: i === 0 ? "#92400e" : "#475569", width: 24 }}>
                  {i + 1}
                </span>
                <span style={{ fontSize: 16 }}>{row.emoji || "👤"}</span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: "#1f2937" }}>
                  {row.displayName || `@${row.username}`}
                </span>
                <span style={{ fontSize: 13, fontWeight: 800, color: themeColor }}>
                  {row.score} / {row.maxScore}
                </span>
              </div>
            ))}
          </>
        );
      })()}
    </div>
  );
}

function scoreLabel(score, max) {
  const pct = score / max;
  if (pct === 1) return "🏆 Perfekte Runde!";
  if (pct >= 0.8) return "🌟 Stark gespielt!";
  if (pct >= 0.6) return "👍 Solide!";
  if (pct >= 0.4) return "🤔 Geht besser…";
  return "📚 Da war Luft nach oben!";
}

const menuItem = {
  display: "block", width: "100%", padding: "8px 12px",
  background: "none", border: "none", textAlign: "left",
  cursor: "pointer", fontSize: 13, color: "#1f2937",
  fontFamily: "inherit",
};
