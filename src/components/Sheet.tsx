"use client";

import { useEffect, useRef, useState } from "react";

const DISMISS_DISTANCE = 90;

/** iOS-style bottom sheet: slides up, drag the handle down to dismiss */
export default function Sheet({
  open,
  onClose,
  labelledBy,
  children,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  children: React.ReactNode;
}) {
  const [present, setPresent] = useState(open);
  const [drag, setDrag] = useState<number | null>(null);
  if (open && !present) {
    setPresent(true);
    setDrag(null);
  }
  const leaving = present && !open;

  const startY = useRef(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const returnFocus = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    html.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCloseRef.current();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      html.style.overflow = prevOverflow;
      returnFocus?.focus();
    };
  }, [open]);

  if (!present) return null;

  function endDrag() {
    // Keep the dragged offset when dismissing so the exit starts from there
    if (drag !== null && drag > DISMISS_DISTANCE) onClose();
    else setDrag(null);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center lg:items-center lg:p-4">
      <div
        className={`absolute inset-0 bg-base/70 backdrop-blur-sm ${leaving ? "animate-fade-out" : "animate-fade-in"}`}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        onAnimationEnd={(e) => {
          if (leaving && e.target === e.currentTarget) setPresent(false);
        }}
        style={{
          transform: drag !== null ? `translateY(${drag}px)` : undefined,
          transition: drag !== null ? "none" : undefined,
        }}
        className={`glass-strong relative max-h-[85dvh] w-full max-w-[480px] overflow-y-auto rounded-t-3xl bg-surface/95 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] outline-none transition-transform duration-500 ease-spring lg:max-w-[420px] lg:rounded-3xl lg:pt-5 ${leaving ? "animate-sheet-out" : "animate-sheet-in"}`}
      >
        <div
          className="flex cursor-grab touch-none justify-center pb-3 pt-2.5 lg:hidden"
          onPointerDown={(e) => {
            startY.current = e.clientY;
            setDrag(0);
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (drag === null || leaving) return;
            const dy = e.clientY - startY.current;
            // Rubber-band when pulled up past the resting point
            setDrag(dy > 0 ? dy : dy / 4);
          }}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <span className="h-1.5 w-10 rounded-full bg-white/20" />
        </div>
        {children}
      </div>
    </div>
  );
}
