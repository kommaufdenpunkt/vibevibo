"use client";

import { useState } from "react";
import { STICKER_CATS } from "@/lib/smileys";

export default function SmileyPicker({ onPick }) {
  const [open, setOpen] = useState(false);
  const [cat, setCat] = useState(STICKER_CATS[0].key);

  const current = STICKER_CATS.find((c) => c.key === cat) || STICKER_CATS[0];

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        className="vv-btn"
        onClick={() => setOpen((o) => !o)}
        aria-label="Smileys & Sticker"
        title="Smileys & Sticker"
      >
        😊
      </button>
      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 30 }}
            aria-hidden="true"
          />
          <div style={{
            position: "absolute", bottom: "100%", left: 0, marginBottom: 6,
            width: "min(320px, 90vw)", height: 280,
            background: "#fff", borderRadius: 12, zIndex: 31,
            boxShadow: "0 12px 32px rgba(0,0,0,0.26)",
            fontFamily: "Arial, sans-serif", overflow: "hidden",
            display: "flex", flexDirection: "column",
          }}>
            {/* Kategorien-Tabs */}
            <div style={{ display: "flex", gap: 2, padding: 4, background: "#f6f6fa", overflowX: "auto" }}>
              {STICKER_CATS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setCat(c.key)}
                  title={c.label}
                  style={{
                    minWidth: 38, padding: "5px 8px",
                    background: c.key === cat ? "#fff" : "transparent",
                    border: "none", borderRadius: 8, cursor: "pointer",
                    fontSize: 14, boxShadow: c.key === cat ? "0 1px 3px rgba(0,0,0,0.15)" : "none",
                  }}
                >{c.icon}</button>
              ))}
            </div>
            <div style={{ padding: 6, overflowY: "auto", display: "flex", flexWrap: "wrap", gap: 2, flex: 1 }}>
              {current.items.map((s, i) => {
                const isText = s.length > 3 || /[a-zäöü*()<>:;_^.-]/i.test(s);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => { onPick(s); }}
                    title={s}
                    style={{
                      minWidth: isText ? 0 : 34, padding: isText ? "4px 8px" : 4,
                      background: "#fff", border: "1px solid transparent",
                      borderRadius: 6, cursor: "pointer",
                      fontSize: isText ? 12 : 20, lineHeight: 1.2,
                      maxWidth: "100%", textAlign: "left",
                    }}
                  >{s}</button>
                );
              })}
            </div>
            <div style={{ padding: "4px 8px", borderTop: "1px solid #eee", fontSize: 10, color: "#888", textAlign: "right" }}>
              {current.label}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
