"use client";

import type { Pt, Rect } from "@/lib/lane/geometry";

export default function PathOverlay({
  points,
  width,
  height,
  view = { x: 0, y: 0, w: width, h: height },
}: {
  points: Pt[];
  width: number;
  height: number;
  /** Part of the frame on screen (the crop), in frame px */
  view?: Rect;
}) {
  if (points.length < 2) return null;
  return (
    <svg
      viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
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
