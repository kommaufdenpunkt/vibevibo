// Route-Group Layout für admin.vibevibo.de
// Analog zu (mcp): kein eigenes <html>/<body>, sondern wrapped Children
// in einem position:fixed Overlay-Div, das die vibevibo.de Root-Chrome
// überdeckt. Zusätzlich rendert es die S8-Edge-Panels für Admin-Nav.

import AdminChromeHider from "./AdminChromeHider";
import AdminEdgePanels from "@/components/admin/AdminEdgePanels";
import { getAdminUser } from "@/lib/adminAuth";

export const metadata = {
  title: "Admin — VibeVibo",
  description: "Admin-Panel — nur für Admins.",
  robots: { index: false, follow: false },
};

export const viewport = {
  themeColor: "#040408",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default async function AdminLayout({ children }) {
  const me = await getAdminUser();
  return (
    <div
      className="admin-body-root"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483647,
        overflow: "auto",
        background: "#040408",
        color: "#f1f1f5",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif",
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
        colorScheme: "dark",
      }}
    >
      <AdminChromeHider />
      {children}
      {me && (
        <AdminEdgePanels
          user={{ id: me.id, username: me.username, role: me.role }}
        />
      )}
    </div>
  );
}
