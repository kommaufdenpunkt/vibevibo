// Prüfung gegen haveibeenpwned.com per k-Anonymity:
// - SHA-1(password) wird lokal berechnet.
// - Nur die ersten 5 Hex-Zeichen des Hashes werden an die API gesendet.
// - Die API antwortet mit einer Liste aller Hash-Suffixe die mit dem Präfix beginnen.
// - Wir prüfen lokal, ob unser Hash-Suffix dabei ist.
// → HIBP erfährt nie das Passwort oder den vollen Hash.
import crypto from "node:crypto";

const ENDPOINT = "https://api.pwnedpasswords.com/range/";

// Liefert {pwned: true, count: N} wenn das Passwort in Leaks aufgetaucht ist,
// sonst {pwned: false, count: 0}. Bei Netz-Fehler: {error: "...", pwned: false}.
export async function isPwnedPassword(password, { timeoutMs = 2500 } = {}) {
  if (!password) return { pwned: false, count: 0 };
  if (process.env.VV_PWNED_CHECK === "off") return { pwned: false, count: 0, source: "off" };

  const sha1 = crypto.createHash("sha1").update(String(password)).digest("hex").toUpperCase();
  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);
  try {
    const res = await fetch(ENDPOINT + prefix, {
      headers: { "Add-Padding": "true", "User-Agent": "VibeVibo-PasswordCheck/1.0" },
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return { pwned: false, count: 0, error: `HIBP ${res.status}` };
    const text = await res.text();
    // Format: "<suffix>:<count>\r\n..." Padding-Zeilen haben count=0.
    for (const line of text.split(/\r?\n/)) {
      const [s, c] = line.split(":");
      if (!s) continue;
      if (s.trim().toUpperCase() === suffix) {
        const count = Number(c) || 0;
        if (count > 0) return { pwned: true, count };
      }
    }
    return { pwned: false, count: 0 };
  } catch (e) {
    // Fail-open: lieber registrieren lassen als alle blockieren.
    return { pwned: false, count: 0, error: e?.message || String(e) };
  }
}
