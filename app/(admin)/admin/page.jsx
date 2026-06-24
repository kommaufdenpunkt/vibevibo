// Admin Dashboard — Hauptseite für admin.vibevibo.de
// Skeleton (Phase 1) — zeigt nur Status + Platzhalter für Sicherheits-Analyse
// die in Phase 2 hierher migriert wird.

import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/adminAuth";
import AdminLogoutButton from "@/components/admin/AdminLogoutButton";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin Dashboard — VibeVibo",
  robots: { index: false, follow: false },
};

export default async function AdminDashboard() {
  const me = await getAdminUser();
  if (!me) redirect("/admin/login");

  return (
    <div style={{ minHeight: "100vh", padding: "32px 24px", maxWidth: 960, margin: "0 auto" }}>
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 32,
        paddingBottom: 20,
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: "linear-gradient(135deg, #dc2626 0%, #7f1d1d 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24,
            boxShadow: "0 8px 24px rgba(220,38,38,0.35)",
          }}>🛡️</div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#f8f8fb" }}>ADMIN</div>
            <div style={{ fontSize: 12, color: "rgba(241,241,245,0.55)" }}>
              VibeVibo Administration
            </div>
          </div>
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "8px 14px",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 999,
          fontSize: 12,
        }}>
          <span style={{ color: "rgba(241,241,245,0.55)" }}>@</span>
          <span style={{ color: "#f8f8fb", fontWeight: 600 }}>{me.username}</span>
          <span style={{
            marginLeft: 4,
            padding: "2px 8px",
            background: "linear-gradient(135deg, #f59e0b, #d97706)",
            borderRadius: 6,
            fontSize: 10,
            fontWeight: 800,
            color: "#fff",
            letterSpacing: "0.05em",
          }}>ADMIN</span>
        </div>
      </div>

      {/* Welcome Card */}
      <div style={{
        padding: "32px 28px",
        background: "rgba(18,18,30,0.6)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 20,
        marginBottom: 24,
      }}>
        <h1 style={{
          margin: "0 0 12px",
          fontSize: 28,
          fontWeight: 800,
          background: "linear-gradient(135deg, #f8f8fb, #c4c4d8)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}>
          Willkommen, {me.displayName || me.username}.
        </h1>
        <p style={{ margin: 0, color: "rgba(241,241,245,0.6)", fontSize: 14, lineHeight: 1.6 }}>
          Du bist auf <code style={{
            background: "rgba(255,255,255,0.06)",
            padding: "2px 6px",
            borderRadius: 4,
            fontSize: 12,
          }}>admin.vibevibo.de</code> — getrennt von <code style={{
            background: "rgba(255,255,255,0.06)",
            padding: "2px 6px",
            borderRadius: 4,
            fontSize: 12,
          }}>mcp.vibevibo.de</code>. Eigene Session, eigenes Cookie, eigene
          Audit-Spur. <strong>Sicherheits-Analyse</strong> kommt in Phase 2 hier rein.
        </p>
      </div>

      {/* Coming Soon */}
      <div style={{
        padding: "28px 26px",
        background: "linear-gradient(135deg, rgba(220,38,38,0.08), rgba(127,29,29,0.04))",
        border: "1px solid rgba(220,38,38,0.25)",
        borderRadius: 20,
        textAlign: "center",
      }}>
        <div style={{ fontSize: 42, marginBottom: 12 }}>🚧</div>
        <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 800, color: "#fca5a5" }}>
          Sicherheits-Analyse
        </h2>
        <p style={{ margin: "0 0 16px", color: "rgba(241,241,245,0.55)", fontSize: 13, lineHeight: 1.6 }}>
          Phase 2: Tool zum scannen + reporten von Sicherheitslücken auf<br />
          <code style={{ background: "rgba(255,255,255,0.06)", padding: "2px 6px", borderRadius: 4, fontSize: 12 }}>mcp.vibevibo.de</code>
          {" "}und der Gesamt-Plattform — läuft hier, getrennt von dem System das es überwacht.
        </p>
        <div style={{
          display: "inline-block",
          padding: "6px 14px",
          background: "rgba(255,255,255,0.06)",
          borderRadius: 999,
          fontSize: 11,
          fontWeight: 700,
          color: "rgba(241,241,245,0.55)",
          letterSpacing: "0.05em",
        }}>
          KOMMT MIT PHASE 2
        </div>
      </div>

      {/* Logout */}
      <div style={{ marginTop: 28, textAlign: "center" }}>
        <AdminLogoutButton />
      </div>
    </div>
  );
}
