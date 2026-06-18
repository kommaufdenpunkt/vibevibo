import { moderateText, moderateAudio, detectVoiceGender, sanctionForText } from "./fidolin";
import { logMod, addSanction, sanctionTypes, flagVoiceMismatch } from "./db";

// Hat der Nutzer einen aktiven Kommunikationsbann?
export function isMuted(userId) {
  return sanctionTypes(userId).has("comm");
}

// 🛡 Helper: Erfordert die Konstellation Sender→Empfänger den verschärften
// "Mann-schreibt-Frau"-Prompt? Wenn beide bekannt + Sender männlich + Empfängerin weiblich → ja.
function shouldUseMaleToFemale(opts) {
  if (!opts) return false;
  return opts.senderGender === "m" && opts.recipientGender === "w";
}

// Prüft einen Text-Beitrag mit Fidolin.
// opts: { strict?, senderGender?, recipientGender? }
//   strict           → Severity-Schwellwert erniedrigen (Erst-Nachricht-Modus)
//   senderGender     → "m"|"w" — bestimmt Prompt-Variante
//   recipientGender  → "m"|"w" — bestimmt Prompt-Variante
// Sauber -> {ok:true}. Verstoß -> protokollieren, ggf. Auto-Bann, {ok:false, reason}.
export async function checkTextPost(userId, kind, text, opts = {}) {
  const useStrictPrompt = shouldUseMaleToFemale(opts);
  const r = await moderateText(text, useStrictPrompt ? { mode: "male_to_female" } : {});
  let blocked = !!r.block;

  // 🛡 Strict-Mode: auch leichte Verdachts-Faelle blocken (z.B. Erst-Nachricht)
  if (!blocked && (opts.strict || useStrictPrompt)) {
    const cat = (r.category || "").toLowerCase();
    const suspect = (r.severity >= 1) || /flirt|sexuell|anzugl|distanzlos|aufdring|anmache|anbagger|kompliment/.test(cat);
    if (suspect) {
      blocked = true;
      r.category = r.category || (useStrictPrompt ? "frauen_schutz" : "strict_first_msg");
      r.reason = r.reason || (useStrictPrompt
        ? "Aufdringlich gegenüber weiblicher Empfängerin (Frauen-Schutz aktiv)"
        : "Erst-Nachricht zu distanzlos/unangemessen (Strict-Modus)");
    }
  }

  if (!blocked) return { ok: true };

  const flagTag = useStrictPrompt ? " [M→F]" : (opts.strict ? " [STRICT]" : "");
  logMod({
    userId, kind,
    content: text,
    decision: "blocked",
    reason: `${r.category}: ${r.reason}${flagTag}`.slice(0, 200),
    by: r.by || "fidolin",
  });
  const s = sanctionForText(r);
  if (s) {
    addSanction(userId, s.type, Date.now() + s.durationMs, s.reason, "fidolin");
    logMod({ userId, kind: "ban", decision: s.type, reason: s.reason, by: "fidolin" });
  }
  return { ok: false, reason: r.reason || "Verstoß gegen die Community-Regeln.", category: r.category };
}

// 🎤 Prüft eine Sprachnachricht via Fidolin.
// opts: { senderGender?, recipientGender? }
// Zusätzlich: Passive Voice-Gender-Detection — wenn Sender behauptet weiblich/männlich
// zu sein und Fidolin eine klare Gegenstimme erkennt, wird das in user_voice_samples
// geloggt (Anti-Fake-Frau-Schutz).
export async function checkVoicePost(userId, kind, audioUrl, opts = {}) {
  const useStrictPrompt = shouldUseMaleToFemale(opts);
  const r = await moderateAudio(audioUrl, useStrictPrompt ? { mode: "male_to_female" } : {});

  // 🕵 Passive Voice-Gender-Detection — läuft parallel zur Moderation,
  // schreibt Ergebnis in user_voice_samples, blockt aber nichts direkt.
  // Nur wenn opts.senderGender bekannt ist und Audio nicht eh schon abgelehnt wird.
  if (opts.senderGender && (opts.senderGender === "m" || opts.senderGender === "w") && !r.undecided) {
    // Asynchron — Antwort wartet nicht darauf, aber wir starten den Check
    detectVoiceGender(audioUrl).then((det) => {
      try {
        if (det.gender !== "unsure" && det.gender !== opts.senderGender && det.confidence >= 0.7) {
          flagVoiceMismatch(userId, det.gender, det.confidence);
        }
      } catch {}
    }).catch(() => {});
  }

  if (r.undecided) return { ok: true, undecided: true, note: r.reason };
  if (!r.block) return { ok: true };

  logMod({
    userId, kind,
    content: "[voice]",
    decision: "blocked",
    reason: `${r.category}: ${r.reason}${useStrictPrompt ? " [M→F]" : ""}`.slice(0, 200),
    by: r.by || "fidolin",
  });
  const s = sanctionForText(r);
  if (s) {
    addSanction(userId, s.type, Date.now() + s.durationMs, s.reason, "fidolin");
    logMod({ userId, kind: "ban", decision: s.type, reason: s.reason, by: "fidolin" });
  }
  return { ok: false, reason: r.reason || "Beleidigung / Verstoß in der Sprachnachricht.", category: r.category };
}
