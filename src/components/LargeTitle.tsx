"use client";

import { useEffect, useRef, useState } from "react";

const LARGE_TITLE_CLASS =
  "text-[28px] leading-[34px] font-extrabold tracking-tight";

/**
 * iOS-style large title: once it scrolls under the top edge, a compact bar
 * with the same title fades in (mobile only).
 */
export default function LargeTitle({
  title,
  children,
  className = "",
}: {
  title: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLHeadingElement>(null);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) =>
      setCompact(!entry.isIntersecting && entry.boundingClientRect.top < 0),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <h1 ref={ref} className={`${LARGE_TITLE_CLASS} ${className}`}>
        {children ?? title}
      </h1>
      <div
        aria-hidden
        className={`fixed inset-x-0 top-0 z-40 mx-auto max-w-[480px] border-b border-border bg-base/90 pt-[env(safe-area-inset-top)] transition-[opacity,transform] duration-300 lg:hidden ${
          compact
            ? "translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-2 opacity-0"
        }`}
      >
        <p className="truncate px-12 py-3 text-center text-[15px] font-bold text-text-primary">
          {title}
        </p>
      </div>
    </>
  );
}
