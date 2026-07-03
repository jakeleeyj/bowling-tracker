"use client";

import type { Pt } from "@/lib/lane/geometry";

export default function PathOverlay({
  points,
  width,
  height,
}: {
  points: Pt[];
  width: number;
  height: number;
}) {
  if (points.length < 2) return null;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      <polyline
        points={points.map((p) => `${p.x},${p.y}`).join(" ")}
        fill="none"
        className="stroke-blue"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
