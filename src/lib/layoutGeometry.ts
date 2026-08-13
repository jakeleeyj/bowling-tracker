// 2D projection of a dual-angle layout onto a ball-face diagram, the way a
// pro shop marks it up. The pin is a fixed physical marker on the ball, so it
// stays anchored; the grip (and with it the PAP) moves as the layout changes.
// Flat projection — illustrative, not drilling-accurate; grip parts that would
// wrap around the ball are clipped at the silhouette.

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
  noThumb = false,
  span = 4.4,
): LayoutGeometry {
  const center: Point = { x: BALL_RADIUS_PX, y: BALL_RADIUS_PX };

  // The pin stays put, top-center like the factory pin marker on a real
  // ball; everything else is laid out relative to it.
  const pin: Point = {
    x: center.x,
    y: center.y - 2.6 * INCH_PX,
  };

  // PAP: pinToPap from the pin, rotated valAngle off the VAL (vertical),
  // down-lane toward the midline.
  const pap: Point = {
    x: pin.x + layout.pinToPap * Math.sin(layout.valAngle * DEG) * INCH_PX,
    y: pin.y + layout.pinToPap * Math.cos(layout.valAngle * DEG) * INCH_PX,
  };

  // Grip center from the PAP: "over" back along the midline, "up" above it.
  const grip: Point = {
    x: pap.x - papPosition.over * INCH_PX,
    y: pap.y + papPosition.up * INCH_PX,
  };
  // Storm convention: the PAP reference point is the bridge center, so the
  // fingers straddle it and (for thumb grips) the thumb sits a span below.
  const fingerGap = 0.4 * INCH_PX;
  const fingers: [Point, Point] = [
    { x: grip.x - fingerGap, y: grip.y },
    { x: grip.x + fingerGap, y: grip.y },
  ];
  const thumb: Point = { x: grip.x, y: grip.y + span * INCH_PX };

  // Keeps a labeled point on the visible ball face.
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
  const psa: Point = clampToBall({
    x: pin.x + dir.x * psaDist,
    y: pin.y + dir.y * psaDist,
  });

  const valHalf = Math.sqrt(
    Math.max(0, BALL_RADIUS_PX ** 2 - (pap.x - center.x) ** 2),
  );
  const geometry: LayoutGeometry = {
    center,
    grip,
    fingers,
    thumb,
    pap: clampToBall(pap),
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
      pap: mirror(geometry.pap),
      pin: mirror(pin),
      psa: mirror(psa),
      valTop: mirror(geometry.valTop),
      valBottom: mirror(geometry.valBottom),
    };
  }
  return geometry;
}
