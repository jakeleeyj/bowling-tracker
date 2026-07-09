import { describe, it, expect } from "vitest";
import { BallDetector, toGrayscale } from "./ballDetector";

const W = 64;
const H = 48;

function blankFrame(value = 100): Uint8ClampedArray {
  return new Uint8ClampedArray(W * H).fill(value);
}

// Draw a bright square blob centred at (cx, cy)
function withBlob(
  f: Uint8ClampedArray,
  cx: number,
  cy: number,
  half = 2,
): Uint8ClampedArray {
  for (let dy = -half; dy <= half; dy++) {
    for (let dx = -half; dx <= half; dx++) {
      const x = cx + dx;
      const y = cy + dy;
      if (x >= 0 && x < W && y >= 0 && y < H) f[y * W + x] = 250;
    }
  }
  return f;
}

function frameWithBall(cx: number, cy: number): Uint8ClampedArray {
  return withBlob(blankFrame(), cx, cy);
}

// Roll a ball left-to-right along row `cy`; returns the last detection.
function rollBall(
  d: BallDetector,
  positions: Array<[number, number]>,
): ({ x: number; y: number; strength: number } | null)[] {
  return positions.map(([x, y]) => d.detect(frameWithBall(x, y)));
}

function settle(d: BallDetector) {
  for (let i = 0; i < 10; i++) d.detect(blankFrame());
}

describe("BallDetector", () => {
  it("returns null on a static scene", () => {
    const d = new BallDetector(W, H);
    settle(d);
    expect(d.detect(blankFrame())).toBeNull();
  });

  it("locks onto a ball travelling down-lane after a few frames", () => {
    const d = new BallDetector(W, H);
    settle(d);
    // toward the deck = decreasing y (camera sits behind the approach)
    const hits = rollBall(d, [
      [30, 42],
      [30, 38],
      [31, 34],
      [31, 30],
      [32, 26],
      [32, 22],
    ]);
    // early frames are acquisition; the tail must be locked and accurate
    const last = hits[hits.length - 1];
    expect(last).not.toBeNull();
    expect(last!.x).toBeCloseTo(32, 0);
    expect(last!.y).toBeCloseTo(22, 0);
  });

  it("does not report a foot swaying in place near the foul line", () => {
    const d = new BallDetector(W, H);
    settle(d);
    // ball-sized blob wobbling around one spot — never progresses down-lane
    const wobble: Array<[number, number]> = [];
    for (let i = 0; i < 20; i++) {
      wobble.push([30 + (i % 3), 40 + ((i * 2) % 3)]);
    }
    const hits = rollBall(d, wobble);
    expect(hits.every((h) => h === null)).toBe(true);
  });

  it("does not report a large moving blob (a person)", () => {
    const d = new BallDetector(W, H);
    settle(d);
    // 30x40 moving rectangle = way beyond MAX_BLOB_PIXELS
    for (let step = 0; step < 6; step++) {
      const f = blankFrame();
      for (let y = 4; y < 44; y++) {
        for (let x = 10 + step; x < 40 + step; x++) f[y * W + x] = 250;
      }
      expect(d.detect(f)).toBeNull();
    }
  });

  it("keeps tracking the ball when a person moves elsewhere in frame", () => {
    const d = new BallDetector(W, H);
    d.setLaneMask([
      { x: 20, y: 46 },
      { x: 60, y: 46 },
      { x: 44, y: 2 },
      { x: 36, y: 2 },
    ]);
    settle(d);
    let last: { x: number } | null = null;
    for (let step = 0; step < 8; step++) {
      const f = blankFrame();
      // "person": big blob on the left, outside the lane mask
      for (let y = 10; y < 40; y++) {
        for (let x = 0; x < 12; x++) f[y * W + x] = 250 - step * 3;
      }
      // ball rolling up the lane
      withBlob(f, 38, 42 - step * 5, 1);
      last = d.detect(f);
    }
    expect(last).not.toBeNull();
    expect(last!.x).toBeCloseTo(38, 0);
  });

  it("ignores motion outside the lane mask entirely", () => {
    const d = new BallDetector(W, H);
    d.setLaneMask([
      { x: 20, y: 46 },
      { x: 60, y: 46 },
      { x: 44, y: 2 },
      { x: 36, y: 2 },
    ]);
    settle(d);
    // ball-sized blob moving in the top-left corner, outside the lane
    const hits = rollBall(d, [
      [4, 4],
      [8, 4],
      [12, 4],
      [16, 4],
      [20, 4],
    ]);
    expect(hits.every((h) => h === null)).toBe(true);
  });

  it("resetTrack drops all tracks", () => {
    const d = new BallDetector(W, H);
    settle(d);
    rollBall(d, [
      [30, 42],
      [30, 38],
      [31, 34],
      [31, 30],
      [32, 26],
    ]);
    d.resetTrack();
    // First frame after reset re-seeds; no immediate detection
    expect(d.detect(frameWithBall(32, 22))).toBeNull();
  });
});

describe("toGrayscale", () => {
  it("averages RGB channels", () => {
    const rgba = new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255]);
    const g = toGrayscale(rgba, 2, 1);
    expect(g[0]).toBeCloseTo(85, 0);
    expect(g[1]).toBeCloseTo(85, 0);
  });
});
