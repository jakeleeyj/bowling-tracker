"use client";

import { useEffect, useRef } from "react";
import {
  type RibbonPalette,
  type ScoreBand,
  clipReveal,
  drawBand,
  parseColor,
  scoreBand,
  scoreFill,
  scorePoints,
  bucketScores,
} from "@/lib/ribbon";

const SIZE = 280;
const LEGEND: { band: ScoreBand; label: string; dot: string }[] = [
  { band: "above", label: "Above avg", dot: "bg-strike" },
  { band: "near", label: "Near", dot: "bg-spare" },
  { band: "below", label: "Below", dot: "bg-open" },
];

/**
 * Every game as one closed ribbon round the ring, first game at the top going clockwise.
 * Smoothed over a run of games, so it shows stretches of form: out when bowling well, in when not.
 */
export default function LifetimeRibbon({
  scores,
  avg,
  children,
}: {
  scores: number[];
  avg: number;
  children?: React.ReactNode;
}) {
  const crispRef = useRef<HTMLCanvasElement>(null);
  const haloRef = useRef<HTMLCanvasElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const key = scores.join(",");

  useEffect(() => {
    const crisp = crispRef.current;
    const halo = haloRef.current;
    const host = hostRef.current;
    if (!crisp || !halo || !host) return;

    const root = getComputedStyle(document.documentElement);
    const token = (name: string) => root.getPropertyValue(name);
    const palette: RibbonPalette = {
      X: parseColor(token("--color-strike")),
      "/": parseColor(token("--color-spare")),
      O: parseColor(token("--color-open")),
    };
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
    const raw = key.split(",").map(Number);
    const list = bucketScores(raw, 16);
    // Colour spans this player's own range of form: best stretch cyan, worst grey
    const range = {
      above: Math.max(4, ...list.map((v) => v - avg)),
      below: Math.max(4, ...list.map((v) => avg - v)),
    };
    const c = SIZE / 2;
    const per = 12;
    const wave = (Math.max(...list) - Math.min(...list)) * 0.1;
    const start = performance.now();

    function draw(now: number) {
      if (!ctx || !haloCtx) return;
      // One full turn every 2 minutes, and a slow wave running through the loop
      const rot = reduce ? 0 : (now * 0.003) % 360;
      const shape = reduce
        ? list
        : list.map((v, i) => v + wave * Math.sin(now * 0.0006 + i * 0.9));
      const pts = scorePoints(shape, {
        base: 84,
        amp: 24,
        w0: 2,
        w1: 7,
        rot,
        per,
      });
      [ctx, haloCtx].forEach((layer, i) => {
        layer.save();
        layer.clearRect(0, 0, SIZE, SIZE);
        if (!reduce) clipReveal(layer, c, now - start);
        drawBand(
          layer,
          c,
          pts,
          true,
          scoreFill(layer, c, list, avg, palette, rot, range),
          i ? 0.9 : 1,
        );
        layer.restore();
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
  }, [key, avg]);

  const count = (band: ScoreBand) =>
    scores.filter((s) => scoreBand(s, avg) === band).length;

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
          <span key={l.band} className="flex items-center gap-1.5">
            <i className={`block size-2 rounded-full ${l.dot}`} />
            {l.label}
            <b className="font-semibold text-text-primary tabular-nums">
              {count(l.band)}
            </b>
          </span>
        ))}
      </div>
    </div>
  );
}
