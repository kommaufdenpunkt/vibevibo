#!/usr/bin/env node
// 🎀 Fidolin-Erinnerungs-Posts — sie/ihr postet nostalgische "Heute vor X Jahren"-Beiträge.
//
// Daten:
//   • fidolin_memories — Katalog von Erinnerungs-Posts mit Datum-Trigger
//   • Fidolin-User-Account (auto-created) als Autor
//
// Helpers:
//   • ensureFidolinUser()          — gibt User-ID zurück, legt sie an wenn nicht da
//   • listMemoriesDueToday()       — Posts die heute getriggert werden
//   • postFidolinMemory(memoryId)  — postet als Status-Update, markiert last_posted_at
//   • listAllMemories()            — alle Einträge (Admin)
//   • upsertMemory(...)            — Admin-CRUD
//   • toggleMemoryActive(id, on)   — aktivieren/deaktivieren
//
// Content-Format: "{years}" wird durch berechnete Jahre ersetzt.
//   Beispiel: "Heute vor {years} Jahren ist die Mauer gefallen 🧱"
//             → "Heute vor 37 Jahren ist die Mauer gefallen 🧱"
//
// Trigger:
//   • trigger_month + trigger_day = 11/9 → exakt am 9. November
//   • trigger_month = 7, day = 0       → irgendwann im Juli (saisonal)
//   • beide 0                          → Fallback (Daily-Random)

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const DB_PATH = join(ROOT, "lib", "db.js");

const MARK_TABLE = "/* 🎀 FIDOLIN_MEMORIES_TABLE_V1 */";
const MARK_FN    = "// 🎀 FIDOLIN_MEMORIES_FN_V1";

let src = readFileSync(DB_PATH, "utf-8");
let changed = false;

if (!src.includes(MARK_TABLE)) {
  const ANCHOR = "CREATE TABLE IF NOT EXISTS top_friends (";
  if (!src.includes(ANCHOR)) { console.error("✗ Anker top_friends fehlt"); process.exit(1); }
  const INJECT = `${MARK_TABLE}
    CREATE TABLE IF NOT EXISTS fidolin_memories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trigger_month INTEGER DEFAULT 0,
      trigger_day INTEGER DEFAULT 0,
      anniversary_year INTEGER DEFAULT 0,
      category TEXT DEFAULT 'general',
      emoji TEXT DEFAULT '📅',
      content TEXT NOT NULL,
      active INTEGER DEFAULT 1,
      last_posted_at INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_fm_trigger ON fidolin_memories(trigger_month, trigger_day, active);

    ${ANCHOR}`;
  src = src.replace(ANCHOR, INJECT);
  changed = true;
  console.log("✓ fidolin_memories Tabelle ergänzt.");
}

if (!src.includes(MARK_FN)) {
  const FN = `

${MARK_FN}
// 🎀 Fidolin-Erinnerungs-Post Helpers

const FIDOLIN_USERNAME = "fidolin";
const FIDOLIN_DISPLAY  = "Fidolin 🎀";

// Stellt sicher dass es einen "fidolin"-User gibt. Return: userId.
export function ensureFidolinUser() {
  try {
    const existing = db().prepare("SELECT id FROM users WHERE username = ?").get(FIDOLIN_USERNAME);
    if (existing) return existing.id;
    const now = Date.now();
    const info = db().prepare(\`
      INSERT INTO users (
        username, display_name, password_hash, status, role,
        about_me, emoji, gender, created_at, last_seen
      ) VALUES (?, ?, '', 'approved', 'bot', ?, '🎀', 'w', ?, ?)
    \`).run(
      FIDOLIN_USERNAME,
      FIDOLIN_DISPLAY,
      "Hey ihr Lieben! Ich bin Fidolin, die kleine Erinnerungs-Fee von VibeVibo 🎀 Ich erzähl euch ab und zu von schönen Momenten aus früher.",
      now, now
    );
    return Number(info.lastInsertRowid);
  } catch (e) {
    console.error("[fidolin] ensureFidolinUser fehlgeschlagen:", e?.message);
    return null;
  }
}

// Memorien die heute aktiv werden + heute noch nicht gepostet wurden.
// Reihenfolge: Exakt-Datum-Treffer zuerst, dann Monats-Treffer.
export function listMemoriesDueToday() {
  try {
    const now = new Date();
    const m = now.getMonth() + 1;
    const d = now.getDate();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return db().prepare(\`
      SELECT id, trigger_month AS month, trigger_day AS day,
             anniversary_year AS anniYear, category, emoji, content,
             last_posted_at AS lastPostedAt
        FROM fidolin_memories
       WHERE active = 1
         AND last_posted_at < ?
         AND (
           (trigger_month = ? AND trigger_day = ?) OR
           (trigger_month = ? AND trigger_day = 0)
         )
       ORDER BY (trigger_day > 0) DESC, last_posted_at ASC
       LIMIT 5
    \`).all(todayStart, m, d, m) || [];
  } catch { return []; }
}

// Rendert Content: ersetzt {years} durch aktuelles - anniversary_year
function renderMemoryContent(memory) {
  let txt = String(memory.content || "");
  if (memory.anniYear && memory.anniYear > 1800) {
    const years = new Date().getFullYear() - Number(memory.anniYear);
    txt = txt.replace(/\\{years\\}/g, String(years));
  }
  return txt;
}

// Postet eine Memorie als Status-Update von Fidolin.
// Return: { ok, postId?, error? }
export function postFidolinMemory(memoryId) {
  const fidolinId = ensureFidolinUser();
  if (!fidolinId) return { ok: false, error: "Fidolin-User fehlt" };
  try {
    const memory = db().prepare("SELECT id, anniversary_year AS anniYear, content FROM fidolin_memories WHERE id = ? AND active = 1").get(Number(memoryId));
    if (!memory) return { ok: false, error: "Memory nicht gefunden" };
    const text = renderMemoryContent(memory);
    if (!text) return { ok: false, error: "Leerer Content" };
    const result = addStatusUpdate(fidolinId, text, "");
    db().prepare("UPDATE fidolin_memories SET last_posted_at = ? WHERE id = ?").run(Date.now(), memoryId);
    return { ok: true, postId: result?.id, text };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// Admin-Helpers
export function listAllFidolinMemories() {
  try {
    return db().prepare(\`
      SELECT id, trigger_month AS month, trigger_day AS day,
             anniversary_year AS anniYear, category, emoji, content,
             active, last_posted_at AS lastPostedAt, created_at AS createdAt
        FROM fidolin_memories
       ORDER BY trigger_month, trigger_day, id
    \`).all() || [];
  } catch { return []; }
}

export function upsertFidolinMemory({ id = null, month = 0, day = 0, anniYear = 0, category = "general", emoji = "📅", content = "", active = 1 }) {
  const m = Math.max(0, Math.min(12, Number(month) || 0));
  const d = Math.max(0, Math.min(31, Number(day) || 0));
  const a = Math.max(0, Number(anniYear) || 0);
  const txt = String(content || "").slice(0, 500);
  if (!txt) throw new Error("Content fehlt");
  try {
    if (id) {
      db().prepare(\`
        UPDATE fidolin_memories
           SET trigger_month = ?, trigger_day = ?, anniversary_year = ?,
               category = ?, emoji = ?, content = ?, active = ?
         WHERE id = ?
      \`).run(m, d, a, String(category).slice(0,20), String(emoji).slice(0,8), txt, active ? 1 : 0, Number(id));
      return id;
    }
    const info = db().prepare(\`
      INSERT INTO fidolin_memories (trigger_month, trigger_day, anniversary_year, category, emoji, content, active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    \`).run(m, d, a, String(category).slice(0,20), String(emoji).slice(0,8), txt, active ? 1 : 0, Date.now());
    return Number(info.lastInsertRowid);
  } catch (e) { throw e; }
}

export function toggleFidolinMemoryActive(id, on) {
  try {
    db().prepare("UPDATE fidolin_memories SET active = ? WHERE id = ?").run(on ? 1 : 0, Number(id));
    return true;
  } catch { return false; }
}

export function deleteFidolinMemory(id) {
  try {
    db().prepare("DELETE FROM fidolin_memories WHERE id = ?").run(Number(id));
    return true;
  } catch { return false; }
}

// Seed initial catalog (nur wenn leer). Wird vom Cron lazy aufgerufen.
export function seedFidolinMemoriesIfEmpty() {
  try {
    const c = db().prepare("SELECT COUNT(*) AS n FROM fidolin_memories").get().n || 0;
    if (c > 0) return 0;
    const now = Date.now();
    const seeds = [
      // Geschichte
      [11, 9, 1989, "history", "🧱", "Heute vor {years} Jahren ist die Mauer gefallen 🧱✨ Wer war damals dabei? Wo wart ihr in der Nacht?"],
      // Sport — Sommermärchen WM 2006 (deutsche WM-Eröffnung 9.6.2006, Finale 9.7.2006)
      [6, 9, 2006, "sport", "⚽", "Heute vor {years} Jahren begann das Sommermärchen 2006 🌞⚽ Schwarz-Rot-Gold an jedem Auto. Was war euer schönster Moment?"],
      [7, 9, 2006, "sport", "🏆", "Heute vor {years} Jahren — WM-Finale 2006: Italien holt den Pokal. Aber wir hatten den schönsten Sommer 🇩🇪💛"],
      [7, 13, 2014, "sport", "🏆", "Heute vor {years} Jahren — Götze schießt uns zum WM-Titel in Rio 🇩🇪⚽ Wo habt ihr's geschaut?"],
      // Tech
      [0, 0, 1996, "tech", "📞", "ICQ-Sound: Uh-oh! 🎵 Wer kann's noch nachmachen? Damals 1996 angefangen — wer war Nummer unter 100.000?"],
      [0, 0, 1999, "tech", "💾", "Erinnert ihr euch an die Disketten? 1,44 MB Speicherplatz 💾 Heute passt nicht mal ein Foto drauf."],
      [0, 0, 2001, "tech", "🎶", "Der iPod kam 2001 raus — „1000 Songs in deiner Tasche". Rad-Klick-Sound im Ohr 🤍"],
      [0, 0, 2007, "tech", "📱", "2007: das erste iPhone wurde vorgestellt 📱 Wer hatte's gleich zur Markteinführung?"],
      // TV
      [0, 0, 1985, "tv", "📺", "Erinnert ihr euch an die Lindenstraße? Sonntag, 18:40, alle vorm Fernseher. Bis 2020 lief sie — wer hat geheult?"],
      [0, 0, 1970, "tv", "🚔", "Tatort sonntags um 20:15 🚔 Welcher Kommissar war euer Favorit? Schimanski, Batic & Leitmayr, Lürsen?"],
      [0, 0, 1992, "tv", "🌅", "GZSZ läuft seit 1992 — wer von euch hat noch jede Folge zur Schulzeit geschaut?"],
      [0, 0, 1995, "tv", "🌍", "TV total mit Stefan Raab — Bundesvision Song Contest, Wok-WM, Turmspringen 🦆 Wer fehlt euch heute?"],
      // Musik
      [0, 0, 1999, "music", "🎵", "1999: Britney Spears mit „Hit me baby one more time" 🎵 Welches Lied dudelt heute noch in eurem Kopf?"],
      [0, 0, 1985, "music", "🎤", "Nena — 99 Luftballons. Wer kann den Text noch komplett auswendig? 🎈"],
      [0, 0, 1997, "music", "🌹", "Elton John — Candle In The Wind 1997 für Princess Diana 🌹 Wer hat damals geweint?"],
      // Süßigkeiten
      [0, 0, 0, "candy", "🍫", "Negro-Kuss heißt heute Schaumkuss. Wer kennt's noch unter dem alten Namen? 🍫 Lila/grün/rot war die Verpackung — was war eure Lieblingsfarbe?"],
      [0, 0, 0, "candy", "🍬", "Brausepulver für 10 Pfennig in der Schule 🍬 Welche Sorte war eure? Cola, Brause, Waldmeister?"],
      [0, 0, 0, "candy", "🍭", "Tütchen-Eis von der Eisdiele — Joghurette, Capri-Sonne quetschen, Choco-Crossies vorm Fernseher 🥤"],
      // Mode
      [0, 0, 0, "fashion", "👟", "Buffalo-Schuhe — Schande oder Stil-Ikone? 👟 Die hatte JEDER. Plateau hoch wie ein Haus."],
      [0, 0, 0, "fashion", "🤘", "Erinnert ihr euch noch an Schlaghosen? Oder Cargo-Pants mit 47 Taschen? 🤘 Was wart ihr für ein Stil-Typ?"],
      [0, 0, 0, "fashion", "💁", "Die Schmetterlings-Spange im Haar 💁 Wer hatte 20 davon im Bad rumliegen?"],
      // Allgemein/Saisonal
      [12, 24, 0, "general", "🎄", "Heiligabend 🎄 Wer kennt die Familien-Tradition: Bescherung VOR oder NACH dem Essen? Team A oder Team B?"],
      [10, 31, 0, "general", "🎃", "Halloween 🎃 — früher war's nur Süßes-oder-Saures. Heute ist's eine ganze Saison. Was sind eure Erinnerungen?"],
      [4, 1, 0, "general", "🐰", "Eier suchen am Ostermorgen 🥚🐰 Wer war besonders gemein versteckt? Im Kühlschrank? Im Schuh?"],
      [1, 1, 0, "general", "🎊", "Frohes Neues! 🎉 Welche Glücksbringer hattet ihr früher? Schornsteinfeger, Marienkäfer, Schwein?"],
      // Spielzeug
      [0, 0, 1996, "general", "🎮", "Tamagotchi 1996! 🥚 Wer hat seins gepflegt wie ein echtes Haustier? Und wer ist mit Trauer aufgewacht?"],
      [0, 0, 1989, "general", "🎮", "Game Boy seit 1989 📱 Tetris-Sound im Ohr — wer kennt noch alle 4 Töne der Melodie?"],
      [0, 0, 1996, "general", "🎮", "Pokémon 1996 — wer hatte Rot oder Blau? Glumanda, Schiggy oder Bisasam zuerst? 🐢🔥🌱"],
    ];
    const insert = db().prepare(\`
      INSERT INTO fidolin_memories (trigger_month, trigger_day, anniversary_year, category, emoji, content, active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?)
    \`);
    let added = 0;
    for (const s of seeds) {
      insert.run(s[0], s[1], s[2], s[3], s[4], s[5], now);
      added++;
    }
    return added;
  } catch (e) {
    console.error("[fidolin-seed]", e?.message);
    return 0;
  }
}
`;
  src += FN;
  changed = true;
  console.log("✓ Fidolin-Memories Helpers angefügt.");
}

if (changed) {
  writeFileSync(DB_PATH, src);
  console.log("\\n✓ db.js gepatched (Fidolin-Memories).");
} else {
  console.log("\\n✓ Nichts zu tun.");
}
