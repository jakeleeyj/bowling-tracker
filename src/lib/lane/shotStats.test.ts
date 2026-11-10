import { describe, it, expect } from "vitest";
import { computeShotStats, type TrackedPoint } from "./shotStats";

// Straight shot down board 10, 60 feet in 2.5s => 24 ft/s => ~16.36 mph
function straightShot(): TrackedPoint[] {
  const pts: TrackedPoint[] = [];
  for (let i = 0; i <= 25; i++) {
    pts.push({ board: 10, feet: (60 * i) / 25, tMs: 100 * i });
  }
  return pts;
}

// Hook shot: skids from board 18 out toward the gutter, starts hooking at
// 30 ft, turns back at 45 ft on board 3, ends on board 6 at 60 ft
function hookShot(): TrackedPoint[] {
  const pts: TrackedPoint[] = [];
  for (let i = 0; i <= 30; i++) {
    const feet = (60 * i) / 30;
    const board = 18 - 0.4 * feet + (0.4 / 30) * Math.max(0, feet - 30) ** 2;
    pts.push({ board, feet, tMs: 90 * i });
  }
  return pts;
}

describe("computeShotStats", () => {
  it("computes speed from distance and time", () => {
    const s = computeShotStats(straightShot());
    expect(s).not.toBeNull();
    expect(s!.speedMph).toBeCloseTo(16.36, 1);
  });

  it("reads boards along a straight shot", () => {
    const s = computeShotStats(straightShot())!;
    expect(s.releaseBoard).toBeCloseTo(10, 1);
    expect(s.arrowsBoard).toBeCloseTo(10, 1);
    expect(s.breakpointBoard).toBeCloseTo(10, 1);
    expect(s.entryBoard).toBeCloseTo(10, 1);
  });

  it("finds the breakpoint where the hook turns back", () => {
    const s = computeShotStats(hookShot())!;
    expect(s.releaseBoard).toBeCloseTo(18, 1);
    expect(s.arrowsBoard).toBeCloseTo(12, 1);
    expect(s.breakpointFeet).toBeCloseTo(45, 0);
    expect(s.breakpointBoard).toBeCloseTo(3, 0);
    expect(s.entryBoard).toBeCloseTo(6, 0);
  });

  it("draws a smooth line through tracker glitches", () => {
    const pts = hookShot();
    // a reflection pulls a few points 5 boards off the line
    for (const i of [8, 15, 22]) pts[i] = { ...pts[i], board: pts[i].board + 5 };
    const s = computeShotStats(pts)!;
    expect(s.boardAt(pts[15].feet)).toBeCloseTo(hookShot()[15].board, 0);
    expect(s.breakpointBoard).toBeCloseTo(3, 0);
  });

  it("times speed from the foul line to the pin hit", () => {
    // 60 ft at 24 ft/s: crosses the foul line at 0 ms, hits the pins at 2500 ms
    const pts = straightShot().filter((p) => p.feet >= 10 && p.feet <= 50);
    const s = computeShotStats(pts, 2500)!;
    expect(s.speedFrom).toBe("pins");
    expect(s.speedMph).toBeCloseTo(16.36, 1);
  });

  it("ignores a pin hit that implies an impossible speed", () => {
    const s = computeShotStats(straightShot(), 500)!;
    expect(s.speedFrom).toBe("track");
  });

  it("rejects tracks with too few points", () => {
    expect(computeShotStats(straightShot().slice(0, 3))).toBeNull();
  });

  it("rejects tracks that travel under 20 feet", () => {
    const short = straightShot().filter((p) => p.feet < 15);
    expect(computeShotStats(short)).toBeNull();
  });
});
