// 🔒 Forensik-Export-Page — zeigt User-Info + Download-Knopf für JSON-Export.

import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { checkAdminPassword, adminEnabled } from "@/lib/admin";
import { getUserByUsername } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ForensikPage({ params, searchParams }) {
  const sp = await searchParams;
  const { username } = await params;
  const pw = typeof sp?.pw === "string" ? sp.pw : "";

  if (!adminEnabled() || !checkAdminPassword(pw)) {
    redirect(`/admin?pw=${encodeURIComponent(pw)}`);
  }
  const target = getUserByUsername(String(username).toLowerCase());
  if (!target) notFound();

  const pwQ = `pw=${encodeURIComponent(pw)}`;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "20px 16px 60px", fontFamily: "system-ui, sans-serif" }}>
      <Link href={`/admin/mitglieder/${encodeURIComponent(username)}?${pwQ}`} style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "8px 16px", borderRadius: 999,
        background: "#1c1c1e", color: "#fff",
        fontSize: 12.5, fontWeight: 700, textDecoration: "none",
      }}>
        ← Zurück zur Userakte
      </Link>

      <div style={{
        marginTop: 18, padding: 24, background: "#fff", borderRadius: 18,
        border: "2px solid #ef4444",
      }}>
        <h1 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 900, color: "#1c1c1e" }}>
          🔒 Forensik-Export für @{target.username}
        </h1>
        <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 18px", lineHeight: 1.5 }}>
          Generiert eine JSON-Datei mit ALLEN forensisch relevanten Daten dieses Users.
          Format ist für Polizei / Behörden vorbereitet (mit Rechtsgrundlagen-Hinweis).
        </p>

        <div style={{
          background: "#fef3c7", padding: 14, borderRadius: 10,
          border: "1px solid rgba(245,158,11,0.4)",
          fontSize: 13, color: "#78350f", lineHeight: 1.5, marginBottom: 18,
        }}>
          ⚠ <b>DSGVO-Vorgabe:</b> Dieser Export sollte NUR auf Anfrage einer Behörde
          oder bei akuter Selbst-/Fremdgefährdung erfolgen. Jeder Export wird im
          Audit-Log dokumentiert.
        </div>

        <div style={{ display: "grid", gap: 8, marginBottom: 18 }}>
          <ExportItem label="🪪 Personalien" desc="Name, Adresse, Geburtsdatum, Ausweis-Status" />
          <ExportItem label="📡 IPs & Geräte" desc="Alle bekannten IPs + Browser-Fingerprints + Login-Zeiten" />
          <ExportItem label="⚠ Sanktionen" desc="Banns, Mute, Mod-Log mit Zeitstempeln" />
          <ExportItem label="🚩 Reports gegen User" desc="Alle Meldungen anderer User" />
          <ExportItem label="🔗 Verwandte Accounts" desc="Multi-Account-Detector (gleiche IPs)" />
        </div>

        <a href={`/api/admin/forensik/${encodeURIComponent(target.username)}?${pwQ}`}
          style={{
            display: "block", padding: "14px 22px",
            background: "linear-gradient(135deg, #ef4444, #b91c1c)",
            color: "#fff", textDecoration: "none",
            borderRadius: 12, textAlign: "center",
            fontWeight: 800, fontSize: 14,
          }}>
          📦 Forensik-JSON herunterladen
        </a>

        <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 14, textAlign: "center" }}>
          Datei wird auf deinen Rechner geladen. Per E-Mail an Polizei weiterleiten
          oder bei Anfrage direkt übergeben.
        </p>
      </div>
    </div>
  );
}

function ExportItem({ label, desc }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "10px 14px", background: "#fafafa", borderRadius: 10,
    }}>
      <span style={{
        width: 22, height: 22, borderRadius: 999,
        background: "#10b981", color: "#fff",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 900, fontSize: 12, flexShrink: 0,
      }}>✓</span>
      <div>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#1c1c1e" }}>{label}</div>
        <div style={{ fontSize: 11, color: "#64748b" }}>{desc}</div>
      </div>
    </div>
  );
}
