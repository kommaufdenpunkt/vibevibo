#!/usr/bin/env node
// 🧠 Com-Quiz — asynchrone Wohnzimmer-Quizze.
// Owner/Members erstellen Quiz mit N Fragen, andere nehmen async teil,
// Leaderboard zeigt Top-Spieler.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const DB_PATH = join(ROOT, "lib", "db.js");

const MARK_TABLE = "/* 🧠 COM_QUIZZES_TABLE_V1 */";
const MARK_FN = "// 🧠 COM_QUIZZES_FN_V1";

let src = readFileSync(DB_PATH, "utf-8");
let changed = false;

if (!src.includes(MARK_TABLE)) {
  const ANCHOR = "CREATE TABLE IF NOT EXISTS group_posts (";
  if (!src.includes(ANCHOR)) {
    console.error("✗ Anker group_posts nicht gefunden");
    process.exit(1);
  }
  const INJECT = `${MARK_TABLE}
    CREATE TABLE IF NOT EXISTS com_quizzes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL,
      author_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      questions TEXT NOT NULL DEFAULT '[]',
      created_at INTEGER NOT NULL,
      closed INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_com_quizzes_group ON com_quizzes(group_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS com_quiz_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quiz_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      answers TEXT NOT NULL DEFAULT '[]',
      score INTEGER NOT NULL DEFAULT 0,
      max_score INTEGER NOT NULL DEFAULT 0,
      attempted_at INTEGER NOT NULL,
      UNIQUE(quiz_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_com_quiz_attempts_quiz ON com_quiz_attempts(quiz_id, score DESC);

    ${ANCHOR}`;
  src = src.replace(ANCHOR, INJECT);
  changed = true;
  console.log("✓ com_quizzes + com_quiz_attempts Tabellen ergänzt.");
}

if (!src.includes(MARK_FN)) {
  const FN = `

${MARK_FN}
// 🧠 Quiz-Helpers

function _parseQuizRow(r, { withAnswers = false, byUserId = null } = {}) {
  if (!r) return null;
  let questions = [];
  try { questions = JSON.parse(r.questions || "[]"); } catch {}
  const totalAttempts = db().prepare("SELECT COUNT(*) AS c FROM com_quiz_attempts WHERE quiz_id = ?").get(r.id)?.c || 0;
  let myAttempt = null;
  if (byUserId) {
    const a = db().prepare("SELECT answers, score, max_score, attempted_at FROM com_quiz_attempts WHERE quiz_id = ? AND user_id = ?")
      .get(Number(r.id), Number(byUserId));
    if (a) {
      let ans = [];
      try { ans = JSON.parse(a.answers || "[]"); } catch {}
      myAttempt = {
        answers: ans, score: a.score, maxScore: a.max_score, attemptedAt: a.attempted_at,
      };
    }
  }
  // Antworten-Index nur ausliefern wenn Quiz schon abgeschlossen oder Author selbst
  const publicQuestions = questions.map((q) => {
    const out = { q: q.q, options: q.options || [] };
    if (withAnswers) out.correctIdx = q.correctIdx;
    return out;
  });
  return {
    id: r.id,
    groupId: r.group_id,
    authorId: r.author_id,
    authorUsername: r.author_username || null,
    authorDisplayName: r.author_display_name || null,
    authorEmoji: r.author_emoji || null,
    title: r.title,
    questions: publicQuestions,
    questionCount: questions.length,
    totalAttempts,
    closed: !!r.closed,
    createdAt: r.created_at,
    myAttempt,
  };
}

export function createComQuiz({ groupId, authorId, title, questions }) {
  const t = String(title || "").trim();
  if (!t) throw new Error("Titel fehlt.");
  if (t.length > 160) throw new Error("Titel zu lang (max 160 Zeichen).");
  if (!Array.isArray(questions) || questions.length < 1) {
    throw new Error("Mindestens 1 Frage nötig.");
  }
  if (questions.length > 30) throw new Error("Max 30 Fragen.");
  const cleaned = questions.map((q, i) => {
    const qText = String(q.q || "").trim();
    if (!qText) throw new Error(\`Frage \${i + 1} ist leer.\`);
    if (qText.length > 240) throw new Error(\`Frage \${i + 1} zu lang.\`);
    const opts = (Array.isArray(q.options) ? q.options : [])
      .map((s) => String(s || "").trim()).filter(Boolean).slice(0, 4);
    if (opts.length < 2) throw new Error(\`Frage \${i + 1} braucht min. 2 Optionen.\`);
    const ci = Number(q.correctIdx);
    if (!Number.isInteger(ci) || ci < 0 || ci >= opts.length) {
      throw new Error(\`Frage \${i + 1}: korrekte Antwort fehlt.\`);
    }
    return { q: qText.slice(0, 240), options: opts.map((o) => o.slice(0, 120)), correctIdx: ci };
  });
  const now = Date.now();
  const info = db().prepare(\`
    INSERT INTO com_quizzes (group_id, author_id, title, questions, created_at)
    VALUES (?, ?, ?, ?, ?)
  \`).run(Number(groupId), Number(authorId), t.slice(0, 160), JSON.stringify(cleaned), now);
  return info.lastInsertRowid;
}

export function getComQuiz(quizId, { byUserId = null, withAnswers = false } = {}) {
  const r = db().prepare(\`
    SELECT q.*, u.username AS author_username, u.display_name AS author_display_name, u.emoji AS author_emoji
      FROM com_quizzes q LEFT JOIN users u ON u.id = q.author_id
     WHERE q.id = ?
  \`).get(Number(quizId));
  if (!r) return null;
  // Antworten zeigen wenn: Author, ODER User hat schon teilgenommen, ODER explizit angefragt
  let showAnswers = withAnswers;
  if (byUserId && (Number(byUserId) === r.author_id)) showAnswers = true;
  if (byUserId && !showAnswers) {
    const has = db().prepare("SELECT 1 FROM com_quiz_attempts WHERE quiz_id = ? AND user_id = ?")
      .get(Number(quizId), Number(byUserId));
    if (has) showAnswers = true;
  }
  return _parseQuizRow(r, { withAnswers: showAnswers, byUserId });
}

export function listComQuizzes(groupId, { limit = 20, byUserId = null } = {}) {
  const rows = db().prepare(\`
    SELECT q.*, u.username AS author_username, u.display_name AS author_display_name, u.emoji AS author_emoji
      FROM com_quizzes q LEFT JOIN users u ON u.id = q.author_id
     WHERE q.group_id = ?
     ORDER BY q.created_at DESC LIMIT ?
  \`).all(Number(groupId), Number(limit));
  return rows.map((r) => _parseQuizRow(r, { withAnswers: false, byUserId }));
}

export function submitQuizAttempt(quizId, userId, answers) {
  const q = db().prepare("SELECT id, questions, closed FROM com_quizzes WHERE id = ?").get(Number(quizId));
  if (!q) throw new Error("Quiz existiert nicht.");
  if (q.closed) throw new Error("Quiz ist geschlossen.");
  const existing = db().prepare("SELECT id FROM com_quiz_attempts WHERE quiz_id = ? AND user_id = ?")
    .get(Number(quizId), Number(userId));
  if (existing) throw new Error("Du hast schon teilgenommen.");
  let questions = [];
  try { questions = JSON.parse(q.questions || "[]"); } catch {}
  const ans = Array.isArray(answers) ? answers : [];
  let score = 0;
  const checked = [];
  for (let i = 0; i < questions.length; i++) {
    const correct = questions[i].correctIdx;
    const picked = Number.isInteger(ans[i]) ? ans[i] : -1;
    const ok = picked === correct;
    if (ok) score++;
    checked.push({ idx: i, picked, correct, ok });
  }
  const maxScore = questions.length;
  db().prepare(\`
    INSERT INTO com_quiz_attempts (quiz_id, user_id, answers, score, max_score, attempted_at)
    VALUES (?, ?, ?, ?, ?, ?)
  \`).run(Number(quizId), Number(userId), JSON.stringify(ans), score, maxScore, Date.now());
  return { score, maxScore, breakdown: checked };
}

export function getQuizLeaderboard(quizId, { limit = 20 } = {}) {
  return db().prepare(\`
    SELECT a.score, a.max_score AS maxScore, a.attempted_at AS attemptedAt,
           u.id AS userId, u.username, u.display_name AS displayName, u.emoji
      FROM com_quiz_attempts a JOIN users u ON u.id = a.user_id
     WHERE a.quiz_id = ?
     ORDER BY a.score DESC, a.attempted_at ASC
     LIMIT ?
  \`).all(Number(quizId), Number(limit));
}

export function getComQuizAuthor(quizId) {
  const r = db().prepare("SELECT author_id, group_id FROM com_quizzes WHERE id = ?").get(Number(quizId));
  return r ? { authorId: r.author_id, groupId: r.group_id } : null;
}

export function deleteComQuiz(quizId) {
  const tx = db().transaction(() => {
    db().prepare("DELETE FROM com_quiz_attempts WHERE quiz_id = ?").run(Number(quizId));
    db().prepare("DELETE FROM com_quizzes WHERE id = ?").run(Number(quizId));
  });
  tx();
}

export function closeComQuiz(quizId) {
  db().prepare("UPDATE com_quizzes SET closed = 1 WHERE id = ?").run(Number(quizId));
}
`;
  src += FN;
  changed = true;
  console.log("✓ Quiz-Helpers angefügt.");
}

if (changed) {
  writeFileSync(DB_PATH, src);
  console.log("\\n✓ db.js gepatched.");
} else {
  console.log("\\n✓ Nichts zu tun.");
}
