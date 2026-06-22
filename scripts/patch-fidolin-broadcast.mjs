#!/usr/bin/env node
// 🎀 Fidolin System-Broadcast — Helper für DMs von Fidolin an alle User.
//
// (Es existiert bereits broadcastSystemMessage mit einem "system"-Sender.
//  Dieser Patch fügt eine ZWEITE Variante hinzu, die als Absender FIDOLIN nutzt —
//  freundlicher, persönlicher Ton für regelmäßige Update-Digests.)
//
// Helpers:
//   broadcastFromFidolin(text) → Anzahl der gesendeten DMs
//   countFidolinBroadcastRecipients() → Wie viele User würden erhalten

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const DB_PATH = join(ROOT, "lib", "db.js");

const MARK = "// 🎀 FIDOLIN_BROADCAST_V1";

let src = readFileSync(DB_PATH, "utf-8");
if (src.includes(MARK)) {
  console.log("✓ Marker bereits drin — skip.");
  process.exit(0);
}

const FN = `

${MARK}
// 🎀 Fidolin-Broadcast: schickt DMs von Fidolin (Bot) an alle approved User.
// Nutzt ensureFidolinUser + sendMessage + addNotification + publishToUser.

export function broadcastFromFidolin(text) {
  const fidolinId = ensureFidolinUser();
  if (!fidolinId) return { ok: false, count: 0, error: "Fidolin-User fehlt" };
  const body = String(text || "").trim().slice(0, 2000);
  if (!body) return { ok: false, count: 0, error: "Leere Nachricht" };

  let userIds = [];
  try {
    userIds = db().prepare(
      "SELECT id FROM users WHERE status = 'approved' AND id != ? AND COALESCE(role,'') != 'bot'"
    ).all(fidolinId).map((r) => Number(r.id));
  } catch (e) {
    return { ok: false, count: 0, error: e.message };
  }

  let count = 0;
  const tx = db().transaction(() => {
    for (const uid of userIds) {
      try {
        const info = db().prepare(\`
          INSERT INTO messages (from_user_id, to_user_id, text, created_at, kind, audio_url, once_only, consumed, image_url)
          VALUES (?, ?, ?, ?, 'text', NULL, 0, 0, '')
        \`).run(fidolinId, uid, body, Date.now());
        try {
          addNotification({
            userId: uid, actorId: fidolinId,
            type: "message",
            targetType: "message",
            targetId: Number(info.lastInsertRowid),
            preview: "🎀 " + body.slice(0, 80),
          });
        } catch {}
        try {
          if (typeof publishToUser === "function") {
            publishToUser(uid, "message", { id: Number(info.lastInsertRowid) });
          }
        } catch {}
        count++;
      } catch {}
    }
  });
  try { tx(); } catch (e) { return { ok: false, count, error: e.message }; }

  try { audit({ userId: fidolinId, action: "fidolin.broadcast", detail: \`recipients=\${count},len=\${body.length}\` }); } catch {}
  return { ok: true, count };
}

export function countFidolinBroadcastRecipients() {
  try {
    const fidolinId = ensureFidolinUser() || 0;
    const r = db().prepare(
      "SELECT COUNT(*) AS c FROM users WHERE status = 'approved' AND id != ? AND COALESCE(role,'') != 'bot'"
    ).get(fidolinId);
    return r?.c || 0;
  } catch { return 0; }
}
`;

writeFileSync(DB_PATH, src + FN);
console.log("✓ broadcastFromFidolin + countFidolinBroadcastRecipients angefügt.");
