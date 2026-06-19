// 🚪 Stillgelegt — Admin wurde radikal auf 3 Bereiche reduziert.
// Alles Moderative läuft jetzt im MCP, alles andere im neuen Cockpit.

import { redirect } from "next/navigation";

export default async function LegacyAdminRedirect({ searchParams }) {
  const sp = await searchParams;
  const pw = typeof sp?.pw === "string" ? sp.pw : "";
  redirect(`/admin${pw ? `?pw=${encodeURIComponent(pw)}` : ""}`);
}
