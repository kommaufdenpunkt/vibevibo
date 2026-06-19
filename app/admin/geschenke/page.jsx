// 🎁 Geschenke-Admin — Owner-Tool für Custom-Gifts.
// Auth läuft serverseitig, Manager-UI ist Client für Live-Editing + Upload.

import Link from "next/link";
import { checkAdminPassword, adminEnabled } from "@/lib/admin";
import {
  listCustomGifts, countCustomGifts, listGiftCategories,
} from "@/lib/db";
import GeschenkeManager from "@/components/admin/GeschenkeManager";

export const dynamic = "force-dynamic";

export default async function GeschenkeAdminPage({ searchParams }) {
  const sp = await searchParams;
  const pw = typeof sp?.pw === "string" ? sp.pw : "";

  if (!adminEnabled()) {
    return <div style={{ padding: 40, textAlign: "center" }}>Admin nicht konfiguriert.</div>;
  }
  if (!checkAdminPassword(pw)) {
    return (
      <div style={{ maxWidth: 420, margin: "60px auto", padding: 28, background: "#fff", borderRadius: 16, textAlign: "center" }}>
        <h2>🔐 Admin-Login</h2>
        <form method="GET" action="/admin/geschenke">
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

  const tab = ["all","limited","seasonal","categories"].includes(sp?.tab) ? sp.tab : "all";
  const filter = tab === "all" ? "all" : tab === "limited" ? "limited" : tab === "seasonal" ? "seasonal" : "all";
  const search = typeof sp?.q === "string" ? sp.q.trim() : "";

  const counts = countCustomGifts();
  const categories = listGiftCategories();
  const gifts = tab === "categories"
    ? []
    : listCustomGifts({ filter, search, limit: 500, includeInactive: true });

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "20px 16px 60px", fontFamily: "system-ui, sans-serif" }}>
      <Link href={`/admin?pw=${encodeURIComponent(pw)}`} style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "8px 16px", borderRadius: 999,
        background: "#1c1c1e", color: "#fff",
        fontSize: 12.5, fontWeight: 700,
        textDecoration: "none",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      }}>
        ← 👑 Zurück zum Cockpit
      </Link>
      <h1 style={{ margin: "14px 0 4px", fontSize: 28, fontWeight: 900, letterSpacing: -0.5 }}>
        🎁 Geschenke verwalten
      </h1>
      <p style={{ fontSize: 13, color: "#64748b", marginTop: 0, marginBottom: 18 }}>
        Eigene Geschenke hochladen (1× 512×512 PNG/WebP — wird überall passend skaliert).
        Limitiert oder saisonal markieren, Kategorien anlegen.
      </p>

      <GeschenkeManager
        pw={pw}
        tab={tab}
        search={search}
        counts={counts}
        gifts={gifts}
        categories={categories}
      />
    </div>
  );
}
