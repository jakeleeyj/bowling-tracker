import type { LanePoint } from "./geometry";
import { fitPath } from "./pathFit";

export type TrackedPoint = LanePoint & { tMs: number };

export type ShotStats = {
  speedMph: number;
  /** "pins": foul line to pin hit. "track": distance over time while tracked */
  speedFrom: "pins" | "track";
  /** Board at the foul line */
  releaseBoard: number;
  arrowsBoard: number;
  breakpointBoard: number;
  breakpointFeet: number;
  entryBoard: number;
  /** Board along the smooth fitted line */
  boardAt: (feet: number) => number;
  path: TrackedPoint[];
};

const LANE_FEET = 60;
const ARROWS_FEET = 15;
const MIN_POINTS = 5;
const MIN_TRAVEL_FEET = 20;
const FPS_TO_MPH = 0.681818;
const RELEASE_WINDOW_MS = 500;
// Outside this a pin-hit time is a false trigger (camera shake, pinsetter)
const MIN_PIN_MPH = 8;
const MAX_PIN_MPH = 30;

// Board at a given distance, linearly interpolated between samples.
function interpolate(sorted: TrackedPoint[], feet: number): number {
  const byFeet = [...sorted].sort((a, b) => a.feet - b.feet);
  if (feet <= byFeet[0].feet) return byFeet[0].board;
  const last = byFeet[byFeet.length - 1];
  if (feet >= last.feet) return last.board;
  for (let i = 1; i < byFeet.length; i++) {
    if (byFeet[i].feet >= feet) {
      const a = byFeet[i - 1];
      const b = byFeet[i];
      const t = b.feet === a.feet ? 0 : (feet - a.feet) / (b.feet - a.feet);
      return a.board + t * (b.board - a.board);
    }
  }
  return last.board;
}

// When the ball crossed the foul line: straight-line fit of distance over
// the first half second of tracking, run back to 0 ft.
export function releaseTimeMs(sorted: TrackedPoint[]): number | null {
  const early = sorted.filter((p) => p.tMs <= sorted[0].tMs + RELEASE_WINDOW_MS);
  if (early.length < 3) return null;
  const n = early.length;
  const mt = early.reduce((s, p) => s + p.tMs, 0) / n;
  const mf = early.reduce((s, p) => s + p.feet, 0) / n;
  const den = early.reduce((s, p) => s + (p.tMs - mt) ** 2, 0);
  if (den === 0) return null;
  const slope = early.reduce((s, p) => s + (p.tMs - mt) * (p.feet - mf), 0) / den;
  if (slope <= 0) return null;
  return mt - mf / slope;
}

export function computeShotStats(
  points: TrackedPoint[],
  pinHitMs?: number,
): ShotStats | null {
  if (points.length < MIN_POINTS) return null;
  const sorted = [...points].sort((a, b) => a.tMs - b.tMs);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const travelled = last.feet - first.feet;
  if (travelled < MIN_TRAVEL_FEET) return null;

  const seconds = (last.tMs - first.tMs) / 1000;
  if (seconds <= 0) return null;
  let speedMph = (travelled / seconds) * FPS_TO_MPH;
  let speedFrom: ShotStats["speedFrom"] = "track";
  const releaseMs = releaseTimeMs(sorted);
  if (pinHitMs !== undefined && releaseMs !== null && pinHitMs > releaseMs) {
    const pinMph = (LANE_FEET / ((pinHitMs - releaseMs) / 1000)) * FPS_TO_MPH;
    if (pinMph >= MIN_PIN_MPH && pinMph <= MAX_PIN_MPH) {
      speedMph = pinMph;
      speedFrom = "pins";
    }
  }

  const fit = fitPath(sorted);
  const boardAt = fit ? fit.boardAt : (f: number) => interpolate(sorted, f);
  let breakpointFeet: number;
  if (fit) {
    breakpointFeet = fit.breakpointFeet;
  } else {
    // Furthest point from the release board
    const far = sorted.reduce((m, p) =>
      Math.abs(p.board - first.board) > Math.abs(m.board - first.board) ? p : m,
    );
    breakpointFeet = far.feet;
  }

  return {
    speedMph,
    speedFrom,
    releaseBoard: boardAt(0),
    arrowsBoard: boardAt(ARROWS_FEET),
    breakpointBoard: boardAt(breakpointFeet),
    breakpointFeet,
    entryBoard: boardAt(LANE_FEET),
    boardAt,
    path: sorted,
  };
}
