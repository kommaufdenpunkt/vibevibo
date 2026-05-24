// Sicheres CSS für Profilseiten (à la MySpace).
// Wir erlauben nur Selektoren, die in einem .vv-skin-Container greifen,
// und filtern gefährliche Patterns raus.

const FORBIDDEN_PATTERNS = [
  /expression\s*\(/i,           // alte IE-Lücke
  /javascript\s*:/i,
  /vbscript\s*:/i,
  /data\s*:[^,]*script/i,
  /@import/i,
  /@charset/i,
  /behavior\s*:/i,
  /<script/i,
  /<\/style/i,
  /url\s*\(\s*['"]?\s*(javascript|vbscript|data:[^,]*script)/i,
  /position\s*:\s*fixed/i,      // verhindert Overlay-Tricks auf Navbar
];

export function sanitizeCustomCss(input) {
  if (!input) return "";
  let css = String(input).slice(0, 20000); // max 20kB
  for (const re of FORBIDDEN_PATTERNS) {
    if (re.test(css)) {
      css = css.replace(re, "/* removed */");
    }
  }
  // Doppelt absichern: Strip vor "</"
  css = css.replace(/<\//g, "&lt;/");
  return css;
}

// Skopiert den User-CSS auf den .vv-skin-Wrapper. Sehr simpel, kein
// vollwertiger CSS-Parser - ersetzt aber alle Top-Level-Selektoren mit
// einem Prefix, sodass globale Side-Effects vermieden werden.
export function scopeCss(css, scopeSelector = ".vv-skin") {
  if (!css) return "";
  // Entfernt Kommentare, damit unsere Regex sauber arbeitet
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, "");
  // Teilt in Regeln; sehr einfach: split auf "}" und reassemble
  const parts = stripped.split("}");
  const out = [];
  for (let part of parts) {
    part = part.trim();
    if (!part) continue;
    const braceIdx = part.indexOf("{");
    if (braceIdx < 0) continue;
    let selectors = part.slice(0, braceIdx).trim();
    const body = part.slice(braceIdx + 1).trim();
    if (!selectors) continue;
    // Bei @-Regeln (keyframes, media) - body unverändert lassen
    if (selectors.startsWith("@")) {
      out.push(`${selectors} { ${body} }`);
      continue;
    }
    // Mehrere Selektoren mit Komma
    const scoped = selectors
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => {
        if (s.startsWith(scopeSelector)) return s;
        if (s === "body" || s === "html") return scopeSelector;
        return `${scopeSelector} ${s}`;
      })
      .join(", ");
    out.push(`${scoped} { ${body} }`);
  }
  return out.join("\n");
}
