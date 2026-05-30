// IP-Reputation: erkennt VPN / Proxy / Tor / Datacenter-Hoster.
// Free-Tier von proxycheck.io (1000 Abfragen/Tag ohne Key) — Antworten 24h gecached.
// Bei höherem Bedarf: PROXYCHECK_KEY in ENV setzen, dann 1000/Tag werden 10.000/Monat.
// Lokale Adressen werden ohne Netzanfrage als sauber behandelt.

import { getCachedIpIntel, storeIpIntel } from "@/lib/db";

function isPrivateIp(ip) {
  if (!ip) return true;
  if (ip === "::1" || ip === "127.0.0.1") return true;
  if (ip.startsWith("10.") || ip.startsWith("192.168.")) return true;
  if (ip.startsWith("172.")) {
    const second = Number(ip.split(".")[1]);
    if (second >= 16 && second <= 31) return true;
  }
  if (ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80")) return true; // ULA / link-local
  return false;
}

const CLEAN = {
  isProxy: false, isVpn: false, isTor: false, isHosting: false,
  riskScore: 0, country: "", asn: "",
};

// Liefert {isProxy, isVpn, isTor, isHosting, riskScore, country, asn}
export async function checkIpReputation(ip) {
  if (!ip || isPrivateIp(ip)) return { ...CLEAN, ip: ip || "", source: "local" };
  const cached = getCachedIpIntel(ip);
  if (cached) return { ...cached, source: "cache" };

  // Wenn IP-Intel explizit deaktiviert ist, sauber zurückgeben (Datenschutz-Modus)
  if (process.env.VV_IP_INTEL === "off") return { ...CLEAN, ip, source: "off" };

  try {
    const key = process.env.PROXYCHECK_KEY || "";
    const url = `https://proxycheck.io/v2/${encodeURIComponent(ip)}?vpn=3&asn=1&risk=1${key ? `&key=${encodeURIComponent(key)}` : ""}`;
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(3500),
      headers: { "User-Agent": "VibeVibo-IPCheck/1.0" },
    });
    if (!res.ok) throw new Error(`proxycheck ${res.status}`);
    const data = await res.json();
    const entry = data?.[ip] || {};
    // proxycheck.io semantics:
    //   proxy=yes → es ist irgendein Proxy
    //   type=VPN/TOR/SOCKS/PUB/etc.
    //   risk = 0..100  (Score)
    const type = String(entry.type || "").toUpperCase();
    const intel = {
      isProxy: entry.proxy === "yes",
      isVpn: type === "VPN",
      isTor: type === "TOR",
      isHosting: type === "HOSTING" || type === "COMPROMISED SERVER",
      riskScore: Number(entry.risk) || 0,
      country: entry.isocode || entry.country || "",
      asn: entry.asn || "",
    };
    storeIpIntel(ip, intel);
    return { ...intel, ip, source: "live" };
  } catch (e) {
    // Fail-open: bei Netzwerk-Problemen lieber durchlassen als alle Logins blockieren.
    if (process.env.NODE_ENV !== "production") console.warn("[ipIntel]", e?.message);
    return { ...CLEAN, ip, source: "error" };
  }
}

// Convenience: "Soll der Zugriff von dieser IP geblockt werden?"
// strict=true (z.B. bei Registrierung) lehnt VPN/Proxy/Tor/Hosting komplett ab.
// strict=false (z.B. bei Login) lässt nur Tor + sehr hohen Risk-Score blocken.
export function shouldBlockByIntel(intel, { strict = false } = {}) {
  if (!intel) return false;
  if (intel.isTor) return true;
  if (intel.riskScore >= 90) return true;
  if (strict && (intel.isVpn || intel.isProxy || intel.isHosting)) return true;
  return false;
}
