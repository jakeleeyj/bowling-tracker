import { describe, it, expect } from "vitest";
import {
  computeLayoutGeometry,
  BALL_RADIUS_PX,
  INCH_PX,
} from "./layoutGeometry";

const layout = { drillingAngle: 50, pinToPap: 4.5, valAngle: 35 };

describe("computeLayoutGeometry", () => {
  it("places the pin exactly pinToPap inches from the PAP", () => {
    const g = computeLayoutGeometry(layout);
    const d = Math.hypot(g.pin.x - g.pap.x, g.pin.y - g.pap.y);
    expect(d).toBeCloseTo(4.5 * INCH_PX, 1);
  });

  it("keeps pin and PAP inside the ball circle", () => {
    const g = computeLayoutGeometry(layout);
    for (const p of [g.pin, g.pap]) {
      expect(Math.hypot(p.x - g.center.x, p.y - g.center.y)).toBeLessThan(
        BALL_RADIUS_PX,
      );
    }
  });

  it("places the pin above the midline (toward the fingers)", () => {
    const g = computeLayoutGeometry(layout);
    expect(g.pin.y).toBeLessThan(g.pap.y);
  });

  it("uses a custom PAP position when provided", () => {
    const def = computeLayoutGeometry(layout);
    const custom = computeLayoutGeometry(layout, { over: 5, up: 1 });
    expect(custom.pap.x - def.grip.x).toBeCloseTo(5 * INCH_PX, 1);
    expect(def.pap.y - custom.pap.y).toBeCloseTo(1 * INCH_PX, 1);
  });

  it("mirrors the whole layout for left-handed bowlers", () => {
    const right = computeLayoutGeometry(layout);
    const left = computeLayoutGeometry(layout, undefined, "left");
    expect(left.pap.x).toBeCloseTo(2 * right.center.x - right.pap.x, 5);
    expect(left.pin.x).toBeCloseTo(2 * right.center.x - right.pin.x, 5);
    expect(left.pin.y).toBeCloseTo(right.pin.y, 5);
  });

  it("larger VAL angle moves the pin further from the VAL", () => {
    const near = computeLayoutGeometry({ ...layout, valAngle: 25 });
    const far = computeLayoutGeometry({ ...layout, valAngle: 55 });
    expect(Math.abs(far.pin.x - far.pap.x)).toBeGreaterThan(
      Math.abs(near.pin.x - near.pap.x),
    );
  });
});
