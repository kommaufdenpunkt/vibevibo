import { moderateText, moderateAudio, sanctionForText } from "./fidolin";
import { logMod, addSanction, sanctionTypes } from "./db";

// Hat der Nutzer einen aktiven Kommunikationsbann?
export function isMuted(userId) {
  return sanctionTypes(userId).has("comm");
}

// Prüft einen Text-Beitrag mit Fidolin.
// opts: { strict?: boolean }  → strict erniedrigt Severity-Schwellwert fuer Block
// Sauber -> {ok:true}. Verstoß -> protokollieren, ggf. Auto-Bann, {ok:false, reason}.
export async function checkTextPost(userId, kind, text, opts = {}) {
  const r = await moderateText(text);
  let blocked = !!r.block;

  // 🛡 Strict-Mode: auch leichte Verdachts-Faelle blocken
  if (!blocked && opts.strict) {
    // Heuristik: Fidolin sagt zwar nicht "block", aber severity >= 1 oder Kategorie haengt mit Flirt/Sexuell zusammen
    const cat = (r.category || "").toLowerCase();
    const suspect = (r.severity >= 1) || /flirt|sexuell|anzugl|distanzlos|aufdring/.test(cat);
    if (suspect) {
      blocked = true;
      r.category = r.category || "strict_first_msg";
      r.reason = r.reason || "Erst-Nachricht zu distanzlos/unangemessen (Strict-Modus)";
    }
  }

  if (!blocked) return { ok: true };

  logMod({
    userId, kind,
    content: text,
    decision: "blocked",
    reason: `${r.category}: ${r.reason}${opts.strict ? " [STRICT]" : ""}`.slice(0, 200),
    by: r.by || "fidolin",
  });
  const s = sanctionForText(r);
  if (s) {
    addSanction(userId, s.type, Date.now() + s.durationMs, s.reason, "fidolin");
    logMod({ userId, kind: "ban", decision: s.type, reason: s.reason, by: "fidolin" });
  }
  return { ok: false, reason: r.reason || "Verstoß gegen die Community-Regeln.", category: r.category };
}

// 🎤 Prüft eine Sprachnachricht via Fidolin (Gemini transkribiert + bewertet).
// Sauber → {ok:true}. Verstoß → loggen + ggf. Auto-Bann + {ok:false, reason}.
// Bei "undecided" (KI nicht erreichbar / Antwort unklar) → ok:true mit note (Caller entscheidet).
export async function checkVoicePost(userId, kind, audioUrl) {
  const r = await moderateAudio(audioUrl);
  if (r.undecided) return { ok: true, undecided: true, note: r.reason };
  if (!r.block) return { ok: true };

  logMod({
    userId, kind,
    content: "[voice]",
    decision: "blocked",
    reason: `${r.category}: ${r.reason}`.slice(0, 200),
    by: r.by || "fidolin",
  });
  const s = sanctionForText(r);
  if (s) {
    addSanction(userId, s.type, Date.now() + s.durationMs, s.reason, "fidolin");
    logMod({ userId, kind: "ban", decision: s.type, reason: s.reason, by: "fidolin" });
  }
  return { ok: false, reason: r.reason || "Beleidigung / Verstoß in der Sprachnachricht.", category: r.category };
}
