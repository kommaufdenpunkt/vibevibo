import { redirect } from "next/navigation";
import { getMcpUser } from "@/lib/modAuth";
import { getMcpDashboardStats } from "@/lib/db";
import McpPlaceholder from "@/components/mcp/McpPlaceholder";

export const dynamic = "force-dynamic";

export default async function McpTicketsPage() {
  const me = await getMcpUser();
  if (!me) redirect("/mcp/login");
  const stats = getMcpDashboardStats();
  return (
    <McpPlaceholder
      user={me} stats={stats}
      title="🎫 Tickets"
      icon="🎫"
      description={'User-Hilfetickets vom ❓ Hilfebutton. Antworten erscheinen beim User als "VibeVibo-Team" (anonym). Pull/Lock damit nur ein Mod gleichzeitig bearbeitet.'}
      comingNext
    />
  );
}
