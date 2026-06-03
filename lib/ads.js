// Werbe-Abstraktion: ein Provider, vereinheitlichte Schnittstelle.
// Aktueller Modus ueber ENV-Variable ADS_PROVIDER:
//   "simulator"  (Default) — keine echte Werbung, fuer Dev + Stagings.
//                Reward wird nach Mindest-Wartezeit gegeben, aber NUR
//                wenn der serverseitige Token gueltig + nicht abgelaufen ist.
//   "adgate"     — Adgate Media Offerwall (S2S-Callback mit signiertem Token).
//   "pollfish"   — Pollfish Surveys (S2S-Callback).
//   "gam"        — Google Ad Manager Rewarded (eigener Callback-Flow).
//
// Display-Ads laufen separat ueber AdSense (ADSENSE_CLIENT in env).
// Rewarded-Ads brauchen nicht zwingend einen separaten Account — Simulator
// reicht zum Bauen + Testen.

import crypto from "node:crypto";

export const PROVIDER = (process.env.ADS_PROVIDER || "simulator").toLowerCase();
export const ADSENSE_CLIENT = process.env.ADSENSE_CLIENT || ""; // ca-pub-XXXX...
export const ADSENSE_ENABLED = !!ADSENSE_CLIENT;

// Provider-Konfiguration fuer den Client.
// Der Client weiss damit, wie er den Ad-Trigger oeffnen soll.
export function getProviderConfig() {
  return {
    provider: PROVIDER,
    adsenseClient: ADSENSE_CLIENT,
    simulator: PROVIDER === "simulator",
    // Frontend kennt diese Min-Watch-Time und blockt frueheren Reward-Versuch.
    minWatchSeconds: PROVIDER === "simulator" ? 15 : 25,
  };
}

// Webhook-Signatur fuer S2S-Callbacks vom Provider verifizieren.
// Jeder Provider hat sein eigenes Signatur-Schema — wir kapseln das hier.
export function verifyProviderCallback(provider, body, headers) {
  const secret = process.env[`ADS_SECRET_${provider.toUpperCase()}`] || "";
  if (!secret) return false; // keine Geheim-Konfiguration -> niemals trusten

  switch (provider) {
    case "adgate": {
      // Adgate: ?signature=md5(transaction_id + secret) — wir verifizieren strikt.
      const expected = crypto.createHash("md5")
        .update(String(body.transaction_id || "") + secret)
        .digest("hex");
      return crypto.timingSafeEqual(
        Buffer.from(expected, "hex"),
        Buffer.from(String(body.signature || "").padEnd(expected.length, "0").slice(0, expected.length), "hex"),
      );
    }
    case "pollfish": {
      // Pollfish: HMAC-SHA1 ueber den ganzen Payload mit Signature im Header.
      const sig = headers["x-pollfish-signature"] || headers["X-Pollfish-Signature"] || "";
      const expected = crypto.createHmac("sha1", secret)
        .update(JSON.stringify(body)).digest("hex");
      return sig && crypto.timingSafeEqual(
        Buffer.from(expected, "hex"),
        Buffer.from(String(sig).padEnd(expected.length, "0").slice(0, expected.length), "hex"),
      );
    }
    case "gam": {
      // Google Ad Manager Rewarded: SSV-Token im body.signature (RSA / ECDSA).
      // Fuer den Production-Setup: googleads SSV-Verifikation einbauen.
      // Hier: provisorisches HMAC, bis echter Provider angeschlossen ist.
      const sig = String(body.signature || "");
      const expected = crypto.createHmac("sha256", secret)
        .update(`${body.user_id}|${body.token}|${body.reward_amount}`).digest("hex");
      return sig && crypto.timingSafeEqual(
        Buffer.from(expected, "hex"),
        Buffer.from(sig.padEnd(expected.length, "0").slice(0, expected.length), "hex"),
      );
    }
    default:
      return false;
  }
}

// Im Simulator-Modus: Server signiert das Token + Watch-Time mit eigenem Secret.
// Der Client meldet "Video durchgesehen" + ein HMAC, das ihm der Server vorher gab.
// So kann der Client den Reward NICHT einfach selber triggern.
//
// Flow im Simulator:
//   1. POST /api/ads/start -> Server gibt token, simSecret, minWatchSeconds
//   2. Client zaehlt minWatchSeconds runter, holt am Ende HMAC vom Server:
//      POST /api/ads/simcomplete { token } -> Server prueft Start-Zeit + Token,
//      grantet Reward via completeAdImpression(token, { providerVerified: true })
//
// Der Trick: Der Client darf den Reward NIE selber bestimmen — nur Anwesenheit
// melden. Server verifiziert serverseitig die Zeit (Date.now() - started_at).

export function isProductionMode() {
  return PROVIDER !== "simulator";
}
