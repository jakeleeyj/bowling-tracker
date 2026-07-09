"use client";

import { useRef, useState } from "react";
import type { Calibration, Pt } from "@/lib/lane/geometry";

// Grab a handle only within this distance (frame px) so a stray tap far from
// any corner doesn't teleport one.
const GRAB_RADIUS = 40;

export default function CalibrationOverlay({
  width,
  height,
  onDone,
  initial,
}: {
  width: number;
  height: number;
  onDone: (cal: Calibration) => void;
  initial?: Pt[];
}) {
  // Order: foul left, foul right, deck left, deck right.
  const [points, setPoints] = useState<Pt[]>(
    () =>
      initial ?? [
        { x: width * 0.15, y: height * 0.88 },
        { x: width * 0.85, y: height * 0.88 },
        { x: width * 0.38, y: height * 0.18 },
        { x: width * 0.62, y: height * 0.18 },
      ],
  );
  const dragIndex = useRef<number | null>(null);

  function toFrame(e: React.PointerEvent, el: HTMLElement): Pt {
    const rect = el.getBoundingClientRect();
    return {
      x: Math.min(
        width,
        Math.max(0, ((e.clientX - rect.left) / rect.width) * width),
      ),
      y: Math.min(
        height,
        Math.max(0, ((e.clientY - rect.top) / rect.height) * height),
      ),
    };
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const p = toFrame(e, e.currentTarget);
    let best = -1;
    let bestD = GRAB_RADIUS;
    points.forEach((pt, i) => {
      const d = Math.hypot(pt.x - p.x, pt.y - p.y);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    if (best === -1) return;
    dragIndex.current = best;
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const i = dragIndex.current;
    if (i === null) return;
    const p = toFrame(e, e.currentTarget);
    setPoints((prev) => prev.map((pt, idx) => (idx === i ? p : pt)));
  }

  function onPointerUp() {
    dragIndex.current = null;
  }

  return (
    <div
      className="absolute inset-0 z-10 touch-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-full w-full"
        preserveAspectRatio="none"
      >
        <polygon
          points={[points[0], points[1], points[3], points[2]]
            .map((p) => `${p.x},${p.y}`)
            .join(" ")}
          className="fill-blue/10 stroke-blue"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
        {points.map((p, i) => (
          <g key={i}>
            <circle
              cx={p.x}
              cy={p.y}
              r={11}
              className={i < 2 ? "fill-blue/30" : "fill-green/30"}
            />
            <circle
              cx={p.x}
              cy={p.y}
              r={5}
              className={i < 2 ? "fill-blue" : "fill-green"}
              stroke="white"
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
            />
          </g>
        ))}
      </svg>

      <div className="absolute left-1/2 top-2 w-[94%] max-w-sm -translate-x-1/2">
        <div className="glass flex items-center gap-2 p-2.5">
          <p className="flex-1 text-xs font-semibold leading-snug">
            Drag the corners onto the lane —{" "}
            <span className="text-blue">blue</span> on the foul line,{" "}
            <span className="text-green">green</span> on the pin deck
          </p>
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
        </div>
      </div>
    </div>
  );
}
