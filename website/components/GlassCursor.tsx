"use client";

import { useEffect, useRef } from "react";

export default function GlassCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const root = document.documentElement;
    const cursor = cursorRef.current;
    if (!cursor) return;

    root.classList.add("has-glass-cursor");
    let frame: number | null = null;
    let x = 0;
    let y = 0;

    const render = () => {
      frame = null;
      cursor.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      cursor.style.opacity = "1";
    };

    const handlePointerMove = (event: PointerEvent) => {
      x = event.clientX;
      y = event.clientY;
      if (frame === null) frame = requestAnimationFrame(render);
    };

    const hide = () => {
      cursor.style.opacity = "0";
    };

    window.addEventListener("pointermove", handlePointerMove, {
      passive: true,
    });
    window.addEventListener("blur", hide);
    document.documentElement.addEventListener("mouseleave", hide);

    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("blur", hide);
      document.documentElement.removeEventListener("mouseleave", hide);
      root.classList.remove("has-glass-cursor");
    };
  }, []);

  return <div ref={cursorRef} className="glass-cursor" aria-hidden="true" />;
}
