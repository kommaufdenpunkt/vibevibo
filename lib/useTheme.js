"use client";

// Theme-Verwaltung: persistiert die Auswahl in localStorage und setzt
// data-theme="light"|"dark" auf <html>. "system" folgt dem OS-Setting
// (prefers-color-scheme). Wird auch beim ersten Render synchron aus
// localStorage gelesen, damit kein Blitzen entsteht.
//
// DEFAULT: "dark" — angenehmer für die Augen. Wer das umstellen will,
// kann das im Shop unter Themes nach Wunsch ändern (Light, System,
// oder eines der speziellen Themes).
import { useCallback, useEffect, useState } from "react";

const KEY = "vv:theme";
const VALID = new Set(["light", "dark", "system"]);
const DEFAULT = "dark";

function apply(value) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (value === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", value);
  }
}

function readInitial() {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const v = localStorage.getItem(KEY);
    return VALID.has(v) ? v : DEFAULT;
  } catch { return DEFAULT; }
}

export function useTheme() {
  const [theme, setTheme] = useState(readInitial);

  useEffect(() => { apply(theme); }, [theme]);

  const change = useCallback((value) => {
    if (!VALID.has(value)) value = DEFAULT;
    setTheme(value);
    try { localStorage.setItem(KEY, value); } catch {}
    apply(value);
  }, []);

  return [theme, change];
}

// Inline-Script (siehe app/layout.jsx): wendet das gespeicherte Theme so früh
// wie möglich an, damit es beim ersten Paint schon stimmt.
// Wenn nichts gespeichert ist → Dark als Default (angenehmer für die Augen).
export const THEME_BOOTSTRAP = `
  (function(){
    try {
      var t = localStorage.getItem('${KEY}') || '${DEFAULT}';
      if (t === 'light' || t === 'dark') {
        document.documentElement.setAttribute('data-theme', t);
      }
    } catch (e) {
      document.documentElement.setAttribute('data-theme', '${DEFAULT}');
    }
  })();
`;
