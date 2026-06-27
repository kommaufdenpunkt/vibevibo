// 🏘 Coms-Change-Requests — Anträge auf Com-Namensänderung (per Mod-Genehmigung).
//
// Workflow:
//   1. Com-Owner stellt Antrag (enqueueChangeRequest). Vibes werden NICHT
//      sofort abgezogen — erst bei Genehmigung.
//   2. Mod sichtet im MCP-Tool /mcp/coms-requests.
//   3. Approve  → spendCredits() (echte Vibes-Abbuchung) + updateComsMeta()
//      (Com wird umbenannt) + System-DM „genehmigt".
//   4. Reject   → keine Vibes, System-DM „abgelehnt" mit Begründung.
//
// 🔧 Eigene SQLite-Connection nur für die Antrags-Tabelle (lib/db.js wird NICHT
//    angefasst). Vibes-Abzug + Rename + DM laufen über die echten db.js-Funktionen.
//    Defensive Imports: falls eine Funktion fehlt, bricht nichts hart — es wird
//    sauber gemeldet statt zu crashen.

import Database from "better-sqlite3";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import * as vvdb from "./db.js";
import { sendSystemDM } from "./systemDms.js";

function findDbPath() {
  const env = process.env.DB_PATH || process.env.VV_DB_PATH;
  if (env && existsSync(env)) return env;
  const cwd = process.cwd();
  const candidates = [
    resolve(cwd, "data/db.sqlite"),
    resolve(cwd, "data/vibevibo.db"),
    "/data/db.sqlite",
    "/data/vibevibo.db",
    "/app/data/db.sqlite",
  ];
  for (const p of candidates) if (existsSync(p)) return p;
  throw new Error("comChangeRequests: DB nicht gefunden.");
}

let _db = null;
let _schemaReady = false;

function db() {
  if (!_db) {
    _db = new Database(findDbPath());
    try { _db.pragma("journal_mode = WAL"); } catch {}
  }
  if (!_schemaReady) {
    ensureComRequestsSchema(_db);
    _schemaReady = true;
  }
  return _db;
}

function tableExists(database, name) {
  return !!database.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
  ).get(name);
}

export function ensureComRequestsSchema(database) {
  if (!tableExists(database, "com_change_requests")) {
    database.exec(`
      CREATE TABLE com_change_requests (
        id                    INTEGER PRIMARY KEY AUTOINCREMENT,
        com_id                INTEGER NOT NULL,
        com_slug              TEXT NOT NULL,
        requested_by_user_id  INTEGER NOT NULL,
        request_type          TEXT NOT NULL DEFAULT 'rename',
        old_value             TEXT DEFAULT NULL,
        new_value             TEXT NOT NULL,
        reason                TEXT DEFAULT NULL,
        cost_vibes            INTEGER NOT NULL DEFAULT 400,
        status                TEXT NOT NULL DEFAULT 'pending',
        requested_at          INTEGER NOT NULL,
        decided_by_mod_id     INTEGER DEFAULT NULL,
        decided_at            INTEGER DEFAULT NULL,
        decision_note         TEXT DEFAULT NULL,
        vibes_charged         INTEGER DEFAULT 0
      );
      CREATE INDEX idx_ccr_status_requested ON com_change_requests(status, requested_at DESC);
      CREATE INDEX idx_ccr_com              ON com_change_requests(com_id, requested_at DESC);
      CREATE INDEX idx_ccr_user             ON com_change_requests(requested_by_user_id, requested_at DESC);
    `);
  }
}

// Nur Namensänderung ist aktiv (Wunsch: „Wunsch-Com-Namen ändern").
const VALID_TYPES = ["rename"];
const DEFAULT_COSTS = { rename: 400 };

export function getDefaultCost(requestType = "rename") {
  return DEFAULT_COSTS[requestType] || 400;
}

// ── Antrag anlegen (vom Com-Owner) ────────────────────────────────────────
export function enqueueChangeRequest({
  comId, comSlug, requestedByUserId,
  requestType = "rename", oldValue = null, newValue, reason = null,
}) {
  if (!comId) throw new Error("comId Pflicht.");
  if (!requestedByUserId) throw new Error("requestedByUserId Pflicht.");
  if (!VALID_TYPES.includes(requestType)) throw new Error("Ungültiger Antrags-Typ.");
  const v = String(newValue || "").trim();
  if (v.length < 2) throw new Error("Neuer Name min. 2 Zeichen.");
  if (v.length > 40) throw new Error("Neuer Name max. 40 Zeichen.");

  // Nur EIN offener Antrag pro Typ & Com.
  const pending = db().prepare(
    `SELECT COUNT(*) AS c FROM com_change_requests
     WHERE com_id=? AND request_type=? AND status='pending'`
  ).get(comId, requestType).c;
  if (pending > 0) throw new Error("Es läuft bereits ein offener Antrag dieses Typs für diese Com.");

  const cost = DEFAULT_COSTS[requestType] || 400;
  const r = db().prepare(
    `INSERT INTO com_change_requests
      (com_id, com_slug, requested_by_user_id, request_type, old_value, new_value, reason, cost_vibes, requested_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    comId, String(comSlug || ""), requestedByUserId, requestType,
    oldValue, v, reason ? String(reason).slice(0, 500) : null,
    cost, Date.now(),
  );
  return { id: Number(r.lastInsertRowid), cost };
}

// ── Listen / Lesen ────────────────────────────────────────────────────────
export function listPendingComRequests({ limit = 50, offset = 0 } = {}) {
  return db().prepare(
    `SELECT r.*, u.username AS requester_username, u.display_name AS requester_display
     FROM com_change_requests r
     LEFT JOIN users u ON u.id = r.requested_by_user_id
     WHERE r.status = 'pending'
     ORDER BY r.requested_at DESC
     LIMIT ? OFFSET ?`
  ).all(Math.min(Math.max(limit, 1), 200), Math.max(offset, 0));
}

export function countPendingComRequests() {
  return db().prepare("SELECT COUNT(*) AS c FROM com_change_requests WHERE status='pending'").get().c;
}

export function getComRequestById(id) {
  return db().prepare(
    `SELECT r.*, u.username AS requester_username, u.display_name AS requester_display
     FROM com_change_requests r
     LEFT JOIN users u ON u.id = r.requested_by_user_id
     WHERE r.id = ?`
  ).get(Number(id));
}

// ── Genehmigen: Vibes abbuchen → Com umbenennen → DM ──────────────────────
export function approveComRequest({ reqId, modId, decisionNote = null }) {
  const r = getComRequestById(reqId);
  if (!r) throw new Error("Antrag nicht gefunden.");
  if (r.status !== "pending") throw new Error("Antrag ist nicht mehr offen.");

  // 1) Vibes abbuchen (echte Primitive). Reicht das Guthaben nicht → Abbruch.
  let vibesCharged = 0;
  if (r.cost_vibes > 0) {
    if (typeof vvdb.spendCredits !== "function") {
      throw new Error("Vibes-System nicht verfügbar (spendCredits fehlt) — Antrag nicht genehmigt.");
    }
    let spend;
    try {
      spend = vvdb.spendCredits(r.requested_by_user_id, r.cost_vibes, "com_rename_request", {
        reqId, comId: r.com_id, comSlug: r.com_slug,
      });
    } catch (e) {
      throw new Error("Vibes-Abbuchung fehlgeschlagen: " + (e?.message || "unbekannt"));
    }
    if (!spend || !spend.ok) {
      const miss = spend && spend.missing != null ? ` (es fehlen ${spend.missing} ✨)` : "";
      throw new Error(`Antragsteller hat nicht genug Vibes${miss} — Antrag NICHT genehmigt.`);
    }
    vibesCharged = r.cost_vibes;
  }

  // 2) Com umbenennen.
  try {
    if (r.request_type === "rename") {
      if (typeof vvdb.updateComsMeta !== "function") {
        throw new Error("updateComsMeta fehlt.");
      }
      const ok = vvdb.updateComsMeta(r.com_id, { name: r.new_value });
      if (!ok) throw new Error("Com nicht gefunden / kein Feld geändert.");
    } else {
      throw new Error("Nur Namensänderung wird aktuell unterstützt.");
    }
  } catch (e) {
    // Vibes wurden evtl. schon abgebucht → zurückgeben, sonst verliert der User sie.
    if (vibesCharged > 0 && typeof vvdb.spendCredits === "function") {
      try { vvdb.spendCredits(r.requested_by_user_id, -vibesCharged, "com_rename_refund", { reqId }); } catch {}
    }
    throw new Error("Umbenennen fehlgeschlagen: " + (e?.message || "unbekannt"));
  }

  // 3) Status setzen.
  db().prepare(
    `UPDATE com_change_requests
     SET status='approved', decided_by_mod_id=?, decided_at=?, decision_note=?, vibes_charged=?
     WHERE id=?`
  ).run(modId, Date.now(), decisionNote, vibesCharged, reqId);

  // 4) System-DM an Antragsteller.
  const body =
    `Hi! Dein Antrag, deine Com /${r.com_slug} in „${r.new_value}" umzubenennen, wurde genehmigt. ✅\n\n`
    + (vibesCharged > 0 ? `${vibesCharged} ✨ wurden von deinem Konto abgezogen.\n\n` : "")
    + (decisionNote ? `Anmerkung vom Team: ${decisionNote}\n\n` : "")
    + "— Das VibeVibo-Team";
  try {
    sendSystemDM({
      recipientUserId: r.requested_by_user_id,
      subject: "✅ Com-Namensänderung genehmigt",
      body,
      category: "success",
      requiresAck: false,
      senderLabel: "VibeVibo-Team",
      createdByModId: modId,
      contextType: "com_change_request",
      contextRef: String(reqId),
    });
  } catch (e) { console.error("[approveComRequest] DM fehlgeschlagen:", e?.message); }

  return { ok: true, reqId, vibesCharged, newName: r.new_value, comSlug: r.com_slug };
}

// ── Ablehnen: keine Vibes, DM mit Grund ───────────────────────────────────
export function rejectComRequest({ reqId, modId, decisionNote = null }) {
  const r = getComRequestById(reqId);
  if (!r) throw new Error("Antrag nicht gefunden.");
  if (r.status !== "pending") throw new Error("Antrag ist nicht mehr offen.");

  db().prepare(
    `UPDATE com_change_requests
     SET status='rejected', decided_by_mod_id=?, decided_at=?, decision_note=?
     WHERE id=?`
  ).run(modId, Date.now(), decisionNote, reqId);

  const body =
    `Hi! Dein Antrag, deine Com /${r.com_slug} in „${r.new_value}" umzubenennen, wurde leider abgelehnt.\n\n`
    + (decisionNote ? `Begründung: ${decisionNote}\n\n` : "")
    + "Es wurden keine Vibes abgezogen — du kannst einen neuen Antrag mit anderem Namen stellen.\n\n— Das VibeVibo-Team";
  try {
    sendSystemDM({
      recipientUserId: r.requested_by_user_id,
      subject: "❌ Com-Namensänderung abgelehnt",
      body,
      category: "warning",
      requiresAck: true,
      senderLabel: "VibeVibo-Team",
      createdByModId: modId,
      contextType: "com_change_request",
      contextRef: String(reqId),
    });
  } catch (e) { console.error("[rejectComRequest] DM fehlgeschlagen:", e?.message); }

  return { ok: true, reqId };
}
