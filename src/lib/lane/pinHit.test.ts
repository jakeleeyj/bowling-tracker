import { describe, it, expect } from "vitest";
import { PinHitWatcher } from "./pinHit";

const W = 100;
const H = 100;
// Deck line at y=40 between x=40 and x=60, so the pin box is y 30..40
const cal = {
  foulLeft: { x: 0, y: 99 },
  foulRight: { x: 99, y: 99 },
  deckLeft: { x: 40, y: 40 },
  deckRight: { x: 60, y: 40 },
};

function frame(fill = 100) {
  return new Uint8ClampedArray(W * H).fill(fill);
}

function withPinsScattered(f: Uint8ClampedArray) {
  for (let y = 32; y < 38; y++) for (let x = 42; x < 58; x++) f[y * W + x] = 240;
  return f;
}

describe("PinHitWatcher", () => {
  it("reports the first frame the pins move after arming", () => {
    const p = new PinHitWatcher(W, H, cal);
    p.feed(frame(), W, 0);
    p.arm();
    p.feed(frame(), W, 33);
    p.feed(withPinsScattered(frame()), W, 66);
    p.feed(frame(), W, 100);
    expect(p.hitMs).toBe(66);
  });

  it("ignores pin movement before it is armed", () => {
    const p = new PinHitWatcher(W, H, cal);
    p.feed(frame(), W, 0);
    p.feed(withPinsScattered(frame()), W, 33);
    expect(p.hitMs).toBeNull();
  });

  it("ignores movement outside the pin box", () => {
    const p = new PinHitWatcher(W, H, cal);
    p.arm();
    p.feed(frame(), W, 0);
    const f = frame();
    for (let y = 60; y < 90; y++) for (let x = 10; x < 90; x++) f[y * W + x] = 240;
    p.feed(f, W, 33);
    expect(p.hitMs).toBeNull();
  });
});
