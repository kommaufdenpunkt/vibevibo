// 💡 Admin-Wunsch-Verwaltung — Owner setzt Status, beantwortet öffentlich, pinned wichtige.

import Link from "next/link";
import { checkAdminPassword, adminEnabled } from "@/lib/admin";
import { listWishes, countWishesByStatus } from "@/lib/db";
import WishesAdminManager from "@/components/admin/WishesAdminManager";

export const dynamic = "force-dynamic";

export default async function AdminWuenschePage({ searchParams }) {
  const sp = await searchParams;
  const pw = typeof sp?.pw === "string" ? sp.pw : "";

  if (!adminEnabled() || !checkAdminPassword(pw)) {
    return (
      <div style={{ maxWidth: 420, margin: "60px auto", padding: 28, background: "#fff", borderRadius: 16, textAlign: "center" }}>
        <h2>🔐 Admin-Login</h2>
        <form method="GET" action="/admin/wuensche">
          <input type="password" name="pw" placeholder="Passwort" autoFocus
            style={{ width: "100%", padding: 12, borderRadius: 10, border: "1px solid #cbd5e1", marginTop: 12, fontFamily: "inherit" }} />
          <button type="submit" style={{
            marginTop: 12, padding: "10px 20px",
            background: "linear-gradient(135deg, #ec4899, #a855f7)", color: "#fff",
            border: "none", borderRadius: 10, fontWeight: 800, cursor: "pointer",
          }}>Anmelden</button>
        </form>
      </div>
    );
  }
  const pwQ = `pw=${encodeURIComponent(pw)}`;
  const statusFilter = typeof sp?.status === "string" ? sp.status : "open";
  const wishes = listWishes({ status: statusFilter === "all" ? null : statusFilter, sort: "new", limit: 200 });
  const counts = countWishesByStatus();

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 16px 60px", fontFamily: "system-ui, sans-serif" }}>
      <Link href={`/admin?${pwQ}`} style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "8px 16px", borderRadius: 999,
        background: "#1c1c1e", color: "#fff",
        fontSize: 12.5, fontWeight: 700, textDecoration: "none",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      }}>
        ← 👑 Zurück zum Cockpit
      </Link>
      <h1 style={{ margin: "14px 0 4px", fontSize: 28, fontWeight: 900, color: "#fff", textShadow: "0 2px 4px rgba(0,0,0,0.4)" }}>
        💡 Wunsch-Verwaltung
      </h1>
      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", marginTop: 0, marginBottom: 18, textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}>
        Status setzen, öffentlich antworten, wichtige pinnen.
      </p>

      <WishesAdminManager pw={pw} initialWishes={wishes} counts={counts} initialStatus={statusFilter} />
    </div>
  );
}
