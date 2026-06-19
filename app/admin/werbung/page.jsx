import Link from "next/link";
import { redirect } from "next/navigation";
import { checkAdminPassword, adminEnabled } from "@/lib/admin";
import { getProviderConfig, getDisplayProvider } from "@/lib/ads";
import { getSetting, setSetting } from "@/lib/db";
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

  // ─── Settings-Actions (GET-basiert wie Legacy-Admin) ───
  const action = typeof sp?.do === "string" ? sp.do : "";
  const pwQ = `pw=${encodeURIComponent(pw)}`;
  const backUrl = `/admin/werbung?${pwQ}`;

  if (action === "save_settings") {
    try {
      const newProvider = String(sp?.provider || "off").toLowerCase();
      if (["off","adsense","ezoic","adsterra"].includes(newProvider)) {
        setSetting("DISPLAY_PROVIDER", newProvider);
      }
      if (typeof sp?.pubid === "string") {
        setSetting("ADSENSE_PUB_ID", String(sp.pubid).trim());
      }
      const newAutoAds = sp?.autoads === "1" ? "1" : "0";
      setSetting("ADSENSE_AUTO_ADS", newAutoAds);
    } catch {}
    redirect(`${backUrl}&flash=saved`);
  }

  const flash = sp?.flash || "";

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

      {/* Back-Button */}
      <Link href={`/admin?${pwQ}`} style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "8px 16px", borderRadius: 999,
        background: "#1c1c1e", color: "#fff",
        fontSize: 12.5, fontWeight: 700,
        textDecoration: "none",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        marginBottom: 14,
      }}>
        ← 👑 Zurück zum Cockpit
      </Link>

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

      {flash === "saved" && (
        <div style={{
          padding: "10px 14px", borderRadius: 10, marginBottom: 14,
          background: "rgba(16,185,129,0.12)", color: "#065f46",
          fontWeight: 700, fontSize: 13,
        }}>✓ Settings gespeichert. Coolify lädt in ~2 Min neu, dann greifen die Werte.</div>
      )}

      {/* Settings-Editor */}
      <h2 style={{ fontSize: 18, marginTop: 18, marginBottom: 10 }}>🛠 Provider-Konfiguration</h2>
      <form method="GET" action="/admin/werbung" style={{
        background: "#fff", border: "1px solid #e5e5e7", borderRadius: 14, padding: 18,
        display: "grid", gap: 14,
      }}>
        <input type="hidden" name="pw" value={pw} />
        <input type="hidden" name="do" value="save_settings" />

        <div>
          <label style={fieldLabel()}>Display-Provider</label>
          <select name="provider" defaultValue={provider} style={fieldInput()}>
            <option value="off">— Aus —</option>
            <option value="adsense">Google AdSense</option>
            <option value="ezoic">Ezoic</option>
            <option value="adsterra">Adsterra</option>
          </select>
        </div>

        <div>
          <label style={fieldLabel()}>ADSENSE_PUB_ID</label>
          <input
            name="pubid" type="text" defaultValue={pubId}
            placeholder="ca-pub-XXXXXXXXXXXXXXXX"
            style={{ ...fieldInput(), fontFamily: "monospace" }}
          />
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
            Format „ca-pub-…". Findest du in AdSense → Konto → Kontoinformationen.
          </div>
        </div>

        <div>
          <label style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 12px", background: "#fafafa", borderRadius: 10,
            fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}>
            <input type="checkbox" name="autoads" value="1" defaultChecked={autoAds} />
            <span>Auto-Ads aktiv (Google entscheidet automatisch wo Anzeigen erscheinen)</span>
          </label>
        </div>

        <button type="submit" style={{
          padding: "11px 22px", borderRadius: 10, justifySelf: "start",
          background: "linear-gradient(135deg, #10b981, #059669)", color: "#fff",
          border: "none", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
        }}>💾 Einstellungen speichern</button>
      </form>

      {/* Server-Check */}
      <h2 style={{ fontSize: 18, marginTop: 22, marginBottom: 10 }}>🔧 Server-Konfiguration</h2>
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

function fieldLabel() {
  return {
    display: "block",
    fontSize: 10, letterSpacing: 1, color: "#64748b",
    fontWeight: 800, textTransform: "uppercase", marginBottom: 4,
  };
}
function fieldInput() {
  return {
    width: "100%", padding: "10px 12px", borderRadius: 8,
    border: "1px solid #cbd5e1", fontSize: 13,
    fontFamily: "inherit", outline: "none", boxSizing: "border-box",
  };
}
