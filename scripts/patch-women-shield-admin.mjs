#!/usr/bin/env node
// 🛡 Women-Shield Admin-Helpers — Review-Liste + manuelle Override.
// Eigenes Patch-Skript damit es auch nach dem ersten Women-Shield-Patch
// idempotent nachgereicht werden kann.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const DB_PATH = join(ROOT, "lib", "db.js");

const MARK_FN = "// 🛡 WOMEN_SHIELD_ADMIN_FN_V1";

let src = readFileSync(DB_PATH, "utf-8");

if (src.includes(MARK_FN)) {
  console.log("✓ Admin-Helpers schon drin.");
  process.exit(0);
}

const FN = `

${MARK_FN}
// 🛡 Admin-Review: Verifikations-Kandidaten + Override.

export function listVerificationCandidates({ status = null, limit = 100 } = {}) {
  const where = status ? "WHERE u.verification_status = ?" : "WHERE COALESCE(u.verification_status, 'none') != 'none'";
  const params = status ? [String(status), Number(limit)] : [Number(limit)];
  return db().prepare(\`
    SELECT u.id, u.username, u.display_name AS displayName, u.emoji,
           u.gender, u.verification_status AS status,
           u.verified_gender AS verifiedGender,
           u.verification_voice_score AS voiceScore,
           u.verification_at AS verifiedAt,
           u.created_at AS createdAt,
           (SELECT COUNT(*) FROM user_voice_samples WHERE user_id = u.id) AS sampleCount
      FROM users u
      \${where}
     ORDER BY u.verification_at DESC
     LIMIT ?
  \`).all(...params);
}

export function adminSetVerification(userId, { status, verifiedGender = false, reason = "" }) {
  const now = Date.now();
  db().prepare(\`
    UPDATE users SET verification_status = ?,
                     verified_gender = ?,
                     verification_at = ?
     WHERE id = ?
  \`).run(String(status), verifiedGender ? 1 : 0, now, Number(userId));
  // Sample loggen wenn recordVoiceSample existiert
  try {
    if (typeof recordVoiceSample === "function") {
      recordVoiceSample({
        userId, detectedGender: "",
        confidence: 1.0,
        sampleKind: "admin_override",
        reason: "Admin set status=" + status + (reason ? ": " + reason : ""),
      });
    }
  } catch {}
  return getVerificationStatus(userId);
}
`;

src += FN;
writeFileSync(DB_PATH, src);
console.log("✓ Women-Shield Admin-Helpers angefügt (listVerificationCandidates, adminSetVerification).");
