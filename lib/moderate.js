import { moderateText, sanctionForText } from "./fidolin";
import { logMod, addSanction, sanctionTypes } from "./db";

// Hat der Nutzer einen aktiven Kommunikationsbann?
export function isMuted(userId) {
  return sanctionTypes(userId).has("comm");
}

// Prüft einen Text-Beitrag mit Fidolin.
// Sauber -> {ok:true}. Verstoß -> protokollieren, ggf. Auto-Bann, {ok:false, reason}.
export async function checkTextPost(userId, kind, text) {
  const r = await moderateText(text);
  if (!r.block) return { ok: true };
  logMod({ userId, kind, content: text, decision: "blocked", reason: `${r.category}: ${r.reason}`.slice(0, 200), by: r.by });
  const s = sanctionForText(r);
  if (s) {
    addSanction(userId, s.type, Date.now() + s.durationMs, s.reason, "fidolin");
    logMod({ userId, kind: "ban", decision: s.type, reason: s.reason, by: "fidolin" });
  }
  return { ok: false, reason: r.reason || "Verstoß gegen die Community-Regeln.", category: r.category };
}
