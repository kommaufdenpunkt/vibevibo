// 🍪 Anonyme Consent-Verwaltung via Browser-Cookie.
//
// Für eingeloggte User wird `users.ads_consent` in der DB gespeichert.
// Für ANONYME Besucher (Public-Pages wie /about, /faq, /agb)
// nutzen wir einen Client-Cookie — damit auch Public-Traffic
// monetarisiert werden kann (DSGVO-konform via explizite Einwilligung).
//
// Werte (kompatibel mit user.adsConsent):
//   0   nicht entschieden (Banner anzeigen)
//   1   alle Cookies (personalisierte Werbung)
//   2   generische Werbung (nicht-personalisiert)
//  -1   nur essenziell (keine Werbung)

const COOKIE = "vv_anon_consent";
const MAX_AGE_DAYS = 365;

export function readAnonConsent() {
  if (typeof document === "undefined") return 0;
  const match = document.cookie.match(/(?:^|;\s*)vv_anon_consent=(-?\d+)/);
  if (!match) return 0;
  const n = parseInt(match[1], 10);
  if (![1, 2, -1].includes(n)) return 0;
  return n;
}

export function writeAnonConsent(value) {
  if (typeof document === "undefined") return;
  const n = parseInt(value, 10);
  if (![1, 2, -1].includes(n)) return;
  const maxAge = MAX_AGE_DAYS * 24 * 60 * 60;
  const secure = window.location?.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${COOKIE}=${n}; Max-Age=${maxAge}; Path=/; SameSite=Lax${secure}`;
}

export function clearAnonConsent() {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE}=; Max-Age=0; Path=/`;
}

// Effektiver Consent: für eingeloggte User die DB-Wahl, sonst der Cookie.
export function effectiveAdsConsent(me) {
  if (me && typeof me.adsConsent === "number") return me.adsConsent;
  return readAnonConsent();
}

// Effektiver VIP-Status: anonyme Besucher sind nie VIP.
export function effectiveVip(me) {
  return !!(me && me.vip);
}
