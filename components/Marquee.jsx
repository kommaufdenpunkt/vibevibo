"use client";

import { useEffect, useRef } from "react";

// CSS-Marquee Ersatz für das alte <marquee>-Tag
export default function Marquee({ children, speed = 40 }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let x = el.parentElement.clientWidth;
    let raf;
    const inner = el;
    const step = () => {
      x -= speed / 60;
      if (x < -inner.scrollWidth) x = el.parentElement.clientWidth;
      inner.style.transform = `translateX(${x}px)`;
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [speed]);

  return (
    <div className="vv-marquee">
      <div ref={ref} style={{ display: "inline-block", whiteSpace: "nowrap" }}>
        {children}
      </div>
    </div>
  );
}
