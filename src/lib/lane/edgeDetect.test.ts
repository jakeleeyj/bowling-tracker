import { describe, it, expect } from "vitest";
import { suggestLaneEdges, medianPlate } from "./edgeDetect";

const W = 320;
const H = 568;

// Synthetic scene: bright lane trapezoid on darker surround, dark gutters.
function syntheticPlate(): Uint8ClampedArray {
  const p = new Uint8ClampedArray(W * H).fill(120); // surround
  const foulY = Math.floor(H * 0.72);
  const deckY = Math.floor(H * 0.47);
  for (let y = deckY; y <= foulY; y++) {
    const t = (y - deckY) / (foulY - deckY); // 0 at deck, 1 at foul
    const lx = Math.round(150 - 25 * t); // left edge splays out downward
    const rx = Math.round(210 + 25 * t);
    for (let x = lx; x <= rx; x++) p[y * W + x] = 200; // lane wood
    for (let x = lx - 6; x < lx; x++) p[y * W + x] = 60; // left gutter
    for (let x = rx + 1; x <= rx + 6; x++) p[y * W + x] = 60; // right gutter
  }
  return p;
}

describe("suggestLaneEdges", () => {
  it("finds both edges of a clean synthetic lane", () => {
    const s = suggestLaneEdges(syntheticPlate(), W, H);
    expect(s.foulLeft).toBeDefined();
    expect(s.foulRight).toBeDefined();
    expect(s.deckLeft).toBeDefined();
    expect(s.deckRight).toBeDefined();
    // left edge splays: foul corner further out than deck corner
    expect(s.foulLeft!.x).toBeLessThan(s.deckLeft!.x);
    expect(s.foulRight!.x).toBeGreaterThan(s.deckRight!.x);
    // roughly where we drew them (gutter minimum sits a few px outside the wood)
    expect(Math.abs(s.deckLeft!.x - 150)).toBeLessThan(10);
    expect(Math.abs(s.deckRight!.x - 210)).toBeLessThan(10);
  });

  it("returns nothing on a flat frame", () => {
    const flat = new Uint8ClampedArray(W * H).fill(128);
    const s = suggestLaneEdges(flat, W, H);
    expect(s.foulLeft).toBeUndefined();
    expect(s.foulRight).toBeUndefined();
  });
});

describe("medianPlate", () => {
  it("erases moving objects", () => {
    const size = 16;
    const frames = [0, 1, 2, 3, 4].map((f) => {
      const a = new Uint8ClampedArray(size).fill(100);
      a[f * 3] = 250; // "ball" at a different spot each frame
      return a;
    });
    const plate = medianPlate(frames, size);
    for (let i = 0; i < size; i++) expect(plate[i]).toBe(100);
  });
});
