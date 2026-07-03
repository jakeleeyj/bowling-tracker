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

// Hook shot: starts board 18, drifts out to board 6 at 40ft, hooks back to 17.5 at 60ft
function hookShot(): TrackedPoint[] {
  const pts: TrackedPoint[] = [];
  for (let i = 0; i <= 30; i++) {
    const feet = (60 * i) / 30;
    const board =
      feet <= 40 ? 18 - (12 * feet) / 40 : 6 + (11.5 * (feet - 40)) / 20;
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

  it("finds breakpoint as the minimum board of a hook", () => {
    const s = computeShotStats(hookShot())!;
    expect(s.releaseBoard).toBeCloseTo(18, 0.5);
    expect(s.breakpointBoard).toBeCloseTo(6, 0.5);
    expect(s.entryBoard).toBeCloseTo(17.5, 0.5);
    // arrows at 15 feet: 18 - 12*15/40 = 13.5
    expect(s.arrowsBoard).toBeCloseTo(13.5, 0.5);
  });

  it("rejects tracks with too few points", () => {
    expect(computeShotStats(straightShot().slice(0, 3))).toBeNull();
  });

  it("rejects tracks that travel under 20 feet", () => {
    const short = straightShot().filter((p) => p.feet < 15);
    expect(computeShotStats(short)).toBeNull();
  });
});
