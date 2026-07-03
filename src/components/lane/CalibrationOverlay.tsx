"use client";

import { useState } from "react";
import { Undo2 } from "lucide-react";
import type { Calibration, Pt } from "@/lib/lane/geometry";

const STEPS = [
  { key: "foulLeft", label: "Tap the FOUL LINE — left corner" },
  { key: "foulRight", label: "Tap the FOUL LINE — right corner" },
  { key: "deckLeft", label: "Tap the PIN DECK — left corner" },
  { key: "deckRight", label: "Tap the PIN DECK — right corner" },
] as const;

export default function CalibrationOverlay({
  width,
  height,
  onDone,
}: {
  width: number;
  height: number;
  onDone: (cal: Calibration) => void;
}) {
  const [points, setPoints] = useState<Pt[]>([]);

  function handleTap(e: React.PointerEvent<HTMLDivElement>) {
    if (points.length >= 4) return;
    const rect = e.currentTarget.getBoundingClientRect();
    // Map screen tap into detection-frame pixel space
    const p: Pt = {
      x: ((e.clientX - rect.left) / rect.width) * width,
      y: ((e.clientY - rect.top) / rect.height) * height,
    };
    setPoints((prev) => [...prev, p]);
  }

  const done = points.length === 4;

  return (
    <div className="absolute inset-0 z-10" onPointerDown={handleTap}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-full w-full"
        preserveAspectRatio="none"
      >
        {points.length >= 2 && (
          <polygon
            points={[points[0], points[1], points[3] ?? points[1], points[2] ?? points[0]]
              .filter(Boolean)
              .map((p) => `${p.x},${p.y}`)
              .join(" ")}
            className="fill-blue/10 stroke-blue"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
        )}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={6} className="fill-blue" />
        ))}
      </svg>

      <div className="absolute bottom-6 left-1/2 w-[90%] max-w-sm -translate-x-1/2">
        <div className="glass flex items-center gap-2 p-3">
          <p className="flex-1 text-sm font-semibold">
            {done ? "Lane calibrated" : STEPS[points.length].label}
          </p>
          {points.length > 0 && !done && (
            <button
              onPointerDown={(e) => {
                e.stopPropagation();
                setPoints((prev) => prev.slice(0, -1));
              }}
              aria-label="Undo last point"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-text-muted"
            >
              <Undo2 size={16} />
            </button>
          )}
          {done && (
            <button
              onPointerDown={(e) => {
                e.stopPropagation();
                onDone({
                  foulLeft: points[0],
                  foulRight: points[1],
                  deckLeft: points[2],
                  deckRight: points[3],
                });
              }}
              className="rounded-full bg-blue px-4 py-2 text-sm font-bold text-white"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
