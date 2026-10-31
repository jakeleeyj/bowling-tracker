import type { FrameRow } from "@/lib/queries";

export type FrameKind = "X" | "/" | "O";
export type RGB = [number, number, number];
export type RibbonPalette = Record<FrameKind, RGB>;

type RibbonFrame = Pick<
  FrameRow,
  "frame_number" | "roll_1" | "roll_2" | "is_strike" | "is_spare"
>;

export function frameKind(roll1: number, roll2: number | null): FrameKind {
  if (roll1 === 10) return "X";
  if (roll1 + (roll2 ?? 0) === 10) return "/";
  return "O";
}

// One kind per frame, in frame order. Null when the game has no full frame data (quick entry).
export function frameKinds(frames: RibbonFrame[]): FrameKind[] | null {
  if (frames.length < 10) return null;
  return [...frames]
    .sort((a, b) => a.frame_number - b.frame_number)
    .slice(0, 10)
    .map((f) =>
      f.is_strike ? "X" : f.is_spare ? "/" : frameKind(f.roll_1, f.roll_2),
    );
}

// How far out a frame pushes the ribbon: strikes swell it, open frames pull it in
const VALUE: Record<FrameKind, number> = { X: 1, "/": 0.6, O: 0.12 };

export interface RibbonOptions {
  closed: boolean;
  per: number;
  base: number;
  amp: number;
  w0: number;
  w1: number;
  wScale: number;
  rot: number;
  morph: boolean;
  upto?: number;
}

export interface RibbonPoint {
  t: number;
  r: number;
  w: number;
  cos: number;
  sin: number;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const catmullRom = (
  p0: number,
  p1: number,
  p2: number,
  p3: number,
  u: number,
) =>
  0.5 *
  (2 * p1 +
    (-p0 + p2) * u +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u +
    (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u);

function sample(vals: number[], closed: boolean, per: number) {
  const n = vals.length;
  const at = (i: number) =>
    closed ? vals[((i % n) + n) % n] : vals[Math.max(0, Math.min(n - 1, i))];
  const segs = closed ? n : n - 1;
  const out: { t: number; v: number }[] = [];
  for (let i = 0; i < segs; i++) {
    for (let s = 0; s < per; s++) {
      const u = s / per;
      out.push({
        t: i + u,
        v: catmullRom(at(i - 1), at(i), at(i + 1), at(i + 2), u),
      });
    }
  }
  out.push({ t: segs, v: closed ? vals[0] : vals[n - 1] });
  return out;
}

// Frame i sits at (i + 0.5) * 36 degrees from the top
export function ribbonPoints(
  kinds: FrameKind[],
  o: RibbonOptions,
  time: number,
  seed: number,
): RibbonPoint[] {
  const n = kinds.length;
  const vals = kinds.map(
    (k, i) =>
      VALUE[k] +
      (o.morph
        ? 0.07 *
          Math.sin(time * 0.0007 * (1 + seed * 0.13) + i * 1.9 + seed * 2.3)
        : 0),
  );
  const upto = o.upto ?? n;
  const raw = o.closed
    ? sample(vals, true, o.per)
    : sample([vals[0], ...vals, vals[n - 1]], false, o.per)
        .map((p) => ({ ...p, t: p.t - 1 }))
        .filter((p) => p.t >= -0.5 && p.t <= upto + 1e-6);
  return raw.map((p) => {
    const v = Math.max(0, p.v);
    const a = ((o.rot + (p.t + 0.5) * 36 - 90) * Math.PI) / 180;
    return {
      t: p.t,
      r: o.base + o.amp * v,
      w: lerp(o.w0, o.w1, v) * o.wScale,
      cos: Math.cos(a),
      sin: Math.sin(a),
    };
  });
}

const mix = (a: RGB, b: RGB, t: number): RGB =>
  a.map((v, i) => Math.round(lerp(v, b[i], t))) as RGB;
const css = (c: RGB) => `rgb(${c.join(",")})`;

// Colour follows the angle, so one conic gradient blends every frame with no seams
export function ribbonFill(
  ctx: CanvasRenderingContext2D,
  c: number,
  kinds: FrameKind[],
  palette: RibbonPalette,
  rot: number,
  closed: boolean,
): CanvasGradient | string {
  const cols = kinds.map((k) => palette[k]);
  const n = cols.length;
  if (typeof ctx.createConicGradient !== "function") {
    const top = (["X", "/", "O"] as FrameKind[]).reduce((best, k) =>
      kinds.filter((x) => x === k).length >
      kinds.filter((x) => x === best).length
        ? k
        : best,
    );
    return css(palette[top]);
  }
  const g = ctx.createConicGradient(((rot - 90) * Math.PI) / 180, c, c);
  const wrap = css(mix(cols[n - 1], cols[0], 0.5));
  g.addColorStop(0, closed ? wrap : css(cols[0]));
  cols.forEach((col, i) => g.addColorStop((i + 0.5) / n, css(col)));
  g.addColorStop(1, closed ? wrap : css(cols[n - 1]));
  return g;
}

// One filled band (outer edge out, inner edge back), so the ribbon has no segment joins
export function drawBand(
  ctx: CanvasRenderingContext2D,
  c: number,
  pts: RibbonPoint[],
  closed: boolean,
  fill: CanvasGradient | string,
  alpha: number,
) {
  const at = (p: RibbonPoint, s: number) => [
    c + (p.r + (s * p.w) / 2) * p.cos,
    c + (p.r + (s * p.w) / 2) * p.sin,
  ];
  ctx.globalAlpha = alpha;
  ctx.fillStyle = fill;
  ctx.beginPath();
  pts.forEach((p, i) => {
    const [x, y] = at(p, 1);
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  });
  if (closed) {
    ctx.closePath();
    for (let i = pts.length - 1; i >= 0; i--) {
      const [x, y] = at(pts[i], -1);
      if (i === pts.length - 1) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill("evenodd");
    return;
  }
  for (let i = pts.length - 1; i >= 0; i--) {
    const [x, y] = at(pts[i], -1);
    ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  for (const p of [pts[0], pts[pts.length - 1]]) {
    ctx.beginPath();
    ctx.arc(c + p.r * p.cos, c + p.r * p.sin, p.w / 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Pie-wedge clip that sweeps clockwise from the top over the intro
export function clipReveal(
  ctx: CanvasRenderingContext2D,
  c: number,
  elapsed: number,
) {
  const p = Math.min(1, elapsed / 1600);
  const e = 1 - Math.pow(1 - p, 3);
  if (e >= 1) return;
  ctx.beginPath();
  ctx.moveTo(c, c);
  ctx.arc(c, c, c * 2, -Math.PI / 2, -Math.PI / 2 + e * Math.PI * 2);
  ctx.closePath();
  ctx.clip();
}

export function parseColor(value: string): RGB {
  const v = value.trim();
  if (v.startsWith("#")) {
    const hex =
      v.length === 4
        ? [...v.slice(1)].map((h) => h + h).join("")
        : v.slice(1, 7);
    return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)) as RGB;
  }
  const nums = v.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0];
  return [nums[0], nums[1], nums[2]];
}
