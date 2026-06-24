// 📋 Userakte-Detail-Page (pro User).
// Zeigt aktuell die Bild-Akte (rejected Bilder mit Grund + Datum).
// Mod muss vor Zugriff einen Grund eingeben (AkteAccessGate).
//
// Phase 2 (später): Weitere Akte-Bereiche — Sanktionen, gelöschte Beiträge,
// Voice-Verstöße, IP-Historie.

import { redirect, notFound } from "next/navigation";
import { getMcpUser } from "@/lib/modAuth";
import { getUserById, getMcpDashboardStats } from "@/lib/db";
import AkteAccessGate from "@/components/mcp/AkteAccessGate";
import UserAkteImageGallery from "@/components/mcp/UserAkteImageGallery";
import McpBottomNav from "@/components/mcp/McpBottomNav";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Userakte — MCP",
  robots: { index: false, follow: false },
};

export default async function McpUserAktePage({ params }) {
  const me = await getMcpUser();
  if (!me) redirect("/mcp/login");

  const { userId: userIdRaw } = await params;
  const userId = Number(userIdRaw);
  if (!Number.isInteger(userId) || userId <= 0) notFound();

  const target = typeof getUserById === "function" ? getUserById(userId) : null;
  const stats = getMcpDashboardStats();

  return (
    <>
      <div className="mcp-app" style={{ paddingBottom: 100 }}>
        <div className="mcp-header">
          <div className="mcp-header-row">
            <div className="mcp-brand">
              <div className="mcp-brand-mark">📋</div>
              <div className="mcp-brand-text">
                USERAKTE
                <small>#{userId}{target ? ` · @${target.username}` : ""}</small>
              </div>
            </div>
          </div>
        </div>

        <div className="mcp-content" style={{ paddingTop: 8 }}>
          <AkteAccessGate userId={userId} username={target?.username || `user#${userId}`}>
            <UserAkteImageGallery userId={userId} username={target?.username} />

            <div style={{
              marginTop: 24, padding: "12px 14px",
              background: "rgba(124,58,237,0.06)",
              border: "1px dashed rgba(124,58,237,0.3)",
              borderRadius: 10,
              fontSize: 12, color: "rgba(241,241,245,0.65)",
              lineHeight: 1.6,
            }}>
              💡 Phase 2 (geplant): Sanktions-Historie, gelöschte Posts, Voice-Verstöße,
              IP-Historie. Aktuell sichtbar nur die Bild-Akte.
            </div>
          </AkteAccessGate>
        </div>
      </div>
      <McpBottomNav stats={stats} />
    </>
  );
}
