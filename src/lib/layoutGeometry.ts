// 2D projection of a dual-angle layout onto a ball-face diagram, the way a
// pro shop marks it up: grip center in the middle, PAP out to the right on the
// midline, VAL vertical through the PAP, pin up-lane from the PAP.
// Flat projection — illustrative, not drilling-accurate.

import { dualAngleTo2LS, type DualAngleLayout } from "./layoutEngine";

export const BALL_RADIUS_PX = 150;
// 8.59" ball diameter mapped to the 300px circle
export const INCH_PX = (BALL_RADIUS_PX * 2) / 8.59;

const DEG = Math.PI / 180;

export interface Point {
  x: number;
  y: number;
}

export interface LayoutGeometry {
  center: Point;
  grip: Point;
  fingers: [Point, Point];
  thumb: Point;
  pap: Point;
  pin: Point;
  psa: Point;
  valTop: Point;
  valBottom: Point;
}

export interface PapPosition {
  over: number;
  up: number;
}

const DEFAULT_PAP: PapPosition = { over: 4.5, up: 0 };

export type Handedness = "right" | "left";

export function computeLayoutGeometry(
  layout: DualAngleLayout,
  papPosition: PapPosition = DEFAULT_PAP,
  hand: Handedness = "right",
): LayoutGeometry {
  const center: Point = { x: BALL_RADIUS_PX, y: BALL_RADIUS_PX };
  // grip center left of ball center so the PAP fits on the right
  const grip: Point = { x: center.x - 1.4 * INCH_PX, y: center.y };
  const fingerGap = 0.55 * INCH_PX;
  const fingers: [Point, Point] = [
    { x: grip.x - fingerGap, y: grip.y - 2.1 * INCH_PX },
    { x: grip.x + fingerGap, y: grip.y - 2.1 * INCH_PX },
  ];
  const thumb: Point = { x: grip.x, y: grip.y + 2.3 * INCH_PX };

  // PAP measured from grip center: "over" along the midline, "up" above it
  const pap: Point = {
    x: grip.x + papPosition.over * INCH_PX,
    y: grip.y - papPosition.up * INCH_PX,
  };

  // Keeps a point on the visible ball face — the flat projection pushes
  // long layouts past the silhouette that would wrap around a real ball.
  const clampToBall = (p: Point): Point => {
    const max = BALL_RADIUS_PX * 0.92;
    const d = Math.hypot(p.x - center.x, p.y - center.y);
    if (d <= max) return p;
    const k = max / d;
    return {
      x: center.x + (p.x - center.x) * k,
      y: center.y + (p.y - center.y) * k,
    };
  };

  // Pin: from the PAP, rotated valAngle off the VAL (vertical), toward the
  // grip side, up toward the fingers.
  const rawPin: Point = {
    x: pap.x - layout.pinToPap * Math.sin(layout.valAngle * DEG) * INCH_PX,
    y: pap.y - layout.pinToPap * Math.cos(layout.valAngle * DEG) * INCH_PX,
  };
  const pin = clampToBall(rawPin);

  // PSA: at the pin, drillingAngle between pin→PSA and pin→PAP, rotated
  // down-lane (clockwise). Placed along that ray at the distance that makes
  // |PSA−PAP| equal the true 2LS PSA-to-PAP measurement.
  const toPap = Math.atan2(pap.y - pin.y, pap.x - pin.x);
  const psaAngle = toPap + layout.drillingAngle * DEG;
  const dir: Point = { x: Math.cos(psaAngle), y: Math.sin(psaAngle) };
  const targetPsaToPap = dualAngleTo2LS(layout).psaToPap * INCH_PX;
  const v: Point = { x: pin.x - pap.x, y: pin.y - pap.y };
  const b = v.x * dir.x + v.y * dir.y;
  const c = v.x * v.x + v.y * v.y - targetPsaToPap * targetPsaToPap;
  const disc = b * b - c;
  const psaDist = disc >= 0 ? -b + Math.sqrt(disc) : 2.2 * INCH_PX;
  const psa: Point = {
    x: pin.x + dir.x * psaDist,
    y: pin.y + dir.y * psaDist,
  };

  const valHalf = Math.sqrt(
    Math.max(0, BALL_RADIUS_PX ** 2 - (pap.x - center.x) ** 2),
  );
  const geometry: LayoutGeometry = {
    center,
    grip,
    fingers,
    thumb,
    pap,
    pin,
    psa,
    valTop: { x: pap.x, y: center.y - valHalf },
    valBottom: { x: pap.x, y: center.y + valHalf },
  };
  if (hand === "left") {
    const mirror = (p: Point): Point => ({ x: 2 * center.x - p.x, y: p.y });
    return {
      center,
      grip: mirror(grip),
      fingers: [mirror(geometry.fingers[0]), mirror(geometry.fingers[1])],
      thumb: mirror(thumb),
      pap: mirror(pap),
      pin: mirror(pin),
      psa: mirror(psa),
      valTop: mirror(geometry.valTop),
      valBottom: mirror(geometry.valBottom),
    };
  }
  return geometry;
}
