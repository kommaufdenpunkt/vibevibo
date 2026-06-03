// Media-Link-Parser: YouTube + Spotify URLs validieren + zu sicheren Embed-URLs umwandeln.
// Wird in /api/status, /api/users/[username]/pinnwand serverseitig genutzt
// und im Buschfunk-/Pinnwand-Renderer client-seitig.

const YT_PATTERNS = [
  /^https?:\/\/(?:www\.|m\.)?youtube\.com\/watch\?[^#]*v=([A-Za-z0-9_-]{6,15})/i,
  /^https?:\/\/youtu\.be\/([A-Za-z0-9_-]{6,15})/i,
  /^https?:\/\/(?:www\.)?youtube\.com\/shorts\/([A-Za-z0-9_-]{6,15})/i,
  /^https?:\/\/(?:www\.)?youtube\.com\/embed\/([A-Za-z0-9_-]{6,15})/i,
];

const SPOTIFY_PATTERNS = [
  /^https?:\/\/open\.spotify\.com\/(track|album|playlist|episode)\/([A-Za-z0-9]{15,30})/i,
];

// Gibt null zurueck wenn URL nicht erkannt — oder Objekt mit provider + id + embedUrl.
export function parseMediaUrl(rawUrl) {
  const url = String(rawUrl || "").trim().slice(0, 300);
  if (!url) return null;

  for (const re of YT_PATTERNS) {
    const m = url.match(re);
    if (m) {
      const id = m[1];
      return {
        provider: "youtube",
        id,
        embedUrl: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&playsinline=1&rel=0`,
        // Player kann nach User-Klick auf unmute wechseln — Browser blockieren autoplay+sound.
        originalUrl: url,
      };
    }
  }
  for (const re of SPOTIFY_PATTERNS) {
    const m = url.match(re);
    if (m) {
      const kind = m[1].toLowerCase();
      const id = m[2];
      return {
        provider: "spotify",
        id,
        embedUrl: `https://open.spotify.com/embed/${kind}/${id}?utm_source=generator&autoplay=1`,
        kind,
        originalUrl: url,
      };
    }
  }
  return null;
}

// JSON-String fuer DB-Spalte (kompakt).
export function serializeMedia(media) {
  if (!media) return "";
  return JSON.stringify({
    p: media.provider,
    i: media.id,
    e: media.embedUrl,
    k: media.kind || null,
    u: media.originalUrl,
  });
}

// JSON-String aus DB zurueck zu Objekt.
export function deserializeMedia(str) {
  if (!str) return null;
  try {
    const o = JSON.parse(str);
    if (!o?.p || !o?.i) return null;
    return {
      provider: o.p, id: o.i, embedUrl: o.e || "",
      kind: o.k || null, originalUrl: o.u || "",
    };
  } catch { return null; }
}
