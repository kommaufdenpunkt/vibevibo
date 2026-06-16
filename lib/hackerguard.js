// 🛡 HackerGuard — Pattern-Detection für offensichtliche Angriffe.
// Wird in middleware.js + in API-Routes verwendet.
// Whitelist via ENV VV_ADMIN_IPS (Komma-getrennt) + Admin-Cookie verhindern Selbstbann.

const SCANNER_PATHS = [
  // Wordpress
  /\/wp-(admin|login|content|includes|json)/i,
  /\/xmlrpc\.php/i,
  /\/wlwmanifest\.xml/i,
  /\/wp-config\.php/i,
  // Common config / secrets
  /\/\.(env|git|svn|hg|aws|ssh|htaccess|htpasswd|DS_Store)/i,
  /\/(config|database|credentials|secret|backup|dump|administrator)\.(php|sql|yml|json|env)/i,
  // PHP scanners
  /\/(phpinfo|phpmyadmin|pma|adminer|webadmin|setup)/i,
  /\.php(\?|$)/i,
  // Common app scans
  /\/(cgi-bin|bin|boot|drupal|joomla|wordpress|vendor\/phpunit|server-status|server-info|console)/i,
  // ASP scanners
  /\.(asp|aspx|cfm)(\?|$)/i,
  // Common shells
  /\/(shell|c99|r57|wso|gel4y|alfa|MarijuanaShell)\.php/i,
];

const SQL_PATTERNS = [
  /\b(UNION|SELECT)\b\s+.*\bFROM\b/i,
  /\bOR\s+1\s*=\s*1\b/i,
  /\b(AND|OR)\s+'\w*'\s*=\s*'\w*'/i,
  /;\s*DROP\s+TABLE/i,
  /;\s*DELETE\s+FROM/i,
  /;\s*INSERT\s+INTO/i,
  /;\s*UPDATE\s+\w+\s+SET/i,
  /WAITFOR\s+DELAY/i,
  /\bxp_cmdshell\b/i,
  /\bSLEEP\s*\(\s*\d+/i,
  /\bBENCHMARK\s*\(/i,
  /'\s*(OR|AND)\s+'1'\s*=\s*'1/i,
];

const XSS_PATTERNS = [
  /<script[\s>]/i,
  /javascript\s*:/i,
  /\bon(error|load|click|focus|mouseover|mouseout)\s*=/i,
  /<iframe[\s>]/i,
  /<svg[^>]*\bonload/i,
  /document\.cookie/i,
  /document\.write\(/i,
];

const TRAVERSAL_PATTERNS = [
  /\.\.\/\.\.\//,
  /\.\.\\\.\.\\/,
  /%2e%2e%2f/i,
  /%2e%2e\//i,
  /\.\.%2f/i,
  /\/etc\/(passwd|shadow|hosts)/i,
  /\/proc\/self\/environ/i,
  /\/windows\/system32/i,
  /file:\/\/\//i,
];

const CMD_INJECTION = [
  /;\s*(cat|ls|wget|curl|nc|bash|sh|chmod|chown|rm)\s+\//i,
  /\$\([^)]+\)/,
  /`[^`]+`/,
  /\|\s*(cat|ls|wget|curl|nc|bash)/i,
  /&&\s*(cat|ls|wget|curl|nc|bash)/i,
];

const SUSPICIOUS_UA = [
  /sqlmap/i,
  /nikto/i,
  /nmap/i,
  /masscan/i,
  /nessus/i,
  /openvas/i,
  /acunetix/i,
  /\bwpscan\b/i,
  /\barachni\b/i,
  /\bzgrab\b/i,
  /\bzap\/\d/i,
  /burp(suite|collaborator)/i,
  /havij/i,
  /metasploit/i,
  /netsparker/i,
  /qualys/i,
  /w3af/i,
  /\bdirbuster\b/i,
  /\bgobuster\b/i,
  /\bffuf\b/i,
];

const SUSPICIOUS_METHODS = new Set(["TRACE", "CONNECT", "PROPFIND", "PROPPATCH", "MKCOL"]);

// === Public API ===

export function getClientIp(req) {
  // X-Forwarded-For (Coolify/Traefik) > Real-IP > Direkt
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    return xff.split(",")[0].trim();
  }
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

export function getAdminWhitelist() {
  const raw = process.env.VV_ADMIN_IPS || "";
  return raw.split(",").map((ip) => ip.trim()).filter(Boolean);
}

export function isWhitelisted(ip, req) {
  // 1. ENV-Whitelist (mit CIDR-Support für IPv4 und IPv6)
  const cleanIp = stripZoneId(ip);
  for (const entry of getAdminWhitelist()) {
    if (ipMatchesEntry(cleanIp, entry)) return true;
  }
  // 2. Admin-Cookie gesetzt → garantiert ein Mensch, nicht bannen
  const cookieHeader = req.headers.get("cookie") || "";
  if (cookieHeader.includes("vv_admin=")) return true;
  // 3. Loopback / Privat-IP
  if (cleanIp === "127.0.0.1" || cleanIp === "::1" || cleanIp === "localhost") return true;
  return false;
}

// === IP-Matching mit CIDR ===

function stripZoneId(ip) {
  if (!ip) return ip;
  const i = ip.indexOf("%");
  return i >= 0 ? ip.slice(0, i) : ip;
}

export function ipMatchesEntry(ip, entry) {
  if (!ip || !entry) return false;
  // IPv4-mapped IPv6 wie ::ffff:1.2.3.4 → 1.2.3.4 behandeln
  const normIp = ip.startsWith("::ffff:") ? ip.slice(7) : ip;
  const normEntry = entry.startsWith("::ffff:") ? entry.slice(7) : entry;

  const slash = normEntry.indexOf("/");
  const ipPart = slash >= 0 ? normEntry.slice(0, slash) : normEntry;
  const prefix = slash >= 0 ? parseInt(normEntry.slice(slash + 1), 10) : null;

  const a = parseIp(normIp);
  const b = parseIp(ipPart);
  if (!a || !b || a.type !== b.type) return false;
  if (prefix == null) return a.value === b.value;
  const totalBits = a.type === 4 ? 32 : 128;
  if (prefix < 0 || prefix > totalBits) return false;
  if (prefix === 0) return true;
  const shift = BigInt(totalBits - prefix);
  return (a.value >> shift) === (b.value >> shift);
}

function parseIp(s) {
  if (!s) return null;
  s = stripZoneId(String(s).trim());
  if (s.includes(":")) return parseIpv6(s);
  if (s.includes(".")) return parseIpv4(s);
  return null;
}

function parseIpv4(s) {
  const parts = s.split(".");
  if (parts.length !== 4) return null;
  let n = 0n;
  for (const p of parts) {
    const v = parseInt(p, 10);
    if (!Number.isFinite(v) || v < 0 || v > 255 || String(v) !== p.trim()) return null;
    n = (n << 8n) | BigInt(v);
  }
  return { type: 4, value: n };
}

function parseIpv6(s) {
  let parts;
  const ddIdx = s.indexOf("::");
  if (ddIdx >= 0) {
    if (s.indexOf("::", ddIdx + 1) >= 0) return null; // doppelte ::
    const left = s.slice(0, ddIdx).split(":").filter((x) => x !== "");
    const right = s.slice(ddIdx + 2).split(":").filter((x) => x !== "");
    const missing = 8 - left.length - right.length;
    if (missing < 0) return null;
    parts = [...left, ...new Array(missing).fill("0"), ...right];
  } else {
    parts = s.split(":");
  }
  if (parts.length !== 8) return null;
  let n = 0n;
  for (const p of parts) {
    const v = parseInt(p, 16);
    if (!Number.isFinite(v) || v < 0 || v > 0xffff) return null;
    n = (n << 16n) | BigInt(v);
  }
  return { type: 6, value: n };
}

// Hauptfunktion: prüfe Request auf Angriffsmuster.
// Returns null wenn ok, oder { pattern, severity, payload, source } bei Treffer.
export function detectAttack(req) {
  const url = req.nextUrl || new URL(req.url);
  const pathname = url.pathname || "";
  const search = url.search || "";
  const fullPath = pathname + search;
  const method = (req.method || "GET").toUpperCase();
  const ua = req.headers.get("user-agent") || "";

  // 1. Method
  if (SUSPICIOUS_METHODS.has(method)) {
    return { pattern: "suspicious-method:" + method, severity: "high", payload: method, source: "method" };
  }

  // 2. User-Agent
  for (const re of SUSPICIOUS_UA) {
    if (re.test(ua)) {
      return { pattern: "scanner-ua:" + re.source.slice(0, 20), severity: "critical", payload: ua.slice(0, 200), source: "user-agent" };
    }
  }

  // 3. Scanner-Pfade (wp-admin, .env, etc.)
  for (const re of SCANNER_PATHS) {
    if (re.test(pathname)) {
      return { pattern: "scanner-path", severity: "critical", payload: pathname, source: "path" };
    }
  }

  // 4. SQL-Injection in URL/Query
  for (const re of SQL_PATTERNS) {
    if (re.test(fullPath)) {
      return { pattern: "sql-injection", severity: "critical", payload: fullPath.slice(0, 300), source: "url" };
    }
  }

  // 5. XSS in URL/Query
  for (const re of XSS_PATTERNS) {
    if (re.test(fullPath)) {
      return { pattern: "xss-attempt", severity: "high", payload: fullPath.slice(0, 300), source: "url" };
    }
  }

  // 6. Path-Traversal
  for (const re of TRAVERSAL_PATTERNS) {
    if (re.test(fullPath)) {
      return { pattern: "path-traversal", severity: "critical", payload: fullPath.slice(0, 300), source: "url" };
    }
  }

  // 7. Command-Injection in URL
  for (const re of CMD_INJECTION) {
    if (re.test(fullPath)) {
      return { pattern: "cmd-injection", severity: "critical", payload: fullPath.slice(0, 300), source: "url" };
    }
  }

  return null;
}
