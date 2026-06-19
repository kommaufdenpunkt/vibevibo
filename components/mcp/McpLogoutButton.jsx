"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function McpLogoutButton() {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function logout() {
    if (!confirm("Aus dem MCP abmelden?")) return;
    setBusy(true);
    try {
      await fetch("/api/mcp/auth", { method: "DELETE", credentials: "include" });
      router.push("/mcp/login");
      router.refresh();
    } finally { setBusy(false); }
  }
  return (
    <button onClick={logout} disabled={busy}
      className="mcp-btn mcp-btn-secondary mcp-btn-block"
      style={{ marginTop: 16, padding: 14, fontSize: 14 }}>
      {busy ? "⏳…" : "🔒 Abmelden"}
    </button>
  );
}
