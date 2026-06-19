import Link from "next/link";
import { checkAdminPassword, adminEnabled } from "@/lib/admin";
import { getProviderConfig, getDisplayProvider } from "@/lib/ads";
import { getSetting } from "@/lib/db";
import AdSenseLiveCheck from "@/components/admin/AdSenseLiveCheck";

export const dynamic = "force-dynamic";

export default async function AdsenseAdminPage({ searchParams }) {
  const sp = await searchParams;
  const pw = typeof sp?.pw === "string" ? sp.pw : "";

  if (!adminEnabled()) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <h2>Admin nicht konfiguriert.</h2>
      </div>
    );
  }
  if (!checkAdminPassword(pw)) {
    return (
      <div className="vv-card vv-login-card">
        <h2>🔐 VibeVibo Admin · Werbe-Diagnose</h2>
        <form method="GET" action="/admin/werbung">
          <label>Admin-Passwort</label>
          <input type="password" name="pw" className="vv-input" autoFocus />
          <div className="vv-mt-12">
            <button type="submit" className="vv-btn vv-btn-pink">▶ Anmelden</button>
          </div>
        </form>
      </div>
    );
  }

  // Konfig auslesen
  const provider = getDisplayProvider();
  const config = getProviderConfig();
  const display = config.display || {};
  const pubId = display.pubId || "";
  const autoAds = display.autoAds !== false;
  const enabled = !!display.enabled;

  // Checkliste server-side
  const checks = [
    {
      key: "provider",
      label: "Display-Provider gesetzt",
      ok: provider === "adsense",
      detail: provider === "adsense" ? "AdSense aktiv" : `Aktuell: ${provider}`,
      fix: provider !== "adsense" ? "Im Admin → Einstellungen → DISPLAY_PROVIDER auf 'adsense' setzen" : null,
    },
    {
      key: "pubid",
      label: "Publisher-ID (ADSENSE_PUB_ID)",
      ok: !!pubId && pubId.startsWith("ca-pub-"),
      detail: pubId ? `${pubId.slice(0, 12)}…${pubId.slice(-4)}` : "Nicht gesetzt!",
      fix: !pubId ? "Im Admin → Einstellungen → ADSENSE_PUB_ID auf 'ca-pub-…' setzen" : null,
    },
    {
      key: "autoads",
      label: "Auto-Ads aktiv",
      ok: autoAds,
      detail: autoAds ? "ON (Google entscheidet wo)" : "OFF (nur manuelle Slots)",
      fix: null,
    },
    {
      key: "enabled",
      label: "Konfiguration vollständig",
      ok: enabled,
      detail: enabled ? "Bereit zum Ausliefern" : "Provider oder Pub-ID fehlt",
      fix: null,
    },
  ];

  const allOk = checks.every((c) => c.ok);

  return (
    <div style={{ padding: 20, maxWidth: 980, margin: "0 auto", fontFamily: "system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #4285f4, #1a73e8)",
        color: "#fff", padding: 22, borderRadius: 18, marginBottom: 16,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ fontSize: 44 }}>📢</div>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>AdSense Werbe-Diagnose</h1>
            <div style={{ fontSize: 13, opacity: 0.9, marginTop: 4 }}>
              Server-Status + Live-Browser-Check für Google AdSense
            </div>
          </div>
        </div>
      </div>

      {/* Gesamt-Status */}
      <div style={{
        padding: 18, borderRadius: 16, marginBottom: 16,
        background: allOk ? "rgba(16,185,129,0.08)" : "rgba(245,158,11,0.08)",
        border: `2px solid ${allOk ? "#10b981" : "#f59e0b"}`,
      }}>
        <div style={{ fontSize: 20, fontWeight: 900, color: allOk ? "#059669" : "#92400e" }}>
          {allOk ? "✅ Konfiguration sieht gut aus" : "⚠ Konfiguration unvollständig"}
        </div>
        <div style={{ fontSize: 13, marginTop: 6, color: "#444", lineHeight: 1.5 }}>
          {allOk
            ? "Server-Side ist alles parat. Prüfe unten den Browser-Live-Check, ob der adsbygoogle-Script tatsächlich lädt und gerendert wird."
            : "Mindestens ein Server-Setting fehlt. Behebe die Punkte unten und lade die Seite neu."}
        </div>
      </div>

      {/* Server-Check */}
      <h2 style={{ fontSize: 18, marginTop: 18, marginBottom: 10 }}>🔧 Server-Konfiguration</h2>
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e5e5e7" }}>
        {checks.map((c, i) => (
          <div key={c.key} style={{
            display: "flex", alignItems: "center", gap: 14,
            padding: "14px 16px",
            borderBottom: i < checks.length - 1 ? "1px solid #f1f5f9" : "none",
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 999,
              background: c.ok ? "linear-gradient(135deg, #10b981, #059669)" : "#fee2e2",
              color: c.ok ? "#fff" : "#991b1b",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 900, flexShrink: 0,
            }}>{c.ok ? "✓" : "✗"}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, color: "#1c1c1e" }}>{c.label}</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 2, fontFamily: c.key === "pubid" ? "monospace" : "inherit" }}>
                {c.detail}
              </div>
              {c.fix && (
                <div style={{ fontSize: 11.5, color: "#b45309", marginTop: 4, fontWeight: 600 }}>
                  💡 Fix: {c.fix}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* External-Checks (Links) */}
      <h2 style={{ fontSize: 18, marginTop: 22, marginBottom: 10 }}>🌐 Externe Prüfungen</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 10 }}>
        <a href="/ads.txt" target="_blank" style={cardLink()}>
          <div style={{ fontWeight: 800, fontSize: 14 }}>📄 ads.txt prüfen</div>
          <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 4 }}>
            Sollte enthalten: <code>google.com, pub-…, DIRECT, f08c47fec0942fa0</code>
          </div>
        </a>
        <a href="/robots.txt" target="_blank" style={cardLink()}>
          <div style={{ fontWeight: 800, fontSize: 14 }}>🤖 robots.txt prüfen</div>
          <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 4 }}>
            Sollte <code>Mediapartners-Google: allow /</code> enthalten
          </div>
        </a>
        <a href="https://www.google.com/adsense/" target="_blank" rel="noopener" style={cardLink()}>
          <div style={{ fontWeight: 800, fontSize: 14 }}>🔗 AdSense Console öffnen</div>
          <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 4 }}>
            Status, Auszahlungen, Auto-Ads-Settings
          </div>
        </a>
        <a href={`https://www.google.com/adsense/new/u/0/${pubId.replace("ca-pub-", "pub-")}/sites`} target="_blank" rel="noopener" style={cardLink()}>
          <div style={{ fontWeight: 800, fontSize: 14 }}>📊 Websites-Übersicht</div>
          <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 4 }}>
            Status pro Domain (Bereit / Prüfung / Maßnahme)
          </div>
        </a>
      </div>

      {/* Browser-Live-Check */}
      <h2 style={{ fontSize: 18, marginTop: 22, marginBottom: 10 }}>🔬 Live-Browser-Check</h2>
      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10 }}>
        Hier prüfen wir was im aktuellen Browser tatsächlich passiert: lädt das Script? Ist Consent gegeben? Bist du VIP?
      </div>
      <AdSenseLiveCheck pubId={pubId} />

      {/* Tipps */}
      <h2 style={{ fontSize: 18, marginTop: 22, marginBottom: 10 }}>💡 Wichtigste AdSense-Tipps</h2>
      <ul style={{ background: "#fff", padding: "16px 32px", borderRadius: 14, border: "1px solid #e5e5e7", lineHeight: 1.7, fontSize: 13 }}>
        <li><b>Status „Wird vorbereitet":</b> Normal. Google prüft 1–7 Tage, dann „Bereit".</li>
        <li><b>Status „Maßnahme erforderlich":</b> ads.txt-Fehler oder Policy-Verstoß — Detail-Mail von Google checken.</li>
        <li><b>Keine Werbung trotz „Bereit":</b> Browser-Adblocker? Test im Inkognito-Modus mit deaktivierten Erweiterungen.</li>
        <li><b>Premium-User:</b> Sehen keine Werbung (Code-Logik). Zum Testen: Premium-Status temporär entfernen.</li>
        <li><b>Approval-Hilfe:</b> Mind. 30 öffentliche, indexierbare Seiten + Impressum + Datenschutz + AGB sind Pflicht. ✅ Alle vorhanden.</li>
      </ul>

      <div style={{ marginTop: 30, textAlign: "center" }}>
        <Link href={`/admin?pw=${encodeURIComponent(pw)}`} style={{ color: "#64748b", fontSize: 13 }}>
          ← Zurück zum Admin-Hauptmenü
        </Link>
      </div>
    </div>
  );
}

function cardLink() {
  return {
    display: "block",
    background: "#fff",
    border: "1px solid #e5e5e7",
    borderRadius: 14,
    padding: 14,
    textDecoration: "none",
    color: "#1c1c1e",
  };
}
