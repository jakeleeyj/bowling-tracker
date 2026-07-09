export type Pt = { x: number; y: number };
export type LanePoint = { board: number; feet: number };
export type Calibration = {
  foulLeft: Pt;
  foulRight: Pt;
  deckLeft: Pt;
  deckRight: Pt;
};

const LANE_BOARDS = 39;
const LANE_FEET = 60;

// Solve Ax = b via Gaussian elimination with partial pivoting. A is n x n.
function solve(a: number[][], b: number[]): number[] {
  const n = b.length;
  const m = a.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(m[r][col]) > Math.abs(m[pivot][col])) pivot = r;
    }
    [m[col], m[pivot]] = [m[pivot], m[col]];
    const p = m[col][col];
    if (Math.abs(p) < 1e-10) throw new Error("degenerate calibration points");
    for (let r = col + 1; r < n; r++) {
      const f = m[r][col] / p;
      for (let c = col; c <= n; c++) m[r][c] -= f * m[col][c];
    }
  }
  const x = new Array<number>(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = m[r][n];
    for (let c = r + 1; c < n; c++) s -= m[r][c] * x[c];
    if (Math.abs(m[r][r]) < 1e-10)
      throw new Error("degenerate calibration points");
    x[r] = s / m[r][r];
  }
  return x;
}

// Homography mapping pixel -> normalized lane coords:
// u: 0 at left edge, 1 at right edge; v: 0 at foul line, 1 at pin deck.
export function computeHomography(cal: Calibration): number[] {
  const src: Pt[] = [cal.foulLeft, cal.foulRight, cal.deckLeft, cal.deckRight];
  const dst: Pt[] = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
  ];
  // Standard DLT: 8 equations, unknowns h0..h7 (h8 = 1).
  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = src[i];
    const { x: u, y: v } = dst[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    b.push(v);
  }
  const h = solve(A, b);
  return [...h, 1];
}

export function pixelToLane(h: number[], p: Pt): LanePoint {
  const w = h[6] * p.x + h[7] * p.y + h[8];
  const u = (h[0] * p.x + h[1] * p.y + h[2]) / w;
  const v = (h[3] * p.x + h[4] * p.y + h[5]) / w;
  // u=0 is the LEFT edge => board 39; u=1 is the RIGHT edge => board 1.
  // Allow one board of slack past each gutter (0..40): a ball riding the
  // edge keeps its real shape instead of drawing a fake straight line
  // pinned at board 1/39. 0 or 40 reads as "in the gutter".
  const board = Math.max(
    0,
    Math.min(LANE_BOARDS + 1, LANE_BOARDS - u * (LANE_BOARDS - 1)),
  );
  const feet = v * LANE_FEET;
  return { board, feet };
}
