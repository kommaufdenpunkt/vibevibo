// 🖼 Bildertool — Instagram-Style Feed für Mod-Image-Moderation
// Ersetzt den alten Placeholder. Zeigt pending Bilder als großes Feed,
// Approve/Reject mit Templates pro Bild.

import { redirect } from "next/navigation";
import { getMcpUser } from "@/lib/modAuth";
import BildertoolClient from "./BildertoolClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "🖼 Bildertool — MCP",
  robots: { index: false, follow: false },
};

export default async function McpBilderPage() {
  const me = await getMcpUser();
  if (!me) redirect("/mcp/login");
  return <BildertoolClient />;
}
