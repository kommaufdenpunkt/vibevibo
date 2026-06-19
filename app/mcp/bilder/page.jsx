import { redirect } from "next/navigation";
import { getMcpUser } from "@/lib/modAuth";
import { getMcpDashboardStats } from "@/lib/db";
import McpPlaceholder from "@/components/mcp/McpPlaceholder";

export const dynamic = "force-dynamic";

export default async function McpBilderPage() {
  const me = await getMcpUser();
  if (!me) redirect("/mcp/login");
  const stats = getMcpDashboardStats();
  return (
    <McpPlaceholder
      user={me} stats={stats}
      title="🖼 Bilder-Moderation"
      icon="🖼"
      description="Profilbilder, Buschfunk-Bilder, Feed-Bilder, Kommentar-Bilder, Fotoalbum + Fidolin-Funde. Approve/Reject mit einem Tap, Drogen-Check, Pull/Lock damit nicht zwei Mods dasselbe Bild prüfen."
      comingNext
    />
  );
}
