// 🛡 Privatsphäre-Logik — wer darf mit wem reden / posten / sehen.
//
// 4 Policies, alle mit sinnvollen Defaults:
//   dm_policy:    open|friends|verified|nobody  (wer darf 1:1-Nachrichten)
//   wall_policy:  open|friends|nobody           (wer darf Pinnwand)
//   hide_visits:  0|1                            (Profil-Besuche verstecken)
//   shield_mode:  0|1                            (Quick-Toggle "Maximaler Schutz")
//
// Die DB-Funktionen werden via patch-privacy.mjs auf den Server eingespielt.

import {
  getUserById,
  getUserPrivacyFields,
  getUserPrivacyFieldsV2,
  areFriendsForPrivacy,
  isInQuietHours,
  hasMessageHistory,
} from "./db";

const VERIFIED_MIN_AGE_MS = 7 * 24 * 3600 * 1000;
export function isVerified(user) {
  if (!user) return false;
  if (user.avatarStatus !== "approved" && user.avatar_status !== "approved") return false;
  const age = Date.now() - (user.createdAt || user.created_at || 0);
  return age >= VERIFIED_MIN_AGE_MS;
}

function effectiveDmPolicy(p) {
  if (p?.shield_mode) return "friends";
  return p?.dm_policy || "open";
}
function effectiveWallPolicy(p) {
  if (p?.shield_mode) return "friends";
  return p?.wall_policy || "open";
}

// Darf sender dem recipient (per User-ID) eine Nachricht schreiben?
// Liefert { ok, reason?, strictFirstMsg? } — strictFirstMsg=true falls Fidolin streng pruefen soll
export function canMessage(senderId, recipientId) {
  if (!recipientId) return { ok: false, reason: "Empfänger nicht gefunden" };
  if (senderId === recipientId) return { ok: true };

  // V2-Felder bevorzugt (mit Ruhezeit + strict-first-msg), Fallback V1
  const privacy = typeof getUserPrivacyFieldsV2 === "function"
    ? getUserPrivacyFieldsV2(recipientId)
    : (typeof getUserPrivacyFields === "function" ? getUserPrivacyFields(recipientId) : null);
  if (!privacy) return { ok: true }; // Fallback: kein Schutz aktiv (alte DB)

  // 🌙 RUHEZEIT-CHECK (V2) — vor Policy. Freunde duerfen trotzdem.
  if (typeof isInQuietHours === "function" && isInQuietHours(recipientId)) {
    const friends = areFriendsForPrivacy(senderId, recipientId);
    if (!friends) {
      const fromH = privacy.quiet_from_hour;
      const toH = privacy.quiet_to_hour;
      return {
        ok: false,
        reason: `Ruhezeit aktiv (${String(fromH).padStart(2,"0")}-${String(toH).padStart(2,"0")} Uhr). Versuch's später wieder.`,
      };
    }
  }

  const policy = effectiveDmPolicy(privacy);
  if (policy === "nobody") return { ok: false, reason: "Dieser Nutzer empfängt aktuell keine Nachrichten." };

  // STRICT-FIRST-MSG: bei Erst-Nachricht Flag setzen (Backend prueft Fidolin haerter)
  const strictFirstMsg = !!privacy.strict_first_msg
    && typeof hasMessageHistory === "function"
    && !hasMessageHistory(senderId, recipientId);

  if (policy === "open") return { ok: true, strictFirstMsg };
  if (policy === "friends") {
    if (areFriendsForPrivacy(senderId, recipientId)) return { ok: true };
    return { ok: false, reason: "Dieser Nutzer empfängt nur Nachrichten von Freunden." };
  }
  if (policy === "verified") {
    const sender = getUserById(senderId);
    if (isVerified(sender)) return { ok: true, strictFirstMsg };
    return { ok: false, reason: "Dieser Nutzer empfängt nur Nachrichten von verifizierten Accounts (Foto + 7 Tage)." };
  }
  return { ok: true, strictFirstMsg };
}

// Darf sender auf die Pinnwand von owner (per User-ID) schreiben?
export function canWriteWall(senderId, ownerId) {
  if (!ownerId) return { ok: false, reason: "Profil nicht gefunden" };
  if (senderId === ownerId) return { ok: true };
  const privacy = typeof getUserPrivacyFields === "function" ? getUserPrivacyFields(ownerId) : null;
  if (!privacy) return { ok: true };
  const policy = effectiveWallPolicy(privacy);
  if (policy === "nobody") return { ok: false, reason: "Pinnwand ist geschlossen." };
  if (policy === "open") return { ok: true };
  if (policy === "friends") {
    if (areFriendsForPrivacy(senderId, ownerId)) return { ok: true };
    return { ok: false, reason: "Nur Freunde dürfen auf diese Pinnwand schreiben." };
  }
  return { ok: true };
}

// Soll der Visit ueberhaupt geloggt werden?
export function shouldRecordVisit(ownerId) {
  if (!ownerId) return false;
  const privacy = typeof getUserPrivacyFields === "function" ? getUserPrivacyFields(ownerId) : null;
  if (!privacy) return true;
  if (privacy.shield_mode) return false;
  return !privacy.hide_visits;
}

// Format fuer /api/me/privacy GET — V2 mit Ruhezeit + Strict-First-Msg
export function privacyStatusForUser(user) {
  // user kann von getUserById kommen (userRow) — dann sind die Felder evtl. nicht gemapt.
  const sm = user?.shieldMode ?? user?.shield_mode;
  const dm = user?.dmPolicy ?? user?.dm_policy ?? "open";
  const wall = user?.wallPolicy ?? user?.wall_policy ?? "open";
  const hv = user?.hideVisits ?? user?.hide_visits ?? 0;
  const qFrom = user?.quietFromHour ?? user?.quiet_from_hour;
  const qTo = user?.quietToHour ?? user?.quiet_to_hour;
  const strict = user?.strictFirstMsg ?? user?.strict_first_msg ?? 0;
  const quietActive = qFrom != null && qTo != null && qFrom !== qTo;
  return {
    dmPolicy:   sm ? "friends" : (dm || "open"),
    wallPolicy: sm ? "friends" : (wall || "open"),
    hideVisits: !!(sm || hv),
    shieldMode: !!sm,
    rawDmPolicy: dm || "open",
    rawWallPolicy: wall || "open",
    rawHideVisits: !!hv,
    quietActive,
    quietFromHour: qFrom,
    quietToHour: qTo,
    strictFirstMsg: !!strict,
  };
}
