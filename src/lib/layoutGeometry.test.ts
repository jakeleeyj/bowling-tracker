import { describe, it, expect } from "vitest";
import {
  computeLayoutGeometry,
  BALL_RADIUS_PX,
  INCH_PX,
  projectToSphere,
} from "./layoutGeometry";
import { dualAngleTo2LS } from "./layoutEngine";

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

  it("uses a custom PAP position when provided (grip moves, pin stays)", () => {
    const custom = computeLayoutGeometry(layout, { over: 5, up: 1 });
    expect(custom.pap.x - custom.grip.x).toBeCloseTo(5 * INCH_PX, 1);
    expect(custom.grip.y - custom.pap.y).toBeCloseTo(1 * INCH_PX, 1);
  });

  it("keeps the pin anchored at the same spot across different layouts", () => {
    const a = computeLayoutGeometry({
      drillingAngle: 30,
      pinToPap: 3,
      valAngle: 25,
    });
    const b = computeLayoutGeometry({
      drillingAngle: 70,
      pinToPap: 5.5,
      valAngle: 60,
    });
    expect(a.pin.x).toBeCloseTo(b.pin.x, 5);
    expect(a.pin.y).toBeCloseTo(b.pin.y, 5);
  });

  it("places the PSA at the true PSA-to-PAP distance", () => {
    const g = computeLayoutGeometry(layout);
    const expected = dualAngleTo2LS(layout).psaToPap * INCH_PX;
    const actual = Math.hypot(g.psa.x - g.pap.x, g.psa.y - g.pap.y);
    expect(actual).toBeCloseTo(expected, 0);
  });

  it("straddles the fingers around the grip point for no-thumb grips", () => {
    const g = computeLayoutGeometry(layout, undefined, "right", true);
    expect(g.fingers[0].y).toBeCloseTo(g.grip.y, 5);
    expect(g.fingers[1].y).toBeCloseTo(g.grip.y, 5);
    expect((g.fingers[0].x + g.fingers[1].x) / 2).toBeCloseTo(g.grip.x, 5);
  });

  it("one-handed: center-of-grip reference, fingers above and thumb below by half the span", () => {
    const g = computeLayoutGeometry(layout, undefined, "right", false, 4.5);
    expect(g.grip.y - g.fingers[0].y).toBeCloseTo(2.25 * INCH_PX, 1);
    expect(g.grip.y - g.fingers[1].y).toBeCloseTo(2.25 * INCH_PX, 1);
    expect(g.thumb.y - g.grip.y).toBeCloseTo(2.25 * INCH_PX, 1);
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

describe("projectToSphere", () => {
  const center = { x: BALL_RADIUS_PX, y: BALL_RADIUS_PX };

  it("keeps the ball-face center fixed", () => {
    const p = projectToSphere(center);
    expect(p.x).toBeCloseTo(center.x, 5);
    expect(p.y).toBeCloseTo(center.y, 5);
  });

  it("maps a quarter-circumference arc (6.75in) exactly to the rim", () => {
    const p = projectToSphere({ x: center.x + 6.75 * INCH_PX, y: center.y });
    expect(p.x - center.x).toBeCloseTo(BALL_RADIUS_PX, 0);
  });

  it("compresses distances toward the edge (foreshortening)", () => {
    const mid = projectToSphere({ x: center.x + 3.375 * INCH_PX, y: center.y });
    // sin(45deg) * R < linear 3.375in
    expect(mid.x - center.x).toBeLessThan(3.375 * INCH_PX);
    expect(
      Math.abs(mid.x - center.x - BALL_RADIUS_PX * Math.SQRT1_2),
    ).toBeLessThan(1.5);
  });

  it("clamps beyond-horizon points to the rim", () => {
    const p = projectToSphere({ x: center.x + 9 * INCH_PX, y: center.y });
    expect(p.x - center.x).toBeCloseTo(BALL_RADIUS_PX, 0);
  });
});

describe("cg marker", () => {
  it("places the CG on the pin-to-PSA line, 2.5 inches from the pin", () => {
    const g = computeLayoutGeometry(layout);
    const d = Math.hypot(g.cg.x - g.pin.x, g.cg.y - g.pin.y);
    expect(d).toBeCloseTo(2.5 * INCH_PX, 0);
    // collinear with pin->psa
    const cross =
      (g.psa.x - g.pin.x) * (g.cg.y - g.pin.y) -
      (g.psa.y - g.pin.y) * (g.cg.x - g.pin.x);
    expect(Math.abs(cross)).toBeLessThan(200);
  });
});
