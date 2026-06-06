// Multi-Provider Werbe-Abstraktion.
//
// 2 Kategorien:
//   1. DISPLAY-Provider (Banner-Werbung) — EINER zur Zeit aktiv
//      adsense | ezoic | adsterra | off
//   2. EARNING-Provider (Vibes-Verdienen) — MEHRERE parallel
//      simulator | cpx | bitlabs | ayet | pollfish | adgate | gam
//
// Konfiguration (Prioritaet absteigend):
//   1. DB-Setting (app_settings via Admin)
//   2. ENV-Variable (Coolify)
//   3. Default

import crypto from "node:crypto";
import { getSetting } from "@/lib/db";

// Setting holen: DB > ENV > Default.
function cfg(key, def = "") {
  const fromDb = getSetting(key, "");
  if (fromDb) return fromDb;
  return process.env[key] || def;
}

// ============================================================
// DISPLAY-PROVIDER (Banner-Werbung)
// ============================================================

export const DISPLAY_PROVIDERS = [
  { id: "off",      name: "Aus", description: "Keine Banner-Werbung anzeigen." },
  { id: "ezoic",    name: "Ezoic", description: "AI-Optimierung, leichteres Review fuer neue Seiten.", signupUrl: "https://www.ezoic.com" },
  { id: "adsterra", name: "Adsterra", description: "Instant-Approval, gemischte Qualitaet.", signupUrl: "https://adsterra.com" },
];

export function getDisplayProvider() {
  return String(cfg("DISPLAY_PROVIDER", "off")).toLowerCase();
}

export function getDisplayConfig() {
  const provider = getDisplayProvider();
  switch (provider) {
    case "ezoic":
      return { provider, scriptUrl: `https://www.ezojs.com/ezoic/sa.min.js`, siteId: cfg("EZOIC_SITE_ID", ""), enabled: !!cfg("EZOIC_SITE_ID", "") };
    case "adsterra":
      return { provider, zoneId: cfg("ADSTERRA_ZONE_ID", ""), enabled: !!cfg("ADSTERRA_ZONE_ID", "") };
    case "off":
    default:
      return { provider: "off", enabled: false };
  }
}

// ============================================================
// EARNING-PROVIDER (Vibes-Verdienen)
// ============================================================

export const EARNING_PROVIDERS = [
  {
    id: "simulator", name: "Simulator", emoji: "🧪",
    description: "Mock-Werbung zum Testen — kein echtes Geld.",
    type: "video", rewardPerComplete: 15,
  },
  {
    id: "cpx", name: "CPX Research", emoji: "📋",
    description: "Deutsche Umfragen, 50ct-2€ pro Survey, instant Approval.",
    type: "survey", rewardPerComplete: 25,
    signupUrl: "https://www.cpx-research.com/sign-up-as-publisher/",
  },
  {
    id: "bitlabs", name: "Bitlabs", emoji: "🧠",
    description: "Deutsche Umfragen, hohe RPMs, instant Approval.",
    type: "survey", rewardPerComplete: 25,
    signupUrl: "https://bitlabs.ai/publishers/",
  },
  {
    id: "ayet", name: "AyetStudios", emoji: "📲",
    description: "Offer-Wall: User installiert App / nutzt Service → Vibes.",
    type: "offerwall", rewardPerComplete: 50,
    signupUrl: "https://www.ayetstudios.com/publishers/",
  },
  {
    id: "pollfish", name: "Pollfish", emoji: "📊",
    description: "International, Surveys, gute Coverage.",
    type: "survey", rewardPerComplete: 20,
    signupUrl: "https://www.pollfish.com/",
  },
  {
    id: "adgate", name: "Adgate Media", emoji: "🎮",
    description: "Offer-Wall + Surveys, US-fokussiert.",
    type: "offerwall", rewardPerComplete: 40,
    signupUrl: "https://www.adgatemedia.com/",
  },
];

// Welche Earning-Provider sind aktiv? (Komma-getrennt im Setting EARNING_PROVIDERS_ACTIVE)
export function getActiveEarningProviders() {
  const raw = cfg("EARNING_PROVIDERS_ACTIVE", "simulator");
  return String(raw).toLowerCase().split(",").map((s) => s.trim()).filter(Boolean);
}

export function isEarningProviderActive(id) {
  return getActiveEarningProviders().includes(String(id).toLowerCase());
}

// Sichtbare Liste fuer's Frontend — nur aktive Provider, mit Reward + Type.
export function listActiveEarningProvidersForClient() {
  const active = getActiveEarningProviders();
  return EARNING_PROVIDERS
    .filter((p) => active.includes(p.id))
    .map((p) => ({
      id: p.id, name: p.name, emoji: p.emoji,
      description: p.description, type: p.type,
      rewardAmount: Number(cfg(`EARN_REWARD_${p.id.toUpperCase()}`, p.rewardPerComplete)),
    }));
}

// ============================================================
// CALLBACK-VERIFIKATION
// ============================================================

// S2S-Callback-Signaturen pruefen. Jeder Provider hat sein eigenes Schema.
export function verifyProviderCallback(provider, body, headers) {
  const p = String(provider || "").toLowerCase();
  const secret = cfg(`ADS_SECRET_${p.toUpperCase()}`, "");
  if (!secret) return false;

  switch (p) {
    case "cpx": {
      // CPX Research: hash = MD5(transaction_id + user_id + secret_key)
      const expected = crypto.createHash("md5")
        .update(`${body.trans_id || ""}-${body.user_id || ""}-${secret}`)
        .digest("hex");
      return timingSafeHexEq(expected, String(body.hash || ""));
    }
    case "bitlabs": {
      // Bitlabs: SHA256 HMAC of query string mit secret als Key
      const sig = String(body.signature || headers["x-bitlabs-signature"] || "");
      const expected = crypto.createHmac("sha256", secret)
        .update(JSON.stringify(body)).digest("hex");
      return timingSafeHexEq(expected, sig);
    }
    case "ayet": {
      // AyetStudios: SHA1 HMAC ueber das ganze body als JSON
      const sig = String(headers["x-ayet-signature"] || body.signature || "");
      const expected = crypto.createHmac("sha1", secret)
        .update(JSON.stringify(body)).digest("hex");
      return timingSafeHexEq(expected, sig);
    }
    case "pollfish": {
      const sig = String(headers["x-pollfish-signature"] || "");
      const expected = crypto.createHmac("sha1", secret)
        .update(JSON.stringify(body)).digest("hex");
      return timingSafeHexEq(expected, sig);
    }
    case "adgate": {
      const expected = crypto.createHash("md5")
        .update(String(body.transaction_id || "") + secret).digest("hex");
      return timingSafeHexEq(expected, String(body.signature || ""));
    }
    case "gam": {
      const sig = String(body.signature || "");
      const expected = crypto.createHmac("sha256", secret)
        .update(`${body.user_id}|${body.token}|${body.reward_amount}`).digest("hex");
      return timingSafeHexEq(expected, sig);
    }
    default:
      return false;
  }
}

function timingSafeHexEq(a, b) {
  if (!a || !b) return false;
  const A = Buffer.from(a, "hex");
  const B = Buffer.from(String(b).padEnd(a.length, "0").slice(0, a.length), "hex");
  if (A.length !== B.length) return false;
  return crypto.timingSafeEqual(A, B);
}

// ============================================================
// LEGACY-API (haelt die alten /api/ads/* Endpoints am Leben)
// ============================================================

// Alter Code erwartet "provider" und "config" via getProviderConfig().
// Wir mappen das auf "primary earning provider" — den ersten aktiven.
export function getProvider() {
  const active = getActiveEarningProviders();
  return active[0] || "simulator";
}

// 💰 Popunder: konfigurierbares Script-URL (z.B. Adsterra Popunder).
// Wird global ueber PopunderScript-Component geladen, fired on click.
export function getPopunderConfig() {
  const url = String(cfg("POPUNDER_SCRIPT_URL", "")).trim();
  const enabled = !!url && /^https:\/\//i.test(url);
  return { enabled, scriptUrl: enabled ? url : "" };
}

export function getProviderConfig() {
  const provider = getProvider();
  return {
    provider,
    simulator: provider === "simulator",
    minWatchSeconds: provider === "simulator" ? 15 : 25,
    earningProviders: listActiveEarningProvidersForClient(),
    display: getDisplayConfig(),
    popunder: getPopunderConfig(),
  };
}

export function isProductionMode() {
  return getProvider() !== "simulator";
}
