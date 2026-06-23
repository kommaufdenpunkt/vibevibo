// Hidet alles im DOM ausserhalb von .mcp-body-root.
// Geht agnostisch über die Sibling-Tree-Walk (kein Klassen-Name nötig).
// Inkl. MutationObserver — fängt auch später portalierte Elemente (z.B. Toasts).

"use client";

import { useEffect } from "react";

export default function McpChromeHider() {
  useEffect(() => {
    const mcp = document.querySelector(".mcp-body-root");
    if (!mcp) return;

    function hideOthers() {
      // Walk von .mcp-body-root nach oben Richtung <body>.
      // Auf jeder Ebene: alle Geschwister, die NICHT der Vorfahr von MCP sind, werden gehidet.
      let node = mcp;
      while (node && node.parentElement && node !== document.body) {
        const parent = node.parentElement;
        for (const sib of Array.from(parent.children)) {
          if (sib === node) continue;
          if (sib.dataset.mcpHidden === "1") continue;
          sib.dataset.mcpHidden = "1";
          sib.dataset.mcpPrevDisplay = sib.style.display || "";
          sib.style.display = "none";
        }
        node = parent;
      }
    }

    function unhideAll() {
      document.querySelectorAll("[data-mcp-hidden='1']").forEach((el) => {
        el.style.display = el.dataset.mcpPrevDisplay || "";
        delete el.dataset.mcpHidden;
        delete el.dataset.mcpPrevDisplay;
      });
    }

    hideOthers();

    // Beobachte neu hinzukommende Top-Level-Kinder (Portals, Toasts, Modals).
    const observer = new MutationObserver(() => hideOthers());
    observer.observe(document.body, { childList: true });
    observer.observe(document.documentElement, { childList: true });

    // Auch Body-Scroll lock & background, falls die globale CSS nicht greift.
    const prevOverflow = document.body.style.overflow;
    const prevBg = document.body.style.background;
    document.body.style.overflow = "hidden";
    document.body.style.background = "#060611";
    document.documentElement.classList.add("mcp-active");

    return () => {
      observer.disconnect();
      unhideAll();
      document.body.style.overflow = prevOverflow;
      document.body.style.background = prevBg;
      document.documentElement.classList.remove("mcp-active");
    };
  }, []);

  return null;
}
