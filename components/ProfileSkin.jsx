"use client";

import { useMemo } from "react";
import { scopeCss } from "@/lib/sanitizeCss";

export default function ProfileSkin({ css, children }) {
  const scoped = useMemo(() => (css ? scopeCss(css, ".vv-skin") : ""), [css]);
  return (
    <div className="vv-skin">
      {scoped && <style dangerouslySetInnerHTML={{ __html: scoped }} />}
      {children}
    </div>
  );
}
