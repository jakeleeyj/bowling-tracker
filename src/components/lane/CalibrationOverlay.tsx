"use client";

import { useRef, useState } from "react";
import type { Calibration, Pt, Rect } from "@/lib/lane/geometry";

// Grab a handle only within this distance (frame px) so a stray tap far from
// any corner doesn't teleport one.
const GRAB_RADIUS = 40;
const LOUPE_PX = 120; // magnifier size on screen
const LOUPE_ZOOM = 3; // relative to the view on screen

export default function CalibrationOverlay({
  width,
  height,
  onDone,
  initial,
  view = { x: 0, y: 0, w: width, h: height },
  video,
}: {
  width: number;
  height: number;
  onDone: (cal: Calibration) => void;
  initial?: Pt[];
  /** Part of the frame on screen (the crop), in frame px */
  view?: Rect;
  /** Source for the magnifier while dragging a corner */
  video?: HTMLVideoElement | null;
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
  const loupeRef = useRef<HTMLCanvasElement | null>(null);
  const [loupeAt, setLoupeAt] = useState<{ left: number; top: number } | null>(
    null,
  );
  // Handles keep the same size on screen however far the view is zoomed
  const unit = view.w / width;

  // Magnify the video around a corner so its edge can be placed exactly
  function showLoupe(p: Pt, el: HTMLElement) {
    const canvas = loupeRef.current;
    const r = el.getBoundingClientRect();
    if (!video || !canvas || video.videoWidth === 0) return;
    const sx = video.videoWidth / width;
    const sy = video.videoHeight / height;
    // Frame px covered by the loupe at LOUPE_ZOOM times the on-screen size
    const span = ((LOUPE_PX / r.width) * view.w) / LOUPE_ZOOM;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Clip the source to the video (Safari draws nothing past its edges)
    const x0 = Math.max(0, p.x - span / 2);
    const y0 = Math.max(0, p.y - span / 2);
    const x1 = Math.min(width, p.x + span / 2);
    const y1 = Math.min(height, p.y + span / 2);
    const k = canvas.width / span;
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(
      video,
      x0 * sx,
      y0 * sy,
      (x1 - x0) * sx,
      (y1 - y0) * sy,
      (x0 - (p.x - span / 2)) * k,
      (y0 - (p.y - span / 2)) * k,
      (x1 - x0) * k,
      (y1 - y0) * k,
    );
    const left = ((p.x - view.x) / view.w) * r.width;
    const top = ((p.y - view.y) / view.h) * r.height;
    // Sit above the finger, or below it near the top edge
    setLoupeAt({
      left: Math.min(r.width - LOUPE_PX, Math.max(0, left - LOUPE_PX / 2)),
      top: top - LOUPE_PX - 40 >= 0 ? top - LOUPE_PX - 40 : top + 40,
    });
  }

  function toFrame(e: React.PointerEvent, el: HTMLElement): Pt {
    const rect = el.getBoundingClientRect();
    return {
      x: Math.min(
        width,
        Math.max(0, view.x + ((e.clientX - rect.left) / rect.width) * view.w),
      ),
      y: Math.min(
        height,
        Math.max(0, view.y + ((e.clientY - rect.top) / rect.height) * view.h),
      ),
    };
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const p = toFrame(e, e.currentTarget);
    let best = -1;
    let bestD = GRAB_RADIUS * unit;
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
    showLoupe(points[best], e.currentTarget);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const i = dragIndex.current;
    if (i === null) return;
    const p = toFrame(e, e.currentTarget);
    setPoints((prev) => prev.map((pt, idx) => (idx === i ? p : pt)));
    showLoupe(p, e.currentTarget);
  }

  function onPointerUp() {
    dragIndex.current = null;
    setLoupeAt(null);
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
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
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
              r={11 * unit}
              className={i < 2 ? "fill-blue/30" : "fill-green/30"}
            />
            <circle
              cx={p.x}
              cy={p.y}
              r={5 * unit}
              className={i < 2 ? "fill-blue" : "fill-green"}
              stroke="white"
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
            />
          </g>
        ))}
      </svg>

      <canvas
        ref={loupeRef}
        width={LOUPE_PX * 2}
        height={LOUPE_PX * 2}
        aria-hidden
        style={{
          width: LOUPE_PX,
          height: LOUPE_PX,
          left: loupeAt?.left ?? 0,
          top: loupeAt?.top ?? 0,
        }}
        className={`pointer-events-none absolute z-20 rounded-full border-2 border-white shadow-lg ${loupeAt ? "" : "hidden"}`}
      />
      {loupeAt && (
        <span
          aria-hidden
          style={{
            left: loupeAt.left + LOUPE_PX / 2 - 6,
            top: loupeAt.top + LOUPE_PX / 2 - 6,
          }}
          className="pointer-events-none absolute z-20 h-3 w-3 rounded-full border-2 border-blue"
        />
      )}
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
