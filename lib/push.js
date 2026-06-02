// Server-seitiger Web-Push-Versand (RFC 8030).
// Verwendet VAPID. Keys müssen als ENV-Variablen gesetzt sein:
//   VAPID_PUBLIC_KEY  (urlsafe base64, beginnt typischerweise mit "B")
//   VAPID_PRIVATE_KEY (urlsafe base64)
//   VAPID_SUBJECT     (mailto:... oder URL, optional, default: mailto:noreply@vibevibo.de)

import webpush from "web-push";
import {
  listPushSubscriptionsForUser,
  deletePushSubscriptionById,
  touchPushSubscription,
  isChatMuted,
} from "@/lib/db";

let configured = false;

function ensureConfigured() {
  if (configured) return true;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subj = process.env.VAPID_SUBJECT || "mailto:noreply@vibevibo.de";
  if (!pub || !priv) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[push] VAPID-Keys fehlen – Web Push deaktiviert.");
    }
    return false;
  }
  try {
    webpush.setVapidDetails(subj, pub, priv);
    configured = true;
    return true;
  } catch (e) {
    console.error("[push] setVapidDetails fehlgeschlagen:", e?.message || e);
    return false;
  }
}

export function getPublicKey() {
  return process.env.VAPID_PUBLIC_KEY || "";
}

export function pushIsConfigured() {
  return ensureConfigured();
}

// Sendet eine Benachrichtigung an alle Geräte eines Users.
// payload: { title, body, url?, tag?, icon?, badge?, fromUsername?, fromDisplayName?, kind?,
//            fromUserId?, roomId? } – fromUserId/roomId werden für Mute-Check genutzt.
export async function sendPushToUser(userId, payload) {
  if (!ensureConfigured()) return { sent: 0, removed: 0 };
  // Stumm-Schaltung respektieren: weder Sound noch Lockscreen-Benachrichtigung,
  // wenn Empfänger den Absender / Raum / alles stumm geschaltet hat.
  if (isChatMuted(userId, { fromUserId: payload?.fromUserId || null, roomId: payload?.roomId || null })) {
    return { sent: 0, removed: 0, muted: true };
  }
  const subs = listPushSubscriptionsForUser(userId);
  if (!subs.length) return { sent: 0, removed: 0 };

  const body = JSON.stringify({
    title: String(payload?.title || "VibeVibo"),
    body: String(payload?.body || "").slice(0, 280),
    url: String(payload?.url || "/messenger"),
    tag: String(payload?.tag || "vv-msg"),
    icon: payload?.icon || "/icon-192.png",
    badge: payload?.badge || "/icon-192.png",
    image: payload?.image || "",            // optionales Hero-Bild (Android)
    silent: !!payload?.silent,
    fromUsername: payload?.fromUsername || "",
    fromDisplayName: payload?.fromDisplayName || "",
    kind: payload?.kind || "message",       // entscheidet im SW über Vibrate/Aktionen/RequireInteraction
    at: Date.now(),
  });

  let sent = 0;
  let removed = 0;

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body,
          { TTL: 60 * 60 * 24, urgency: "high" } // 24h TTL, hohe Priorität (Lockscreen)
        );
        touchPushSubscription(s.id);
        sent++;
      } catch (err) {
        const status = err?.statusCode;
        // 404/410 = Abo ungültig → aufräumen
        if (status === 404 || status === 410) {
          deletePushSubscriptionById(s.id);
          removed++;
        } else {
          console.warn("[push] Versand fehlgeschlagen", status, err?.body || err?.message);
        }
      }
    })
  );

  return { sent, removed };
}
