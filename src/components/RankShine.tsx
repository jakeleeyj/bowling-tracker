"use client";

import { useEffect, useRef } from "react";

/**
 * Light play on the rank card: a slow tier-coloured sheen, plus a specular
 * highlight and slight tilt that follow your finger while you press it.
 */
export default function RankShine({ tierColor }: { tierColor: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const highlight = ref.current;
    const card = highlight?.parentElement;
    if (!highlight || !card) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    function move(e: PointerEvent) {
      const r = card!.getBoundingClientRect();
      const x = Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1);
      const y = Math.min(Math.max((e.clientY - r.top) / r.height, 0), 1);
      card!.style.transition = "transform 120ms ease-out";
      card!.style.transform = `perspective(800px) rotateX(${(0.5 - y) * 5}deg) rotateY(${(x - 0.5) * 7}deg)`;
      highlight!.style.setProperty("--x", `${x * 100}%`);
      highlight!.style.setProperty("--y", `${y * 100}%`);
      highlight!.style.opacity = "1";
    }
    function settle() {
      card!.style.transition = "transform 600ms var(--ease-spring)";
      card!.style.transform = "";
      highlight!.style.opacity = "0";
    }

    card.addEventListener("pointerdown", move);
    card.addEventListener("pointermove", move);
    card.addEventListener("pointerup", settle);
    card.addEventListener("pointerleave", settle);
    card.addEventListener("pointercancel", settle);
    return () => {
      card.removeEventListener("pointerdown", move);
      card.removeEventListener("pointermove", move);
      card.removeEventListener("pointerup", settle);
      card.removeEventListener("pointerleave", settle);
      card.removeEventListener("pointercancel", settle);
    };
  }, []);

  return (
    <>
      <div
        aria-hidden
        className={`animate-sheen pointer-events-none absolute inset-0 bg-[linear-gradient(105deg,transparent_42%,color-mix(in_srgb,currentColor_22%,transparent)_50%,transparent_58%)] bg-[length:250%_100%] bg-no-repeat ${tierColor}`}
      />
      <div
        ref={ref}
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_var(--x,50%)_var(--y,50%),color-mix(in_srgb,var(--color-text-primary)_14%,transparent),transparent_50%)] opacity-0 transition-opacity duration-300"
      />
    </>
  );
}
