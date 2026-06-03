// Werbe-Abstraktion mit Runtime-Settings.
//
// Konfiguration (Prioritaet absteigend):
//   1. DB-Setting (app_settings, via Admin-Panel /admin)
//   2. ENV-Variable (Coolify)
//   3. Default (Simulator)
//
// Admin kann jederzeit live umschalten ohne Deploy.
// Schluesselnamen (DB + ENV):
//   ADS_PROVIDER          simulator|adgate|pollfish|gam
//   ADSENSE_CLIENT        ca-pub-XXXXXXXXXXXXXXXX
//   ADS_SECRET_ADGATE     Adgate Webhook-Secret
//   ADS_SECRET_POLLFISH   Pollfish Webhook-Secret
//   ADS_SECRET_GAM        Google Ad Manager SSV-Secret

import crypto from "node:crypto";
import { getSetting } from "@/lib/db";

// Setting holen: DB > ENV > Default.
function cfg(key, def = "") {
  const fromDb = getSetting(key, "");
  if (fromDb) return fromDb;
  return process.env[key] || def;
}

export function getProvider() {
  return String(cfg("ADS_PROVIDER", "simulator")).toLowerCase();
}

export function getAdsenseClient() {
  return cfg("ADSENSE_CLIENT", "");
}

export function isAdsenseEnabled() {
  return getAdsenseClient().startsWith("ca-pub-");
}

// Provider-Konfiguration fuer den Client.
export function getProviderConfig() {
  const provider = getProvider();
  return {
    provider,
    adsenseClient: getAdsenseClient(),
    simulator: provider === "simulator",
    // Frontend kennt diese Min-Watch-Time und blockt frueheren Reward-Versuch.
    minWatchSeconds: provider === "simulator" ? 15 : 25,
  };
}

// Webhook-Signatur fuer S2S-Callbacks vom Provider verifizieren.
export function verifyProviderCallback(provider, body, headers) {
  const secret = cfg(`ADS_SECRET_${provider.toUpperCase()}`, "");
  if (!secret) return false; // keine Geheim-Konfiguration -> niemals trusten

  switch (provider) {
    case "adgate": {
      const expected = crypto.createHash("md5")
        .update(String(body.transaction_id || "") + secret)
        .digest("hex");
      return crypto.timingSafeEqual(
        Buffer.from(expected, "hex"),
        Buffer.from(String(body.signature || "").padEnd(expected.length, "0").slice(0, expected.length), "hex"),
      );
    }
    case "pollfish": {
      const sig = headers["x-pollfish-signature"] || headers["X-Pollfish-Signature"] || "";
      const expected = crypto.createHmac("sha1", secret)
        .update(JSON.stringify(body)).digest("hex");
      return sig && crypto.timingSafeEqual(
        Buffer.from(expected, "hex"),
        Buffer.from(String(sig).padEnd(expected.length, "0").slice(0, expected.length), "hex"),
      );
    }
    case "gam": {
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

export function isProductionMode() {
  return getProvider() !== "simulator";
}

// Bewusst KEINE konstanten Exports mehr — die wuerden zur Modul-Ladezeit
// gecached und nicht reagieren wenn Admin die Settings live umstellt.
// Stattdessen ueberall die Getter-Funktionen oben benutzen.
