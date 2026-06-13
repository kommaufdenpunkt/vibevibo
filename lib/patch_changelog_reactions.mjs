// 💬 Tabelle + Helfer fuer Changelog-Emoji-Reaktionen. Idempotent.
import fs from 'fs';
const PATH = process.env.HOME + '/vibevibo/lib/db.js';

const c = fs.readFileSync(PATH, 'utf-8');
let out = c;
let changed = 0;

// 1) Schema: Tabelle nach pwa_installs
const SCHEMA_MARKER = "CREATE TABLE IF NOT EXISTS pwa_installs";
const SCHEMA_NEW = `CREATE TABLE IF NOT EXISTS changelog_reactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_key TEXT NOT NULL,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      emoji TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      UNIQUE (entry_key, user_id, emoji)
    );
    CREATE INDEX IF NOT EXISTS idx_changelog_reactions_key ON changelog_reactions(entry_key);
    CREATE INDEX IF NOT EXISTS idx_changelog_reactions_user ON changelog_reactions(user_id);

    ${SCHEMA_MARKER}`;

if (!out.includes("CREATE TABLE IF NOT EXISTS changelog_reactions")) {
  if (!out.includes(SCHEMA_MARKER)) {
    console.error("Marker pwa_installs nicht gefunden — patch_pwa.mjs zuerst!");
    process.exit(1);
  }
  out = out.replace(SCHEMA_MARKER, SCHEMA_NEW);
  changed++;
}

// 2) Helpers ans Ende anhaengen
const HELPERS = `

// =================================================================
// Changelog-Emoji-Reaktionen
// =================================================================
export function toggleChangelogReaction(userId, entryKey, emoji) {
  if (!userId || !entryKey || !emoji) return null;
  const k = String(entryKey).slice(0, 80);
  const em = String(emoji).slice(0, 16);
  const d = db();
  const ex = d.prepare(\`SELECT id FROM changelog_reactions WHERE entry_key=? AND user_id=? AND emoji=?\`).get(k, userId, em);
  if (ex) {
    d.prepare(\`DELETE FROM changelog_reactions WHERE id=?\`).run(ex.id);
    return { active: false };
  }
  d.prepare(\`INSERT INTO changelog_reactions (entry_key, user_id, emoji, created_at) VALUES (?,?,?,?)\`)
    .run(k, userId, em, Date.now());
  return { active: true };
}

export function listChangelogReactions(entryKeys, viewerId = 0) {
  if (!Array.isArray(entryKeys) || entryKeys.length === 0) return {};
  const keys = entryKeys.map((k) => String(k).slice(0, 80)).filter(Boolean);
  if (keys.length === 0) return {};
  const placeholders = keys.map(() => "?").join(",");
  const rows = db().prepare(\`
    SELECT entry_key, emoji, COUNT(*) AS n,
           MAX(CASE WHEN user_id = ? THEN 1 ELSE 0 END) AS mine
      FROM changelog_reactions
     WHERE entry_key IN (\${placeholders})
     GROUP BY entry_key, emoji
  \`).all(viewerId || 0, ...keys);
  const out = {};
  for (const r of rows) {
    if (!out[r.entry_key]) out[r.entry_key] = {};
    out[r.entry_key][r.emoji] = { count: r.n, mine: !!r.mine };
  }
  return out;
}
`;

if (!out.includes("export function toggleChangelogReaction")) {
  out = out + HELPERS;
  changed++;
}

if (changed === 0) {
  console.log("Changelog-Reactions-Patch schon angewendet, skip.");
  process.exit(0);
}
fs.writeFileSync(PATH, out);
console.log(`Changelog-Reactions-Patch angewendet (${changed} Stellen).`);
