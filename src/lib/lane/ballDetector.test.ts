import { describe, it, expect } from "vitest";
import { BallDetector, toGrayscale } from "./ballDetector";

const W = 64;
const H = 48;

function blankFrame(value = 100): Uint8ClampedArray {
  return new Uint8ClampedArray(W * H).fill(value);
}

// Draw a bright 5x5 square (the "ball") at (cx, cy)
function frameWithBall(cx: number, cy: number): Uint8ClampedArray {
  const f = blankFrame();
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      f[(cy + dy) * W + (cx + dx)] = 250;
    }
  }
  return f;
}

describe("BallDetector", () => {
  it("returns null on a static scene", () => {
    const d = new BallDetector(W, H);
    for (let i = 0; i < 10; i++) d.detect(blankFrame());
    expect(d.detect(blankFrame())).toBeNull();
  });

  it("finds the centroid of a moving blob after background settles", () => {
    const d = new BallDetector(W, H);
    for (let i = 0; i < 10; i++) d.detect(blankFrame());
    const hit = d.detect(frameWithBall(30, 20));
    expect(hit).not.toBeNull();
    expect(hit!.x).toBeCloseTo(30, 0);
    expect(hit!.y).toBeCloseTo(20, 0);
    expect(hit!.strength).toBeGreaterThanOrEqual(20);
  });

  it("tracks the blob as it moves", () => {
    const d = new BallDetector(W, H);
    for (let i = 0; i < 10; i++) d.detect(blankFrame());
    d.detect(frameWithBall(10, 10));
    const hit = d.detect(frameWithBall(40, 30));
    expect(hit!.x).toBeCloseTo(40, 0);
    expect(hit!.y).toBeCloseTo(30, 0);
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
