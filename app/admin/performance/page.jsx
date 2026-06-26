// 🚀 Performance-Diagnose — Cookie-Auth (kein URL-?pw= mehr!).
// Owner kann SQLite + Server-Settings analysieren + optimieren.
//
// Migration aus altem ?pw=...-Verfahren: wenn die URL noch ein ?pw enthält,
// validieren wir es ein letztes Mal, setzen das Cookie und redirecten auf die
// saubere URL ohne Query — danach läuft alles über Cookie.

import { redirect } from "next/navigation";
import Link from "next/link";
import {
  checkAdminPassword, adminEnabled, isAdmin, setAdminCookie,
} from "@/lib/admin";
import PerformanceDashboard from "@/components/admin/PerformanceDashboard";
import AdminLoginForm from "@/components/admin/AdminLoginForm";

export const dynamic = "force-dynamic";

export default async function PerformancePage({ searchParams }) {
  if (!adminEnabled()) {
    return (
      <div style={loginBoxStyle}>
        <h2 style={{ margin: 0, color: "#fff" }}>🔐 Admin-Bereich deaktiviert</h2>
        <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 12 }}>
          Setze die env var <code style={codeStyle}>VV_ADMIN_PASSWORD</code> in Coolify, damit der Admin-Bereich aktiv wird.
        </p>
      </div>
    );
  }

  const sp = await searchParams;
  const legacyPw = typeof sp?.pw === "string" ? sp.pw : "";

  // 🧹 Migration aus alter URL-?pw=-Methode: einmalig Cookie setzen + redirect.
  if (legacyPw && checkAdminPassword(legacyPw)) {
    await setAdminCookie();
    redirect("/admin/performance");
  }

  // Cookie-Check
  if (!(await isAdmin())) {
    return (
      <div style={loginBoxStyle}>
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 32, marginBottom: 6 }}>🔐</div>
          <h2 style={{ margin: 0, color: "#fff", fontSize: 20 }}>Admin-Login</h2>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 6 }}>
            Performance-Diagnose · Cookie-basiert (kein Passwort in URL).
          </p>
        </div>
        <AdminLoginForm next="/admin/performance" />
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: 1080, margin: "0 auto",
      padding: "20px 16px 60px",
      fontFamily: "system-ui, sans-serif",
      color: "#fff",
    }}>
      <Link href="/admin" style={backLinkStyle}>
        ← 👑 Zurück zum Cockpit
      </Link>
      <h1 style={{
        margin: "14px 0 4px", fontSize: 28, fontWeight: 900,
        color: "#fff", textShadow: "0 2px 4px rgba(0,0,0,0.4)",
      }}>
        🚀 Performance-Diagnose
      </h1>
      <p style={{
        fontSize: 13, color: "rgba(255,255,255,0.85)",
        marginTop: 0, marginBottom: 18,
        textShadow: "0 1px 2px rgba(0,0,0,0.3)",
      }}>
        Analyse + automatische Optimierung von SQLite, Cache, Query-Performance.
      </p>
      <PerformanceDashboard />
    </div>
  );
}

const loginBoxStyle = {
  maxWidth: 420, margin: "60px auto", padding: 28,
  background: "rgba(18,18,30,0.9)",
  backdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
  boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
};

const codeStyle = {
  background: "rgba(255,255,255,0.08)",
  padding: "2px 6px", borderRadius: 4,
  fontSize: 12, fontFamily: "ui-monospace, Menlo, monospace",
};

const backLinkStyle = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "8px 16px", borderRadius: 999,
  background: "#1c1c1e", color: "#fff",
  fontSize: 12.5, fontWeight: 700,
  textDecoration: "none",
  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
};
