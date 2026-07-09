// Auto-detect lane edges from a grayscale "clean plate" (median of frames).
//
// BETA. Strategy: bowling gutters are dark strips flanking bright lane wood.
// Scan rows outward from the frame centre for sustained dark bands, fit a
// robust line per side, and read the foul/deck rows off the extent of rows
// where the fits hold. Occlusion (bowler, ball return) breaks sides
// independently, so each side is returned only when confident — the caller
// merges with existing handle positions.

import type { Pt } from "./geometry";

const ROW_STEP = 2;
const DARK_RATIO = 0.72; // a gutter is at most this fraction of lane brightness
const FIT_TOLERANCE = 6; // px: candidate agrees with the line fit
const MIN_INLIERS = 12; // rows required to trust a side
const MIN_INLIER_RATIO = 0.55;

export interface EdgeSuggestion {
  foulLeft?: Pt;
  foulRight?: Pt;
  deckLeft?: Pt;
  deckRight?: Pt;
}

interface Fit {
  a: number; // x = a*y + b
  b: number;
}

function fitLine(pts: Pt[]): Fit | null {
  const slopes: number[] = [];
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      if (Math.abs(pts[j].y - pts[i].y) < 4) continue;
      slopes.push((pts[j].x - pts[i].x) / (pts[j].y - pts[i].y));
    }
  }
  if (slopes.length === 0) return null;
  slopes.sort((p, q) => p - q);
  const a = slopes[Math.floor(slopes.length / 2)];
  const bs = pts.map((p) => p.x - a * p.y).sort((p, q) => p - q);
  return { a, b: bs[Math.floor(bs.length / 2)] };
}

function inliers(pts: Pt[], f: Fit): Pt[] {
  return pts.filter((p) => Math.abs(f.a * p.y + f.b - p.x) < FIT_TOLERANCE);
}

export function suggestLaneEdges(
  plate: Uint8ClampedArray,
  width: number,
  height: number,
): EdgeSuggestion {
  const cx = Math.floor(width / 2);
  // Scan the vertical band where the lane usually lives when filmed from
  // behind the approach: roughly the middle half of the frame.
  const yTop = Math.floor(height * 0.45);
  const yBottom = Math.floor(height * 0.75);

  const leftPts: Pt[] = [];
  const rightPts: Pt[] = [];

  const prof = new Float32Array(width);
  for (let y = yTop; y <= yBottom; y += ROW_STEP) {
    for (let x = 2; x < width - 2; x++) {
      prof[x] =
        (plate[y * width + x - 2] +
          plate[y * width + x - 1] +
          plate[y * width + x] +
          plate[y * width + x + 1] +
          plate[y * width + x + 2]) /
        5;
    }
    const band: number[] = [];
    for (let x = cx - 40; x < cx + 40; x++) band.push(prof[x]);
    band.sort((a, b) => a - b);
    const laneLum = band[Math.floor(band.length / 2)];
    const dark = laneLum * DARK_RATIO;

    for (let x = cx; x > 8; x--) {
      if (prof[x] < dark && prof[x - 3] < dark) {
        leftPts.push({ x, y });
        break;
      }
    }
    for (let x = cx; x < width - 8; x++) {
      if (prof[x] < dark && prof[x + 3] < dark) {
        rightPts.push({ x, y });
        break;
      }
    }
  }

  const result: EdgeSuggestion = {};
  const sides: Array<{ pts: Pt[]; key: "left" | "right" }> = [
    { pts: leftPts, key: "left" },
    { pts: rightPts, key: "right" },
  ];

  const fits: Partial<Record<"left" | "right", { fit: Fit; ys: number[] }>> =
    {};
  for (const { pts, key } of sides) {
    const rough = fitLine(pts);
    if (!rough) continue;
    const inl = inliers(pts, rough);
    if (
      inl.length < MIN_INLIERS ||
      inl.length / pts.length < MIN_INLIER_RATIO
    ) {
      continue;
    }
    const fit = fitLine(inl);
    if (!fit) continue;
    // Lane edges converge toward the pins: seen from behind the approach the
    // left edge splays left going down (negative slope) and the right edge
    // splays right (positive slope). A confident line with the wrong slope
    // is some other structure (a divider, the ball return) — reject it.
    if (key === "left" && fit.a > -0.02) continue;
    if (key === "right" && fit.a < 0.02) continue;
    fits[key] = { fit, ys: inl.map((p) => p.y) };
  }

  // Foul/deck rows from the union of confident sides' extents.
  const allYs = [...(fits.left?.ys ?? []), ...(fits.right?.ys ?? [])];
  if (allYs.length === 0) return result;
  const yDeck = Math.min(...allYs);
  const yFoul = Math.max(...allYs);
  if (yFoul - yDeck < height * 0.06) return result; // too short to be a lane

  const at = (f: Fit, y: number): Pt => ({
    x: Math.round(f.a * y + f.b),
    y,
  });
  if (fits.left) {
    result.foulLeft = at(fits.left.fit, yFoul);
    result.deckLeft = at(fits.left.fit, yDeck);
  }
  if (fits.right) {
    result.foulRight = at(fits.right.fit, yFoul);
    result.deckRight = at(fits.right.fit, yDeck);
  }
  return result;
}

// Build a per-pixel median "clean plate" from N grayscale frames — moving
// things (bowler, ball) vanish, the lane stays.
export function medianPlate(
  frames: Uint8ClampedArray[],
  size: number,
): Uint8ClampedArray {
  const plate = new Uint8ClampedArray(size);
  const vals = new Array<number>(frames.length);
  for (let i = 0; i < size; i++) {
    for (let f = 0; f < frames.length; f++) vals[f] = frames[f][i];
    vals.sort((a, b) => a - b);
    plate[i] = vals[Math.floor(frames.length / 2)];
  }
  return plate;
}
