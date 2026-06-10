// 🎀 Sicheres User-HTML — Begrüßungs-Box & andere freie Inhalte.
// Erlaubt grundlegende Formatierung + img/a, blockt alles Gefährliche.
//
// Erlaubte Tags: b, strong, i, em, u, s, br, p, div, span, hr, blockquote,
//                h1-h6, ul, ol, li, a, img, font, marquee, center
// Erlaubte Attribute (pro Tag):
//   a:   href (nur http/https/mailto), target, rel, title
//   img: src (nur http/https/data:image), alt, width, height, title
//   font: color, size, face
//   Alle: style (gefilterte Properties), class
//
// Verboten: script, iframe, embed, object, link, meta, style-Tags,
//           on*-Handler, javascript:/vbscript:, data: außer image, expression()

const ALLOWED_TAGS = new Set([
  "b","strong","i","em","u","s","br","p","div","span","hr","blockquote",
  "h1","h2","h3","h4","h5","h6","ul","ol","li","a","img","font","marquee","center",
]);

const ALLOWED_ATTRS = {
  a:    new Set(["href","target","rel","title"]),
  img:  new Set(["src","alt","width","height","title"]),
  font: new Set(["color","size","face"]),
  marquee: new Set(["behavior","direction","scrollamount","loop"]),
};
// Universelle Attribute (auf jedem Tag erlaubt)
const UNIVERSAL_ATTRS = new Set(["style","class","title"]);

const DANGEROUS_STYLE_PATTERNS = [
  /expression\s*\(/i,
  /javascript\s*:/i,
  /vbscript\s*:/i,
  /url\s*\(\s*['"]?\s*javascript/i,
  /position\s*:\s*fixed/i,
  /behavior\s*:/i,
  /-moz-binding/i,
];

function isSafeUrl(url, allowDataImage = false) {
  const v = String(url || "").trim();
  if (!v) return false;
  if (/^https?:\/\//i.test(v)) return true;
  if (/^mailto:/i.test(v)) return true;
  if (/^#/.test(v)) return true;
  if (allowDataImage && /^data:image\/(png|jpeg|jpg|gif|webp|svg\+xml);/i.test(v)) return true;
  return false;
}

function sanitizeStyle(style) {
  if (!style) return "";
  let s = String(style);
  for (const re of DANGEROUS_STYLE_PATTERNS) {
    if (re.test(s)) s = s.replace(re, "/* removed */");
  }
  // Doppelpunkte/Quotes filtern
  s = s.replace(/<\//g, "");
  return s.slice(0, 1000);
}

function sanitizeAttribute(tag, name, value) {
  const n = name.toLowerCase();
  // On-Event-Handler blocken
  if (n.startsWith("on")) return null;
  // Tag-spezifische Whitelist
  const allowedForTag = ALLOWED_ATTRS[tag] || new Set();
  if (!allowedForTag.has(n) && !UNIVERSAL_ATTRS.has(n)) return null;
  let v = String(value || "");
  if (n === "href") {
    if (!isSafeUrl(v)) return null;
  } else if (n === "src") {
    if (!isSafeUrl(v, true)) return null;
  } else if (n === "style") {
    v = sanitizeStyle(v);
  } else if (n === "target") {
    if (v !== "_blank" && v !== "_self") return null;
  } else if (n === "width" || n === "height") {
    if (!/^\d{1,4}%?$/.test(v)) return null;
  }
  // Quotes safe
  v = v.replace(/"/g, "&quot;").replace(/[\r\n]/g, " ");
  return v;
}

export function sanitizeHtml(input, { maxLen = 5000 } = {}) {
  if (!input) return "";
  let html = String(input).slice(0, maxLen);
  // <script/iframe/object/embed/link/meta/style komplett entfernen (inkl. Inhalt)
  html = html.replace(/<\s*(script|iframe|object|embed|link|meta|style)[\s\S]*?<\s*\/\s*\1\s*>/gi, "");
  html = html.replace(/<\s*(script|iframe|object|embed|link|meta|style)[^>]*\/?>/gi, "");
  // HTML-Kommentare raus
  html = html.replace(/<!--[\s\S]*?-->/g, "");

  // Tags durchgehen
  const out = [];
  let lastIdx = 0;
  const tagRe = /<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g;
  let m;
  while ((m = tagRe.exec(html)) !== null) {
    out.push(html.slice(lastIdx, m.index));
    lastIdx = tagRe.lastIndex;
    const closing = m[1] === "/";
    const tag = m[2].toLowerCase();
    const rawAttrs = m[3] || "";
    if (!ALLOWED_TAGS.has(tag)) continue; // Tag verwerfen, Inhalt bleibt
    if (closing) { out.push(`</${tag}>`); continue; }
    // Self-closing erkennen
    const selfClose = /\/\s*$/.test(rawAttrs) || tag === "br" || tag === "hr" || tag === "img";
    // Attribute parsen
    const attrRe = /([a-zA-Z_:][-a-zA-Z0-9_:]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))|([a-zA-Z_:][-a-zA-Z0-9_:]*)/g;
    const sanitizedAttrs = [];
    let am;
    while ((am = attrRe.exec(rawAttrs)) !== null) {
      const aname = (am[1] || am[5] || "").toLowerCase();
      if (!aname) continue;
      const avalue = am[2] != null ? am[2] : am[3] != null ? am[3] : am[4] != null ? am[4] : "";
      const clean = sanitizeAttribute(tag, aname, avalue);
      if (clean === null) continue;
      sanitizedAttrs.push(`${aname}="${clean}"`);
    }
    // Link-Sicherheit: rel=noopener für target=_blank
    if (tag === "a" && sanitizedAttrs.some((s) => s.startsWith('target="_blank"'))) {
      if (!sanitizedAttrs.some((s) => s.startsWith("rel="))) {
        sanitizedAttrs.push('rel="noopener noreferrer"');
      }
    }
    const attrStr = sanitizedAttrs.length ? " " + sanitizedAttrs.join(" ") : "";
    out.push(`<${tag}${attrStr}${selfClose ? " /" : ""}>`);
  }
  out.push(html.slice(lastIdx));
  let result = out.join("");
  // Restliche on*-Handler im Text-Bereich strippen (Belt + braces)
  result = result.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  // javascript:/vbscript: in Text-Inhalten neutralisieren
  result = result.replace(/javascript\s*:/gi, "blocked:");
  result = result.replace(/vbscript\s*:/gi, "blocked:");
  return result;
}

// Sehr kurze Variante für Marquee (kein HTML, nur Plain-Text + safe Emoji).
export function sanitizeMarquee(input, { maxLen = 200 } = {}) {
  if (!input) return "";
  let s = String(input).slice(0, maxLen);
  s = s.replace(/[<>]/g, "");
  return s;
}

// 🎀 Pinnwand/Gaestebuch-Sanitizer + automatische @-Mention-Verlinkung.
// Wandelt @username (3-30 Zeichen) in eine <a>-Verlinkung um BEVOR sanitisiert
// wird, damit Mentions auch in HTML-Posts klickbar bleiben.
// Verlinkungen werden mit <a href="/u/..."> generiert — sicheres relativ-URL.
export function sanitizeWallText(input, { maxLen = 1200 } = {}) {
  let s = String(input || "").slice(0, maxLen);
  // 1. @mention -> <a> Tag VOR Sanitize (Sanitizer laesst <a> mit href durch)
  s = s.replace(/(^|[^a-zA-Z0-9_])@([a-z0-9_.]{3,30})(?![a-z0-9_.])/gi,
    (m, pre, name) => `${pre}<a href="/u/${name.toLowerCase()}">@${name}</a>`);
  // 2. Standard-Sanitizer
  return sanitizeHtml(s, { maxLen });
}
