import { redirect } from "next/navigation";
import { getMcpUser } from "@/lib/modAuth";
import { getMcpDashboardStats } from "@/lib/db";
import McpPlaceholder from "@/components/mcp/McpPlaceholder";

export const dynamic = "force-dynamic";

export default async function McpAktePage() {
  const me = await getMcpUser();
  if (!me) redirect("/mcp/login");
  const stats = getMcpDashboardStats();
  return (
    <McpPlaceholder
      user={me} stats={stats}
      title="📋 Akte & Audit"
      icon="📋"
      description={'Akten der User mit Strikes, Sanktionen, gelöschte Beiträge. Audit-Trail aller Mod-Aktionen (Teamleitungen sehen alles). HINWEIS: Normale Mods können weder ihre eigene Akte noch die Akten anderer Mods einsehen.'}
      comingNext
    />
  );
}
