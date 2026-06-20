#!/usr/bin/env node
// ❓ "Wer kennt mich am besten?" Quiz — User erstellt 5 Multiple-Choice-Fragen über sich.
//
// Tabellen:
//   • know_me_quizzes — user_id (PK), questions (JSON: [{q, options[4], correct}]), updated_at
//   • know_me_attempts — id, quiz_user_id, taker_user_id, score, max_score, created_at
//
// Helpers:
//   • saveKnowMeQuiz(userId, questions)
//   • getKnowMeQuiz(userId, { hideAnswers })
//   • submitKnowMeAttempt(quizUserId, takerUserId, answers)
//   • listKnowMeLeaderboard(quizUserId, limit)

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const DB_PATH = join(ROOT, "lib", "db.js");

const MARK_TABLE = "/* ❓ KNOWMEBEST_TABLE_V1 */";
const MARK_FN    = "// ❓ KNOWMEBEST_FN_V1";

let src = readFileSync(DB_PATH, "utf-8");
let changed = false;

if (!src.includes(MARK_TABLE)) {
  const ANCHOR = "CREATE TABLE IF NOT EXISTS top_friends (";
  if (!src.includes(ANCHOR)) { console.error("✗ Anker top_friends fehlt"); process.exit(1); }
  const INJECT = `${MARK_TABLE}
    CREATE TABLE IF NOT EXISTS know_me_quizzes (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      questions TEXT NOT NULL DEFAULT '[]',
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS know_me_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quiz_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      taker_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      score INTEGER NOT NULL DEFAULT 0,
      max_score INTEGER NOT NULL DEFAULT 0,
      answers TEXT DEFAULT '[]',
      created_at INTEGER NOT NULL,
      UNIQUE(quiz_user_id, taker_user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_kma_quiz_score ON know_me_attempts(quiz_user_id, score DESC, created_at DESC);

    ${ANCHOR}`;
  src = src.replace(ANCHOR, INJECT);
  changed = true;
  console.log("✓ know_me_quizzes + know_me_attempts ergänzt.");
}

if (!src.includes(MARK_FN)) {
  const FN = `

${MARK_FN}
// ❓ KnowMeBest Helpers

function _validateQuestions(arr) {
  if (!Array.isArray(arr)) throw new Error("questions muss Array sein");
  if (arr.length === 0) throw new Error("Mindestens 1 Frage");
  if (arr.length > 10) throw new Error("Max 10 Fragen");
  return arr.map((q, i) => {
    const text = String(q?.q || "").trim().slice(0, 200);
    if (!text) throw new Error(\`Frage \${i + 1}: leer\`);
    if (!Array.isArray(q?.options) || q.options.length !== 4) {
      throw new Error(\`Frage \${i + 1}: braucht genau 4 Antworten\`);
    }
    const options = q.options.map((o) => String(o || "").trim().slice(0, 120));
    if (options.some((o) => !o)) throw new Error(\`Frage \${i + 1}: Antworten dürfen nicht leer sein\`);
    const correct = Number(q?.correct);
    if (![0,1,2,3].includes(correct)) throw new Error(\`Frage \${i + 1}: correct muss 0-3 sein\`);
    return { q: text, options, correct };
  });
}

export function saveKnowMeQuiz(userId, questions) {
  const valid = _validateQuestions(questions);
  const now = Date.now();
  db().prepare(\`
    INSERT INTO know_me_quizzes (user_id, questions, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET questions = excluded.questions, updated_at = excluded.updated_at
  \`).run(Number(userId), JSON.stringify(valid), now);
  // Bei Quiz-Update werden alle alten Attempts gelöscht (sonst wäre Leaderboard ungültig)
  db().prepare("DELETE FROM know_me_attempts WHERE quiz_user_id = ?").run(Number(userId));
  return valid.length;
}

export function getKnowMeQuiz(userId, { hideAnswers = false } = {}) {
  try {
    const r = db().prepare("SELECT questions, updated_at AS updatedAt FROM know_me_quizzes WHERE user_id = ?").get(Number(userId));
    if (!r) return null;
    const questions = JSON.parse(r.questions || "[]");
    if (hideAnswers) {
      return {
        questions: questions.map((q) => ({ q: q.q, options: q.options })),
        updatedAt: r.updatedAt,
      };
    }
    return { questions, updatedAt: r.updatedAt };
  } catch { return null; }
}

export function submitKnowMeAttempt(quizUserId, takerUserId, answers) {
  if (Number(quizUserId) === Number(takerUserId)) {
    throw new Error("Eigenes Quiz kann man nicht machen");
  }
  const quiz = getKnowMeQuiz(quizUserId, { hideAnswers: false });
  if (!quiz) throw new Error("Quiz nicht gefunden");
  if (!Array.isArray(answers)) throw new Error("answers muss Array sein");
  let score = 0;
  const detail = quiz.questions.map((q, i) => {
    const picked = Number(answers[i]);
    const correct = picked === q.correct;
    if (correct) score++;
    return { picked, correct: q.correct, wasRight: correct };
  });
  const now = Date.now();
  db().prepare(\`
    INSERT INTO know_me_attempts (quiz_user_id, taker_user_id, score, max_score, answers, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(quiz_user_id, taker_user_id) DO UPDATE SET
      score = excluded.score, max_score = excluded.max_score,
      answers = excluded.answers, created_at = excluded.created_at
  \`).run(Number(quizUserId), Number(takerUserId), score, quiz.questions.length, JSON.stringify(detail), now);
  return { score, max: quiz.questions.length, detail };
}

export function listKnowMeLeaderboard(quizUserId, limit = 20) {
  try {
    return db().prepare(\`
      SELECT a.taker_user_id AS userId, a.score, a.max_score AS maxScore, a.created_at AS createdAt,
             u.username, u.display_name AS displayName, u.emoji, u.avatar_url AS avatarUrl
        FROM know_me_attempts a
        LEFT JOIN users u ON u.id = a.taker_user_id
        WHERE a.quiz_user_id = ?
        ORDER BY a.score DESC, a.created_at ASC
        LIMIT ?
    \`).all(Number(quizUserId), Number(limit));
  } catch { return []; }
}

export function getMyKnowMeAttempt(quizUserId, takerUserId) {
  try {
    return db().prepare(\`
      SELECT score, max_score AS maxScore, answers, created_at AS createdAt
        FROM know_me_attempts
        WHERE quiz_user_id = ? AND taker_user_id = ?
    \`).get(Number(quizUserId), Number(takerUserId));
  } catch { return null; }
}
`;
  src += FN;
  changed = true;
  console.log("✓ KnowMeBest Helpers angefügt.");
}

if (changed) {
  writeFileSync(DB_PATH, src);
  console.log("\\n✓ db.js gepatched (KnowMeBest).");
} else {
  console.log("\\n✓ Nichts zu tun.");
}
