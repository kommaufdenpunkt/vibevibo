// 🖼 Bildertool — Instagram-Style Feed für Mod-Image-Moderation
// Server-Wrapper sorgt jetzt für die Standard-MCP-Chrome (BottomNav) damit
// man von hier sauber zu anderen Tools navigieren kann.

import { redirect } from "next/navigation";
import { getMcpUser } from "@/lib/modAuth";
import { getMcpDashboardStats } from "@/lib/db";
import McpBottomNav from "@/components/mcp/McpBottomNav";
import BildertoolClient from "./BildertoolClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "🖼 Bildertool — MCP",
  robots: { index: false, follow: false },
};

export default async function McpBilderPage() {
  const me = await getMcpUser();
  if (!me) redirect("/mcp/login");
  const stats = getMcpDashboardStats();
  return (
    <>
      <BildertoolClient />
      <McpBottomNav stats={stats} />
    </>
  );
}
