// RFC 6238 TOTP-Implementierung ohne externe Dependency.
// Kompatibel mit Google Authenticator, Authy, 1Password, Aegis, FreeOTP+.
import crypto from "node:crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function randomBase32Secret(bytes = 20) {
  const buf = crypto.randomBytes(bytes);
  return base32Encode(buf);
}

export function base32Encode(buf) {
  let bits = 0, value = 0, output = "";
  for (let i = 0; i < buf.length; i++) {
    value = (value << 8) | buf[i];
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

export function base32Decode(str) {
  const clean = String(str || "").toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0, value = 0;
  const bytes = [];
  for (const ch of clean) {
    const i = BASE32_ALPHABET.indexOf(ch);
    if (i < 0) continue;
    value = (value << 5) | i;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

// Generiert den 6-stelligen Code für einen bestimmten Zeitpunkt (Standard: jetzt).
export function totp(secretBase32, { step = 30, digits = 6, time = Date.now() } = {}) {
  const key = base32Decode(secretBase32);
  const counter = Math.floor(time / 1000 / step);
  const counterBuf = Buffer.alloc(8);
  // 8-Byte Big-Endian Counter
  for (let i = 7; i >= 0; i--) {
    counterBuf[i] = counter >>> ((7 - i) * 8) & 0xff;
  }
  const hmac = crypto.createHmac("sha1", key).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const binCode =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  const code = (binCode % Math.pow(10, digits)).toString().padStart(digits, "0");
  return code;
}

// Verifiziert einen Code mit ±1 Step Toleranz (90 Sek Fenster).
export function verifyTotp(secretBase32, code, { step = 30, digits = 6, window = 1, time = Date.now() } = {}) {
  if (!secretBase32 || !code) return false;
  const clean = String(code || "").replace(/\D/g, "");
  if (clean.length !== digits) return false;
  for (let w = -window; w <= window; w++) {
    const t = time + w * step * 1000;
    const expected = totp(secretBase32, { step, digits, time: t });
    if (timingSafeEqualStr(expected, clean)) return true;
  }
  return false;
}

function timingSafeEqualStr(a, b) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

// Erzeugt eine otpauth:// URL für QR-Code / manuelle Eingabe in Authenticator-Apps.
export function otpauthUri({ secret, issuer = "VibeVibo", account }) {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({
    secret, issuer, algorithm: "SHA1", digits: "6", period: "30",
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}
