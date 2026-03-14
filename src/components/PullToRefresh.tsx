"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BowlingSpinner } from "@/components/Skeleton";

export default function PullToRefresh({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const isPulling = useRef(false);

  const THRESHOLD = 80;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isPulling.current || refreshing) return;
      const diff = e.touches[0].clientY - startY.current;
      if (diff > 0) {
        setPulling(true);
        setPullDistance(Math.min(diff * 0.4, THRESHOLD + 20));
      }
    },
    [refreshing],
  );

  const handleTouchEnd = useCallback(() => {
    if (!isPulling.current) return;
    isPulling.current = false;

    if (pullDistance >= THRESHOLD) {
      setRefreshing(true);
      setPullDistance(THRESHOLD * 0.5);
      router.refresh();
      setTimeout(() => {
        setRefreshing(false);
        setPulling(false);
        setPullDistance(0);
      }, 1000);
    } else {
      setPulling(false);
      setPullDistance(0);
    }
  }, [pullDistance, router]);

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {(pulling || refreshing) && (
        <div
          className="flex items-center justify-center overflow-hidden transition-[height] duration-200"
          style={{ height: pullDistance }}
        >
          {refreshing ? (
            <BowlingSpinner size="sm" />
          ) : (
            <div
              className="text-text-muted transition-transform"
              style={{
                opacity: Math.min(pullDistance / THRESHOLD, 1),
                transform: `rotate(${(pullDistance / THRESHOLD) * 180}deg)`,
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M12 5v14M5 12l7-7 7 7" />
              </svg>
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
