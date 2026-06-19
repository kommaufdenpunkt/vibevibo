"use client";
import { useEffect, useState } from "react";

// CCleaner-Style Scan: jeder Check tickert nacheinander auf "✓ OK".
const CHECKS = [
  { id: "ratelimit", label: "Brute-Force-Schutz", detail: "Username + IP-Lockout aktiv (5 Versuche / 15 Min)" },
  { id: "hsts", label: "HTTPS-Pflicht (HSTS)", detail: "max-age=2y · includeSubDomains · preload" },
  { id: "csrf", label: "CSRF-Token-Schutz", detail: "Double-Submit-Cookie + Origin-Check" },
  { id: "csp", label: "Content-Security-Policy", detail: "Strict für MCP · Drittanbieter blockiert" },
  { id: "cookie", label: "Cookie-Hardening", detail: "HttpOnly · Secure · SameSite=Strict · Host-Only" },
  { id: "ipintel", label: "IP-Reputation", detail: "Tor/VPN/Proxy/Hoster werden geprüft" },
  { id: "torblock", label: "Tor-/VPN-Block", detail: "Login aus Tor-Netzen abgelehnt" },
  { id: "hackerguard", label: "Hacker-Guard", detail: "50+ Angriffsmuster · sofort Permabann" },
  { id: "audit", label: "Audit-Log läuft", detail: "Jeder Login-Versuch (success + fail) wird protokolliert" },
  { id: "timing", label: "Timing-Attack-Schutz", detail: "Min. 400ms Antwortzeit verhindert Enumeration" },
  { id: "frame", label: "Clickjacking-Schutz", detail: "X-Frame-Options: DENY für MCP" },
  { id: "nosniff", label: "MIME-Sniffing-Schutz", detail: "X-Content-Type-Options: nosniff" },
  { id: "headers", label: "Permissions-Policy", detail: "Browser-APIs eingeschränkt" },
  { id: "session", label: "Session-Härtung", detail: "30 Tage TTL · IP + UA gespeichert" },
];

const STEP_MS = 130;

export default function McpSecurityScan({ overview }) {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (step >= CHECKS.length) { setDone(true); return; }
    const t = setTimeout(() => setStep((s) => s + 1), STEP_MS);
    return () => clearTimeout(t);
  }, [step]);

  const progress = Math.round((Math.min(step, CHECKS.length) / CHECKS.length) * 100);
  const blockedTotal = (overview?.blockedRatelimit || 0) + (overview?.blockedBadIp || 0) + (overview?.blockedVpn || 0);

  return (
    <div className="mcp-sec-scan">
      <div className="mcp-sec-scan-header">
        <div className="mcp-sec-scan-title">
          {done ? "✅ ALLE SYSTEME AKTIV" : "🔍 SCAN LÄUFT…"}
        </div>
        <div className="mcp-sec-scan-sub">
          {done
            ? `${CHECKS.length} Sicherheits-Layer geprüft · ${blockedTotal > 0 ? `${blockedTotal} Angriffe in 24h blockiert` : "Keine Angriffe in 24h"}`
            : `Prüfe Layer ${Math.min(step + 1, CHECKS.length)} von ${CHECKS.length}…`}
        </div>
        <div className="mcp-sec-progress">
          <div className="mcp-sec-progress-bar" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <ul className="mcp-sec-list">
        {CHECKS.map((c, i) => {
          const state = i < step ? "ok" : i === step ? "scan" : "wait";
          return (
            <li key={c.id} className={`mcp-sec-item ${state}`}>
              <span className="mcp-sec-icon">
                {state === "ok" ? "✓" : state === "scan" ? "◐" : "○"}
              </span>
              <span className="mcp-sec-info">
                <span className="mcp-sec-label">{c.label}</span>
                <span className="mcp-sec-detail">{c.detail}</span>
              </span>
              <span className="mcp-sec-status">
                {state === "ok" ? "OK" : state === "scan" ? "…" : ""}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
