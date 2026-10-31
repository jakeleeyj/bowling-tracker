"use client";

import { useEffect, useRef } from "react";
import {
  type FrameKind,
  type RibbonPalette,
  drawBand,
  parseColor,
  ribbonFill,
  ribbonPoints,
} from "@/lib/ribbon";

const SIZE = 36;

/** A still, small version of the Home orb: every game in the session as one ribbon. */
export default function MiniOrb({ games }: { games: FrameKind[][] }) {
  const crispRef = useRef<HTMLCanvasElement>(null);
  const haloRef = useRef<HTMLCanvasElement>(null);
  const key = games.map((g) => g.join("")).join("|");

  useEffect(() => {
    const root = getComputedStyle(document.documentElement);
    const palette: RibbonPalette = {
      X: parseColor(root.getPropertyValue("--color-strike")),
      "/": parseColor(root.getPropertyValue("--color-spare")),
      O: parseColor(root.getPropertyValue("--color-open")),
    };
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const list = key.split("|").map((g) => [...g] as FrameKind[]);
    const n = list.length;
    const c = SIZE / 2;
    const spread = n > 1 ? Math.min(1.6, 5 / n) : 0;

    [crispRef.current, haloRef.current].forEach((canvas, layer) => {
      if (!canvas) return;
      canvas.width = SIZE * dpr;
      canvas.height = SIZE * dpr;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = layer ? "lighter" : "screen";
      list.forEach((kinds, k) => {
        const pts = ribbonPoints(
          kinds,
          {
            closed: true,
            per: 12,
            base: 10 + (k - (n - 1) / 2) * spread,
            amp: 4,
            w0: 0.8,
            w1: 2.4,
            wScale: n <= 3 ? 1 : Math.max(0.6, Math.sqrt(3 / n)),
            rot: 0,
            morph: false,
          },
          0,
          k,
        );
        const alpha = layer
          ? 0.8 / Math.sqrt(n)
          : k === n - 1
            ? 1
            : 0.3 + 0.5 * (n === 1 ? 1 : k / (n - 1));
        drawBand(
          ctx,
          c,
          pts,
          true,
          ribbonFill(ctx, c, kinds, palette, 0, true),
          alpha,
        );
      });
    });
  }, [key]);

  return (
    <div
      aria-hidden
      className="relative shrink-0"
      style={{ width: SIZE, height: SIZE }}
    >
      <canvas
        ref={haloRef}
        className="absolute inset-0 size-full opacity-80 blur-[4px]"
      />
      <canvas ref={crispRef} className="absolute inset-0 size-full" />
    </div>
  );
}
