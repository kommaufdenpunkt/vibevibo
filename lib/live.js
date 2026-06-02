// VibeVibo Live — Emote-Katalog & Live-Helper.
// Emotes sind der Haupt-Vibes-Sink für Live: jeder Versand kostet, Vibes
// gehen an den/die Stream-Hosts (Inflation-frei: kein Vibes-Generator).

export const LIVE_MODES = {
  solo:  { label: "🎙 Solo-Stream", desc: "Du allein vorne, alle gucken.",        maxHosts: 1 },
  multi: { label: "🛋 Multi-Couch", desc: "Bis zu 16 Hosts gleichzeitig.",         maxHosts: 16 },
};

// Multi-Mode: max möglich. Default 4, hoch bis 16 (Performance: für >8 Hosts
// empfehlen wir Audio-only — 16 P2P-Video-Streams sprengen Mobile-Bandbreite).
export const MAX_HOSTS_MULTI = 16;
export const RECOMMEND_AUDIO_ONLY_ABOVE = 8;

// Plätze-Policy
export const HOST_POLICIES = {
  open:    { label: "🚪 Offen — jeder darf rein",    desc: "Bis voll, dann zu." },
  request: { label: "🔒 Plätze zu — Anfrage nötig", desc: "Du entscheidest, wer auf die Couch darf." },
};

// Emote-Katalog (von günstig nach Mega-Effekt). Anti-Inflation: Vibes-Sink.
// Animation: name der CSS-Klasse (siehe LiveEmoteBar). Hosts bekommen 70%
// als „Trinkgeld" — Owner kriegt mehr als Cohosts (split fair).
export const EMOTES = [
  { id: "heart",     emoji: "💖",  label: "Herz",        cost: 3,   size: "sm", duration: 2000 },
  { id: "rose",      emoji: "🌹",  label: "Rose",        cost: 5,   size: "sm", duration: 2500 },
  { id: "wave",      emoji: "👋",  label: "Winken",      cost: 5,   size: "sm", duration: 2000 },
  { id: "fire",      emoji: "🔥",  label: "Feuer",       cost: 8,   size: "sm", duration: 2500 },
  { id: "applause",  emoji: "👏",  label: "Applaus",     cost: 10,  size: "md", duration: 3000 },
  { id: "gift",      emoji: "🎁",  label: "Geschenk",    cost: 15,  size: "md", duration: 3500 },
  { id: "pizza",     emoji: "🍕",  label: "Pizza",       cost: 15,  size: "md", duration: 3500 },
  { id: "knuddel",   emoji: "🧸",  label: "Knuddel",     cost: 20,  size: "md", duration: 3500 },
  { id: "cake",      emoji: "🎂",  label: "Torte",       cost: 25,  size: "md", duration: 4000 },
  { id: "star",      emoji: "🌟",  label: "Stern",       cost: 30,  size: "lg", duration: 4500 },
  { id: "rocket",    emoji: "🚀",  label: "Rakete",      cost: 50,  size: "lg", duration: 5000 },
  { id: "unicorn",   emoji: "🦄",  label: "Einhorn",     cost: 50,  size: "lg", duration: 5000 },
  { id: "firework",  emoji: "🎆",  label: "Feuerwerk",   cost: 75,  size: "lg", duration: 6000 },
  { id: "dragon",    emoji: "🐉",  label: "Drache",      cost: 100, size: "xl", duration: 6500 },
  { id: "diamond",   emoji: "💎",  label: "Diamant",     cost: 150, size: "xl", duration: 7000 },
  { id: "crown",     emoji: "👑",  label: "Krone",       cost: 250, size: "xl", duration: 8000 },
];
export const EMOTE_MAP = Object.fromEntries(EMOTES.map((e) => [e.id, e]));

// Anti-Spam Limits für Chat + Emotes
export const CHAT_MAX_LEN = 240;
export const CHAT_MIN_INTERVAL_MS = 1500;       // pro User, pro Stream
export const EMOTE_MIN_INTERVAL_MS = 500;
export const HEARTBEAT_INTERVAL_MS = 30_000;   // Viewer-Heartbeat
export const VIEWER_STALE_MS = 60_000;          // Viewer offline wenn >60s kein Heartbeat

// Wie viele Vibes gehen an Hosts (Rest verschwindet = Sink).
// 70% an Hosts gleichmäßig, 30% wirklich gesinkt (Wirtschafts-Bremse).
export const EMOTE_HOST_PAYOUT_PCT = 70;

// Limits — wer darf live gehen + wieviele Streams gleichzeitig.
export const MAX_LIVE_STREAMS_PER_USER = 1;     // Du kannst nicht 2 gleichzeitig hosten
