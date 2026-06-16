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
  // 1. ENV-Whitelist
  if (getAdminWhitelist().includes(ip)) return true;
  // 2. Admin-Cookie gesetzt → garantiert ein Mensch, nicht bannen
  const cookies = req.cookies?.get ? null : null;
  // Cookie aus Header lesen (Edge-Runtime-kompatibel)
  const cookieHeader = req.headers.get("cookie") || "";
  if (cookieHeader.includes("vv_admin=")) return true;
  // 3. Loopback / Privat-IP (sollte eh nicht über Internet kommen, aber für Dev)
  if (ip === "127.0.0.1" || ip === "::1" || ip === "localhost") return true;
  return false;
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
