// 🛒 Amazon-Affiliate-Setup — Partner-Tag + kuratierte Empfehlungen.
// Tag wird zentral aus ENV oder Default geholt. Helper enricht beliebige
// Amazon-URLs mit `?tag=...`. AMAZON_RECOMMENDATIONS ist eine kuratierte
// Liste passender Produkte fuer das Nostalgie-Publikum.

export const AMAZON_PARTNER_TAG =
  (typeof process !== "undefined" && process.env?.AMAZON_PARTNER_TAG) || "vibevibo-21";

// Hilfreich: hangt das `?tag=...` an beliebige Amazon-URL an. Wenn die URL
// schon einen tag-Parameter hat, wird er ersetzt.
export function addAmazonTag(url, tag = AMAZON_PARTNER_TAG) {
  if (!url) return url;
  try {
    const u = new URL(url);
    if (!/amazon\.(de|com|co\.uk|fr|it|es|nl)/i.test(u.hostname)) return url;
    u.searchParams.set("tag", tag);
    return u.toString();
  } catch {
    return url;
  }
}

// Such-Link bauen: nutzt Amazon-Suche statt ASINs (stabil, kann nicht aus
// dem Sortiment fallen). Funktioniert immer und der Tag bleibt aktiv.
export function amazonSearch(query, tag = AMAZON_PARTNER_TAG) {
  const q = encodeURIComponent(query);
  return `https://www.amazon.de/s?k=${q}&tag=${tag}`;
}

// Kuratierte Empfehlungen — thematisch zur Nostalgie-Plattform passend.
// Bilder kommen aus emoji-Fallbacks (keine Amazon-Image-API), Klick
// fuehrt zu Amazon-Suche mit Affiliate-Tag.
export const AMAZON_RECOMMENDATIONS = [
  {
    id: "2000er-bildband",
    emoji: "📸",
    title: "2000er — Bildband: Die Kult-Jahre",
    desc: "Großer Bildband mit allen Y2K-Highlights von MySpace bis Tokio Hotel.",
    query: "2000er kult bildband nostalgie",
    color: "#ec4899",
  },
  {
    id: "tokio-hotel",
    emoji: "🎸",
    title: "Tokio Hotel — Biografie",
    desc: "Die Story der Band die ein ganzes Jahrzehnt prägte.",
    query: "tokio hotel biografie buch",
    color: "#1c1c1e",
  },
  {
    id: "bravo-hits",
    emoji: "💿",
    title: "Bravo Hits 2000er — CD-Box",
    desc: "Die ultimative Soundtrack-Sammlung der 2000er.",
    query: "bravo hits 2000er sammlung",
    color: "#a855f7",
  },
  {
    id: "sailor-moon",
    emoji: "🌙",
    title: "Sailor Moon — Manga & Merch",
    desc: "Magical Girl Vibes für dein Profil.",
    query: "sailor moon manga deutsch",
    color: "#f43f5e",
  },
  {
    id: "polaroid",
    emoji: "📷",
    title: "Polaroid Sofortbildkamera",
    desc: "Echte Bilder zum Anfassen — Nostalgie pur.",
    query: "polaroid sofortbildkamera now",
    color: "#fbbf24",
  },
  {
    id: "nokia-3310",
    emoji: "📱",
    title: "Nokia 3310 — Klassiker neu",
    desc: "Das unzerstörbare Handy, mit Snake!",
    query: "nokia 3310 klassiker original",
    color: "#06b6d4",
  },
  {
    id: "y2k-merch",
    emoji: "👕",
    title: "Y2K Fashion & Accessoires",
    desc: "Schmetterling-Haarspangen, Glitzer-Tops und mehr.",
    query: "y2k aesthetic merch",
    color: "#d946ef",
  },
  {
    id: "schuelervz",
    emoji: "📖",
    title: "Bücher zur Internet-Nostalgie",
    desc: "MySpace, SchülerVZ, Jappy & Co. — wie alles begann.",
    query: "schuelervz myspace internet nostalgie buch",
    color: "#22c55e",
  },
];
