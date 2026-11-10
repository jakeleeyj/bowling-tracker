import type { LanePoint } from "./geometry";

export type PathFit = {
  /** Board at a distance down the lane, on the smooth curve */
  boardAt: (feet: number) => number;
  /** Where the ball stops drifting out and starts hooking back */
  breakpointFeet: number;
};

const HOOK_START_MIN = 15;
const HOOK_START_MAX = 56;
const HOOK_START_STEP = 0.5;
const OUTLIER_BOARDS = 1.5;
const REFIT_ROUNDS = 4;
const MIN_KEPT = 8;
// A hook has to be seen, not guessed from a couple of points at the end
const MIN_HOOK_POINTS = 6;
// The line has to stay on the lane (one board of gutter slack each side)
const MIN_BOARD = -1;
const MAX_BOARD = 41;

// Least squares via the normal equations, any number of columns.
function leastSquares(rows: number[][], ys: number[]): number[] | null {
  const n = rows[0].length;
  const m = Array.from({ length: n }, (_, i) => [
    ...Array.from({ length: n }, (_, j) =>
      rows.reduce((s, r) => s + r[i] * r[j], 0),
    ),
    rows.reduce((s, r, k) => s + r[i] * ys[k], 0),
  ]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) {
      if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r;
    }
    [m[c], m[p]] = [m[p], m[c]];
    if (Math.abs(m[c][c]) < 1e-9) return null;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const k = m[r][c] / m[c][c];
      for (let j = c; j <= n; j++) m[r][j] -= k * m[c][j];
    }
  }
  return m.map((r, i) => r[n] / m[i][i]);
}

type Model = {
  score: number;
  boardAt: (f: number) => number;
  hookStart: number | null;
  coef: number[];
};

// Fit one candidate shape, trimming outliers; null if it isn't believable.
function fitModel(points: LanePoint[], hookStart: number | null): Model | null {
  const columns = (f: number) =>
    hookStart === null ? [1, f] : [1, f, Math.max(0, f - hookStart) ** 2];
  const at = (coef: number[], f: number) =>
    columns(f).reduce((s, v, i) => s + v * coef[i], 0);

  let kept = points;
  let coef: number[] | null = null;
  for (let round = 0; round < REFIT_ROUNDS; round++) {
    const next = leastSquares(
      kept.map((p) => columns(p.feet)),
      kept.map((p) => p.board),
    );
    if (!next) break;
    coef = next;
    const fitted = next;
    const inliers = points.filter(
      (p) => Math.abs(at(fitted, p.feet) - p.board) < OUTLIER_BOARDS,
    );
    if (inliers.length < MIN_KEPT) break;
    kept = inliers;
  }
  if (!coef) return null;
  const fitted = coef;
  const boardAt = (f: number) => at(fitted, f);

  if (
    hookStart !== null &&
    kept.filter((p) => p.feet > hookStart).length < MIN_HOOK_POINTS
  ) {
    return null;
  }
  for (let f = 0; f <= 60; f++) {
    const b = boardAt(f);
    if (b < MIN_BOARD || b > MAX_BOARD) return null;
  }

  const err = kept.reduce((s, p) => s + (boardAt(p.feet) - p.board) ** 2, 0);
  // A trimmed point costs as much as one sitting right at the cut-off
  const score = err + (points.length - kept.length) * OUTLIER_BOARDS ** 2;
  return { score, boardAt, hookStart, coef };
}

/**
 * Fit the shape a bowling shot makes: a straight skid, then a parabolic hook
 * from `hookStart` on. board = a + b*f + c*max(0, f - hookStart)^2.
 * Tracker glitches (reflections, pin scatter) are trimmed as outliers.
 */
export function fitPath(points: LanePoint[]): PathFit | null {
  if (points.length < MIN_KEPT) return null;
  let best = fitModel(points, null);
  for (let hs = HOOK_START_MIN; hs <= HOOK_START_MAX; hs += HOOK_START_STEP) {
    const m = fitModel(points, hs);
    if (m && (!best || m.score < best.score)) best = m;
  }
  if (!best) return null;

  let breakpointFeet = 60;
  if (best.hookStart !== null) {
    const [, b, c] = best.coef;
    // Vertex of the hook parabola, if it turns back within the lane
    const vertex = c !== 0 ? best.hookStart - b / (2 * c) : Infinity;
    if (vertex >= best.hookStart && vertex <= 60) breakpointFeet = vertex;
  }
  return { boardAt: best.boardAt, breakpointFeet };
}
