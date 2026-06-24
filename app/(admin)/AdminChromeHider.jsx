// Hidet alles im DOM ausserhalb von .admin-body-root.
// Analog zum McpChromeHider — sorgt dafür dass admin.vibevibo.de keine
// vibevibo.de Chrome-Elemente zeigt (Coms-Bar, Banner, Footer, Edge-Panels).

"use client";

import { useEffect } from "react";

export default function AdminChromeHider() {
  useEffect(() => {
    const root = document.querySelector(".admin-body-root");
    if (!root) return;

    function hideOthers() {
      let node = root;
      while (node && node.parentElement && node !== document.body) {
        const parent = node.parentElement;
        for (const sib of Array.from(parent.children)) {
          if (sib === node) continue;
          if (sib.dataset.adminHidden === "1") continue;
          sib.dataset.adminHidden = "1";
          sib.dataset.adminPrevDisplay = sib.style.display || "";
          sib.style.display = "none";
        }
        node = parent;
      }
    }

    function unhideAll() {
      document.querySelectorAll("[data-admin-hidden='1']").forEach((el) => {
        el.style.display = el.dataset.adminPrevDisplay || "";
        delete el.dataset.adminHidden;
        delete el.dataset.adminPrevDisplay;
      });
    }

    hideOthers();

    const observer = new MutationObserver(() => hideOthers());
    observer.observe(document.body, { childList: true });
    observer.observe(document.documentElement, { childList: true });

    const prevOverflow = document.body.style.overflow;
    const prevBg = document.body.style.background;
    document.body.style.overflow = "hidden";
    document.body.style.background = "#040408";
    document.documentElement.classList.add("admin-active");

    return () => {
      observer.disconnect();
      unhideAll();
      document.body.style.overflow = prevOverflow;
      document.body.style.background = prevBg;
      document.documentElement.classList.remove("admin-active");
    };
  }, []);

  return null;
}
