// Admin Dashboard auf admin.vibevibo.de.
// Interner Pfad /adminpanel — extern admin.vibevibo.de/

import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/adminAuth";
import AdminLogoutButton from "@/components/admin/AdminLogoutButton";
import DevSeedTestImage from "@/components/admin/DevSeedTestImage";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin Dashboard — VibeVibo",
  robots: { index: false, follow: false },
};

function ToolCard({ href, color, icon, title, desc, disabled = false }) {
  const Comp = disabled ? "div" : "a";
  return (
    <Comp
      href={disabled ? undefined : href}
      style={{
        display: "block",
        padding: "18px 20px",
        background: `${color}10`,
        border: `1px solid ${color}30`,
        borderRadius: 16,
        color: "#f1f1f5",
        textDecoration: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 44, height: 44, borderRadius: 10,
        background: `linear-gradient(135deg, ${color}, ${color}aa)`,
        fontSize: 22, marginBottom: 12,
      }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12, color: "rgba(241,241,245,0.6)", lineHeight: 1.5 }}>{desc}</div>
      {disabled && (
        <div style={{
          marginTop: 8, padding: "3px 8px", display: "inline-block",
          background: "rgba(255,255,255,0.06)", borderRadius: 6,
          fontSize: 10, fontWeight: 700, color: "rgba(241,241,245,0.55)",
          letterSpacing: "0.05em",
        }}>BALD</div>
      )}
    </Comp>
  );
}

export default async function AdminDashboard() {
  const me = await getAdminUser();
  if (!me) redirect("/login");

  return (
    <div style={{ minHeight: "100vh", padding: "32px 24px", maxWidth: 960, margin: "0 auto" }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 32, paddingBottom: 20, borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: "linear-gradient(135deg, #dc2626 0%, #7f1d1d 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24, boxShadow: "0 8px 24px rgba(220,38,38,0.35)",
          }}>🛡️</div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#f8f8fb" }}>ADMIN</div>
            <div style={{ fontSize: 12, color: "rgba(241,241,245,0.55)" }}>VibeVibo Administration</div>
          </div>
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: 8, padding: "8px 14px",
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 999, fontSize: 12,
        }}>
          <span style={{ color: "rgba(241,241,245,0.55)" }}>@</span>
          <span style={{ color: "#f8f8fb", fontWeight: 600 }}>{me.username}</span>
          <span style={{
            marginLeft: 4, padding: "2px 8px",
            background: "linear-gradient(135deg, #f59e0b, #d97706)",
            borderRadius: 6, fontSize: 10, fontWeight: 800, color: "#fff",
            letterSpacing: "0.05em",
          }}>ADMIN</span>
        </div>
      </div>

      <div style={{
        padding: "32px 28px", background: "rgba(18,18,30,0.6)",
        border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, marginBottom: 24,
      }}>
        <h1 style={{
          margin: "0 0 12px", fontSize: 28, fontWeight: 800,
          background: "linear-gradient(135deg, #f8f8fb, #c4c4d8)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
        }}>
          Willkommen, {me.displayName || me.username}.
        </h1>
        <p style={{ margin: 0, color: "rgba(241,241,245,0.6)", fontSize: 14, lineHeight: 1.6 }}>
          Du bist auf <code style={{
            background: "rgba(255,255,255,0.06)", padding: "2px 6px", borderRadius: 4, fontSize: 12,
          }}>admin.vibevibo.de</code> — getrennt von <code style={{
            background: "rgba(255,255,255,0.06)", padding: "2px 6px", borderRadius: 4, fontSize: 12,
          }}>mcp.vibevibo.de</code>. Eigene Session, eigenes Cookie, eigene Audit-Spur.
        </p>
      </div>

      {/* Tools */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
        gap: 14, marginBottom: 24,
      }}>
        <ToolCard href="/broadcast" color="#fb923c" icon="📢" title="Broadcast-Editor" desc="Updates / Neuigkeiten an alle User schicken" />
        <ToolCard color="#7c3aed" icon="🛡" title="Sicherheits-Analyse" desc="Live-Status der Plattform" disabled />
        <ToolCard color="#10b981" icon="👥" title="User & Mod-Verwaltung" desc="Mods ernennen, Permissions setzen" disabled />
      </div>

      {/* Dev-Tools (klein, am Rand) */}
      <DevSeedTestImage />

      <div style={{ marginTop: 28, textAlign: "center" }}>
        <AdminLogoutButton />
      </div>
    </div>
  );
}
