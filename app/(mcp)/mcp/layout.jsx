// MCP-Layout: rendered die S8-Edge-Panels für den Mod-Bereich.
// Pages werfen weiter ihren eigenen mcp-app-Wrapper rein — diese
// Layout-Datei fügt nur die Edge-Panels hinzu (sie sind position:fixed
// und liegen mit höherem z-index über dem mcp-app-Overlay).

import { getMcpUser } from "@/lib/modAuth";
import McpEdgePanels from "@/components/mcp/McpEdgePanels";

export default async function McpLayout({ children }) {
  const me = await getMcpUser();
  return (
    <>
      {children}
      {me && (
        <McpEdgePanels
          user={{
            id: me.id,
            username: me.username,
            role: me.role,
          }}
        />
      )}
    </>
  );
}
