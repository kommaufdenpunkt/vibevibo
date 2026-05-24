"use client";

import { useState } from "react";
import { SMILEYS } from "@/lib/smileys";

export default function SmileyPicker({ onPick }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        className="vv-btn"
        onClick={() => setOpen((o) => !o)}
        aria-label="Smileys"
        title="Smileys"
      >
        😊
      </button>
      {open && (
        <div className="vv-smiley-picker vv-mt-8">
          {SMILEYS.map((s, i) => (
            <button
              key={i}
              type="button"
              className="vv-smiley"
              onClick={() => {
                onPick(s);
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
