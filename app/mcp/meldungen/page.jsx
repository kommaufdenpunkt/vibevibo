import { redirect } from "next/navigation";
import { getMcpUser } from "@/lib/modAuth";
import { getMcpDashboardStats } from "@/lib/db";
import McpPlaceholder from "@/components/mcp/McpPlaceholder";

export const dynamic = "force-dynamic";

export default async function McpMeldungenPage() {
  const me = await getMcpUser();
  if (!me) redirect("/mcp/login");
  const stats = getMcpDashboardStats();
  return (
    <McpPlaceholder
      user={me} stats={stats}
      title="🚩 Meldungen"
      icon="🚩"
      description="Hier listen wir bald alle Meldungen mit Pull/Lock-System, Filtern (Beleidigung, Voice, Bild, Drogen, Live), und One-Tap-Aktionen."
      comingNext
    />
  );
}
