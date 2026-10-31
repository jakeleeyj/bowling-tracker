"use client";

import { useEffect, useRef } from "react";
import {
  type FrameKind,
  type RibbonPalette,
  clipReveal,
  drawBand,
  parseColor,
  ribbonFill,
  ribbonPoints,
} from "@/lib/ribbon";

const SIZE = 280;
const LEGEND: { kind: FrameKind; label: string; dot: string }[] = [
  { kind: "X", label: "Strikes", dot: "bg-strike" },
  { kind: "/", label: "Spares", dot: "bg-spare" },
  { kind: "O", label: "Open", dot: "bg-open" },
];

/**
 * One glowing ribbon per game, oldest to newest. More games means thinner ribbons,
 * a tighter spread and a fainter halo per game, so overlaps glow without turning white.
 */
export default function SessionOrb({
  games,
  children,
}: {
  games: FrameKind[][];
  children?: React.ReactNode;
}) {
  const crispRef = useRef<HTMLCanvasElement>(null);
  const haloRef = useRef<HTMLCanvasElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const key = games.map((g) => g.join("")).join("|");

  useEffect(() => {
    const crisp = crispRef.current;
    const halo = haloRef.current;
    const host = hostRef.current;
    if (!crisp || !halo || !host) return;

    const root = getComputedStyle(document.documentElement);
    const palette: RibbonPalette = {
      X: parseColor(root.getPropertyValue("--color-strike")),
      "/": parseColor(root.getPropertyValue("--color-spare")),
      O: parseColor(root.getPropertyValue("--color-open")),
    };
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const layers = [crisp, halo].map((canvas) => {
      canvas.width = SIZE * dpr;
      canvas.height = SIZE * dpr;
      const ctx = canvas.getContext("2d");
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
      return ctx;
    });
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const list = key.split("|").map((g) => [...g] as FrameKind[]);
    const n = list.length;
    const c = SIZE / 2;
    const spread = n > 1 ? Math.min(11, 34 / n) : 0;
    const wScale = n <= 3 ? 1 : Math.max(0.5, Math.sqrt(3 / n));
    const start = performance.now();

    function draw(now: number) {
      layers.forEach((ctx, layer) => {
        if (!ctx) return;
        ctx.save();
        ctx.clearRect(0, 0, SIZE, SIZE);
        if (!reduce) clipReveal(ctx, c, now - start);
        ctx.globalCompositeOperation = layer ? "lighter" : "screen";
        list.forEach((kinds, k) => {
          const recency = n === 1 ? 1 : k / (n - 1);
          const rot = reduce
            ? 0
            : Math.sin(now * 0.00015 * (1 + k * 0.21) + k) * 7;
          const pts = ribbonPoints(
            kinds,
            {
              closed: true,
              per: 24,
              base: 82 + (k - (n - 1) / 2) * spread,
              amp: 28,
              w0: 2,
              w1: 7,
              wScale,
              rot,
              morph: !reduce,
            },
            now,
            k,
          );
          const alpha = layer
            ? 0.9 / Math.sqrt(n)
            : k === n - 1
              ? 1
              : 0.22 + (0.7 - 0.22) * recency;
          drawBand(
            ctx,
            c,
            pts,
            true,
            ribbonFill(ctx, c, kinds, palette, rot, true),
            alpha,
          );
        });
        ctx.restore();
      });
    }

    if (reduce) {
      draw(start);
      return;
    }

    let frame = 0;
    let visible = true;
    const tick = (now: number) => {
      draw(now);
      frame = requestAnimationFrame(tick);
    };
    const sync = () => {
      cancelAnimationFrame(frame);
      if (visible && !document.hidden) frame = requestAnimationFrame(tick);
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    observer.observe(host);
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [key]);

  const all = games.flat();
  const count = (kind: FrameKind) => all.filter((k) => k === kind).length;

  return (
    <div className="relative mb-4 flex flex-col items-center">
      <div
        aria-hidden
        className="animate-aura pointer-events-none absolute top-1/2 left-1/2 -z-10 size-[460px] -translate-x-1/2 -translate-y-1/2"
        style={{
          background:
            "radial-gradient(closest-side at 42% 46%, color-mix(in srgb, var(--color-strike) 14%, transparent), transparent), radial-gradient(closest-side at 60% 56%, color-mix(in srgb, var(--color-spare) 11%, transparent), transparent)",
        }}
      />
      <div
        ref={hostRef}
        className="relative"
        style={{ width: SIZE, height: SIZE }}
      >
        <canvas
          ref={haloRef}
          aria-hidden
          className="absolute inset-0 size-full opacity-85 blur-[16px] saturate-[1.4]"
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
      <div className="mt-1 flex gap-[18px] text-[13px] text-text-secondary">
        {LEGEND.map((l) => (
          <span key={l.kind} className="flex items-center gap-1.5">
            <i className={`block size-2 rounded-full ${l.dot}`} />
            {l.label}
            <b className="font-semibold text-text-primary tabular-nums">
              {count(l.kind)}
            </b>
          </span>
        ))}
      </div>
    </div>
  );
}
