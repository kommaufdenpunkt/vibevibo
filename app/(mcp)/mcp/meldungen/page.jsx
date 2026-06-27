import { redirect } from "next/navigation";
import { getMcpUser } from "@/lib/modAuth";
import MeldungenClient from "@/components/mcp/MeldungenClient";

export const dynamic = "force-dynamic";

export default async function McpMeldungenPage() {
  const me = await getMcpUser();
  if (!me) redirect("/mcp/login");
  return <MeldungenClient />;
}
