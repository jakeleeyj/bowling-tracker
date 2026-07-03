import type { LanePoint } from "./geometry";

export type TrackedPoint = LanePoint & { tMs: number };

export type ShotStats = {
  speedMph: number;
  releaseBoard: number;
  arrowsBoard: number;
  breakpointBoard: number;
  entryBoard: number;
  path: TrackedPoint[];
};

const ARROWS_FEET = 15;
const MIN_POINTS = 5;
const MIN_TRAVEL_FEET = 20;
const FPS_TO_MPH = 0.681818;

// Board at a given distance, linearly interpolated between samples.
function boardAt(points: TrackedPoint[], feet: number): number {
  const sorted = [...points].sort((a, b) => a.feet - b.feet);
  if (feet <= sorted[0].feet) return sorted[0].board;
  const last = sorted[sorted.length - 1];
  if (feet >= last.feet) return last.board;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].feet >= feet) {
      const a = sorted[i - 1];
      const b = sorted[i];
      const t = b.feet === a.feet ? 0 : (feet - a.feet) / (b.feet - a.feet);
      return a.board + t * (b.board - a.board);
    }
  }
  return last.board;
}

export function computeShotStats(points: TrackedPoint[]): ShotStats | null {
  if (points.length < MIN_POINTS) return null;
  const sorted = [...points].sort((a, b) => a.tMs - b.tMs);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const travelled = last.feet - first.feet;
  if (travelled < MIN_TRAVEL_FEET) return null;

  const seconds = (last.tMs - first.tMs) / 1000;
  if (seconds <= 0) return null;
  const speedMph = (travelled / seconds) * FPS_TO_MPH;

  // Breakpoint: for a right-handed hook the ball swings toward board 1
  // (right), so the breakpoint is the minimum board reached. If the shot
  // drifts the other way (lefty), it's the maximum. Pick whichever deviates
  // most from the release board.
  const releaseBoard = first.board;
  let minB = Infinity;
  let maxB = -Infinity;
  for (const p of sorted) {
    if (p.board < minB) minB = p.board;
    if (p.board > maxB) maxB = p.board;
  }
  const breakpointBoard =
    Math.abs(minB - releaseBoard) >= Math.abs(maxB - releaseBoard) ? minB : maxB;

  return {
    speedMph,
    releaseBoard,
    arrowsBoard: boardAt(sorted, ARROWS_FEET),
    breakpointBoard,
    entryBoard: last.board,
    path: sorted,
  };
}
