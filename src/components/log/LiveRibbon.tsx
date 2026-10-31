"use client";

import { useEffect, useRef } from "react";
import {
  type FrameKind,
  type RibbonOptions,
  type RibbonPalette,
  drawBand,
  parseColor,
  ribbonFill,
  ribbonPoints,
} from "@/lib/ribbon";

const SIZE = 132;

/**
 * The game so far as an open ribbon, a dotted path round the rest of the ring
 * for the best possible finish (all strikes), and a pulsing dot at the current frame.
 */
export default function LiveRibbon({
  done,
  children,
}: {
  done: FrameKind[];
  children?: React.ReactNode;
}) {
  const crispRef = useRef<HTMLCanvasElement>(null);
  const haloRef = useRef<HTMLCanvasElement>(null);
  const key = done.join("");

  useEffect(() => {
    const crisp = crispRef.current;
    const halo = haloRef.current;
    if (!crisp || !halo) return;

    const root = getComputedStyle(document.documentElement);
    const token = (name: string) => root.getPropertyValue(name);
    const palette: RibbonPalette = {
      X: parseColor(token("--color-strike")),
      "/": parseColor(token("--color-spare")),
      O: parseColor(token("--color-open")),
    };
    const dot = token("--color-text-primary");
    const ring = token("--color-base");
    const [r, g, b] = parseColor(token("--color-text-secondary"));
    const path = `rgba(${r},${g},${b},0.45)`;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const [ctx, haloCtx] = [crisp, halo].map((canvas) => {
      canvas.width = SIZE * dpr;
      canvas.height = SIZE * dpr;
      const c2d = canvas.getContext("2d");
      c2d?.setTransform(dpr, 0, 0, dpr, 0, 0);
      return c2d;
    });
    if (!ctx || !haloCtx) return;

    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const kinds = [...key] as FrameKind[];
    const count = kinds.length;
    // Remaining frames are drawn as strikes: that is the max possible line
    const full = [...kinds, ...Array<FrameKind>(10 - count).fill("X")];
    const upto = count - 0.5;
    const c = SIZE / 2;
    const opts: RibbonOptions = {
      closed: false,
      per: 18,
      base: 44,
      amp: 13,
      w0: 2,
      w1: 5.5,
      wScale: 1,
      rot: 0,
      morph: !reduce,
      upto,
    };

    function draw(now: number) {
      if (!ctx || !haloCtx) return;
      for (const layer of [ctx, haloCtx]) layer.clearRect(0, 0, SIZE, SIZE);

      const rest = ribbonPoints(
        full,
        { ...opts, upto: 9.5, morph: false },
        now,
        0,
      ).filter((p) => p.t >= (count ? upto + 0.15 : -0.5));
      ctx.save();
      ctx.setLineDash([1.5, 5]);
      ctx.lineDashOffset = reduce ? 0 : -now * 0.012;
      ctx.strokeStyle = path;
      ctx.lineWidth = 1.4;
      ctx.lineCap = "round";
      ctx.beginPath();
      rest.forEach((p, i) => {
        const x = c + p.r * p.cos;
        const y = c + p.r * p.sin;
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      });
      ctx.stroke();
      ctx.restore();

      let head = rest[0];
      if (count) {
        const pts = ribbonPoints(full, opts, now, 0);
        const fill = ribbonFill(ctx, c, full, palette, 0, false);
        drawBand(
          haloCtx,
          c,
          pts,
          false,
          ribbonFill(haloCtx, c, full, palette, 0, false),
          0.9,
        );
        drawBand(ctx, c, pts, false, fill, 1);
        head = pts[pts.length - 1];
      }
      if (!head) return;

      const x = c + head.r * head.cos;
      const y = c + head.r * head.sin;
      ctx.save();
      if (!reduce) {
        const ph = (now % 1800) / 1800;
        ctx.globalAlpha = 0.5 * (1 - ph);
        ctx.fillStyle = dot;
        ctx.beginPath();
        ctx.arc(x, y, 4 + 9 * ph, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = dot;
      ctx.strokeStyle = ring;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    if (reduce) {
      draw(0);
      return;
    }
    let frame = 0;
    const tick = (now: number) => {
      draw(now);
      frame = requestAnimationFrame(tick);
    };
    const sync = () => {
      cancelAnimationFrame(frame);
      if (!document.hidden) frame = requestAnimationFrame(tick);
    };
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [key]);

  return (
    <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
      <canvas
        ref={haloRef}
        aria-hidden
        className="absolute inset-0 size-full opacity-85 blur-[10px] saturate-[1.4]"
      />
      <canvas
        ref={crispRef}
        aria-hidden
        className="absolute inset-0 size-full"
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  );
}
