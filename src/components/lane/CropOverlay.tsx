"use client";

import { useRef, useState } from "react";
import type { Pt, Rect } from "@/lib/lane/geometry";

const HANDLE_GRAB = 0.08; // of the frame width
const MIN_SIZE = 0.12; // of the frame, so the box can't collapse

type Drag =
  { kind: "corner"; corner: number } | { kind: "move"; from: Pt; start: Rect };

/** Drag a box around the lane; the view zooms to it for placing corners. */
export default function CropOverlay({
  width,
  height,
  initial,
  onDone,
}: {
  width: number;
  height: number;
  initial: Rect;
  onDone: (crop: Rect) => void;
}) {
  const [box, setBox] = useState<Rect>(initial);
  const drag = useRef<Drag | null>(null);

  function toFrame(e: React.PointerEvent, el: HTMLElement): Pt {
    const r = el.getBoundingClientRect();
    return {
      x: Math.min(width, Math.max(0, ((e.clientX - r.left) / r.width) * width)),
      y: Math.min(
        height,
        Math.max(0, ((e.clientY - r.top) / r.height) * height),
      ),
    };
  }

  // Corners in order: top left, top right, bottom right, bottom left
  const corners: Pt[] = [
    { x: box.x, y: box.y },
    { x: box.x + box.w, y: box.y },
    { x: box.x + box.w, y: box.y + box.h },
    { x: box.x, y: box.y + box.h },
  ];

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const p = toFrame(e, e.currentTarget);
    const grab = HANDLE_GRAB * width;
    const corner = corners.findIndex(
      (c) => Math.hypot(c.x - p.x, c.y - p.y) < grab,
    );
    if (corner >= 0) {
      drag.current = { kind: "corner", corner };
    } else if (
      p.x > box.x &&
      p.x < box.x + box.w &&
      p.y > box.y &&
      p.y < box.y + box.h
    ) {
      drag.current = { kind: "move", from: p, start: box };
    } else {
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d) return;
    const p = toFrame(e, e.currentTarget);
    if (d.kind === "move") {
      setBox({
        ...d.start,
        x: Math.min(width - d.start.w, Math.max(0, d.start.x + p.x - d.from.x)),
        y: Math.min(
          height - d.start.h,
          Math.max(0, d.start.y + p.y - d.from.y),
        ),
      });
      return;
    }
    // The dragged corner moves; the opposite corner stays put
    const fixed = corners[(d.corner + 2) % 4];
    const minW = MIN_SIZE * width;
    const minH = MIN_SIZE * height;
    const left = d.corner === 0 || d.corner === 3;
    const top = d.corner === 0 || d.corner === 1;
    const x = left
      ? Math.min(p.x, fixed.x - minW)
      : Math.max(p.x, fixed.x + minW);
    const y = top
      ? Math.min(p.y, fixed.y - minH)
      : Math.max(p.y, fixed.y + minH);
    setBox({
      x: Math.max(0, Math.min(x, fixed.x)),
      y: Math.max(0, Math.min(y, fixed.y)),
      w: Math.min(width, Math.abs(x - fixed.x)),
      h: Math.min(height, Math.abs(y - fixed.y)),
    });
  }

  function onPointerUp() {
    drag.current = null;
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
        <path
          d={`M0 0H${width}V${height}H0Z M${box.x} ${box.y}v${box.h}h${box.w}v${-box.h}Z`}
          fillRule="evenodd"
          className="fill-black/55"
        />
        <rect
          x={box.x}
          y={box.y}
          width={box.w}
          height={box.h}
          fill="none"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
          className="stroke-white"
        />
        {corners.map((c, i) => (
          <circle
            key={i}
            cx={c.x}
            cy={c.y}
            r={width * 0.022}
            stroke="white"
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
            className="fill-blue"
          />
        ))}
      </svg>

      <div className="absolute bottom-2 left-1/2 w-[94%] max-w-sm -translate-x-1/2">
        <div className="glass flex items-center gap-2 p-2.5">
          <p className="flex-1 text-xs font-semibold leading-snug">
            Drag the box around your lane, from the foul line to the pins
          </p>
          <button
            onPointerDown={(e) => {
              e.stopPropagation();
              onDone(box);
            }}
            className="rounded-full bg-blue px-4 py-2 text-sm font-bold text-white"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
