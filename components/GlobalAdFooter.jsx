"use client";

// 📢 Globaler Footer-Werbeplatz — dezent, einmal pro Seite.
// Liest die aktuelle Route und blendet sich auf Ad-freien Zonen automatisch
// aus (Messenger, VIBO, Edit-Seiten, /neu, /admin, Login etc.).
// Werbung selbst kommt aus dem AdSlot (Adsterra/Ezoic je nach Admin-Setting).

import { usePathname } from "next/navigation";
import AdSlot from "@/components/AdSlot";

// Routen wo KEINE Werbung erscheint — entweder weil emotional/intim oder
// weil sie eh ihre eigene haben (z.B. Landing-Page mit Hero-Slot).
const AD_FREE_PREFIXES = [
  "/messenger",       // Chats — kein DM-mit-Werbung
  "/admin",           // Admin-Tools
  "/neu",             // Changelog
  "/installieren",    // App-Install-Guide
  "/login",           // Auth
  "/register",
  "/vibo",            // Pet — emotional
  "/profile/edit",    // Editor-Friction vermeiden
  "/profile/skin",
  "/profile/status",
  "/profile/transactions",
  "/messenger/manifest.webmanifest",
];

function isAdFree(path) {
  if (!path) return true;
  if (path === "/") return true; // Landing/Home — hat eigenen Slot in page.jsx
  for (const p of AD_FREE_PREFIXES) {
    if (path === p || path.startsWith(p + "/")) return true;
  }
  return false;
}

export default function GlobalAdFooter() {
  const pathname = usePathname();
  if (isAdFree(pathname)) return null;
  return (
    <div className="vv-global-ad-footer" role="complementary">
      <AdSlot slot="page-footer" format="auto" label="Werbung" />
    </div>
  );
}
