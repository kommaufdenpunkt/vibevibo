// 🛡 Sicherheits-Analyse — MIGRIERT nach admin.vibevibo.de.
// Diese Page existiert nur noch als Redirect, damit alte Lesezeichen / Links
// von Teamleitung+ nicht ins Leere laufen.

import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sicherheits-Analyse — umgezogen",
  robots: { index: false, follow: false },
};

export default function McpSicherheitRedirectPage() {
  redirect("https://admin.vibevibo.de/sicherheit");
}
