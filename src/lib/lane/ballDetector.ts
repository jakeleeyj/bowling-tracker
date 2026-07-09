// Ball tracker v2: connected-blob detection, lane masking, multi-track.
//
// v1 averaged every moving pixel into one centroid, so the bowler's body,
// the scoreboard TV and neighbouring lanes all dragged the "ball" around.
// v2 finds discrete moving blobs inside the calibrated lane, follows several
// of them at once (a foot at the foul line, flicker, the ball), and reports
// only the track that behaves like a ball: born near the foul line and
// making consistent progress toward the pin deck. Feet sway in place and
// deck flicker goes nowhere — only the ball travels.

const DIFF_THRESHOLD = 40; // gray levels a pixel must change to count as motion
const BG_ALPHA = 0.05; // background running-average rate
const MIN_BLOB_PIXELS = 5; // below this, noise
const MAX_BLOB_PIXELS = 600; // above this, a person / sweep, not a ball
const MIN_FILL = 0.25; // blob pixels / bounding-box area (compactness)
const MAX_ASPECT = 3; // bounding-box w/h or h/w beyond this = limb, not ball
const LANE_MASK_SCALE = 1.12; // grow the lane quad so edge shots stay inside
const SEARCH_RADIUS = 20; // px: max step a track accepts (ball moves ~1-3px/frame;
// anything further is a different object trying to steal the track)
const MAX_UP_STEP = 8; // px: max plausible per-frame movement toward the deck —
// an arm swing crosses the frame far faster than any rolling ball can
const MISS_LIMIT = 15; // consecutive misses before a track dies (the ball blob
// is tiny downlane and drops out for stretches — give it time to reappear)
const MAX_TRACKS = 5; // simultaneous tracks (ball + feet + flicker is plenty)
const HISTORY = 8; // positions kept per track for behaviour checks
const BALL_MIN_FRAMES = 4; // history needed before a track can be the ball
const BALL_NET_UP = 8; // px net travel toward the deck since birth to qualify
const BALL_SWITCH_MARGIN = 15; // px lead a challenger needs to steal ball status
// (a sliding foot nets ~10px toward the deck; the ball nets its whole journey)
const STAGNANT_TRAVEL = 1.5; // px net travel below which a track goes nowhere
const STAGNANT_LIMIT = 15; // stagnant frames before dropping a track

export function toGrayscale(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(width * height);
  for (let i = 0; i < out.length; i++) {
    const j = i * 4;
    out[i] = (rgba[j] + rgba[j + 1] + rgba[j + 2]) / 3;
  }
  return out;
}

export interface Blob {
  x: number;
  y: number;
  area: number;
}

interface Pt {
  x: number;
  y: number;
}

interface Track {
  id: number;
  pos: Pt;
  vel: Pt;
  born: Pt;
  history: Pt[];
  miss: number;
  stagnant: number;
  area: number;
}

export class BallDetector {
  private bg: Float32Array;
  private frames = 0;
  private readonly size: number;
  private laneMask: Uint8Array | null = null;
  // A ball always enters from the foul-line end (bottom of the lane quad):
  // new tracks may only seed below this row, so pin-deck flicker can't
  // steal the track before the shot.
  private seedMinY = 0;

  // scratch buffers reused across frames
  private mask: Uint8Array;
  private labels: Int32Array;
  private stack: Int32Array;

  // track state
  private tracks: Track[] = [];
  private ballId: number | null = null;
  private nextTrackId = 1;

  // Per-frame diagnostics for the offline tuning harness (cheap to fill).
  debugInfo = {
    rawBlobs: 0,
    candidates: [] as Blob[],
    tracks: 0,
    ballId: null as number | null,
  };

  constructor(
    private width: number,
    private height: number,
  ) {
    this.size = width * height;
    this.bg = new Float32Array(this.size);
    this.mask = new Uint8Array(this.size);
    this.labels = new Int32Array(this.size);
    this.stack = new Int32Array(this.size);
  }

  // Restrict detection to the calibrated lane (quad in frame pixel coords,
  // order: foul left, foul right, deck right, deck left). Scaled up slightly
  // so shots hugging the gutter stay inside.
  setLaneMask(quad: Pt[]): void {
    const cx = quad.reduce((s, p) => s + p.x, 0) / quad.length;
    const cy = quad.reduce((s, p) => s + p.y, 0) / quad.length;
    const poly = quad.map((p) => ({
      x: cx + (p.x - cx) * LANE_MASK_SCALE,
      y: cy + (p.y - cy) * LANE_MASK_SCALE,
    }));
    const mask = new Uint8Array(this.size);
    for (let y = 0; y < this.height; y++) {
      // x-intersections of polygon edges with this row
      const xs: number[] = [];
      for (let i = 0; i < poly.length; i++) {
        const a = poly[i];
        const b = poly[(i + 1) % poly.length];
        if (a.y <= y !== b.y <= y) {
          xs.push(a.x + ((y - a.y) / (b.y - a.y)) * (b.x - a.x));
        }
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const x0 = Math.max(0, Math.floor(xs[k]));
        const x1 = Math.min(this.width - 1, Math.ceil(xs[k + 1]));
        for (let x = x0; x <= x1; x++) mask[y * this.width + x] = 1;
      }
    }
    this.laneMask = mask;
    const ys = quad.map((p) => p.y);
    this.seedMinY = (Math.min(...ys) + Math.max(...ys)) / 2;
  }

  resetTrack(): void {
    this.tracks = [];
    this.ballId = null;
  }

  detect(
    gray: Uint8ClampedArray,
  ): { x: number; y: number; strength: number; trackId: number } | null {
    if (gray.length !== this.size) {
      throw new Error(`expected ${this.size} pixels, got ${gray.length}`);
    }
    this.frames++;
    if (this.frames === 1) {
      this.bg.set(gray);
      return null;
    }

    // 1. Motion mask (lane-limited) + background update on static pixels
    const { mask, bg, laneMask } = this;
    for (let i = 0; i < this.size; i++) {
      const diff = Math.abs(gray[i] - bg[i]);
      if (diff <= DIFF_THRESHOLD) {
        bg[i] = bg[i] * (1 - BG_ALPHA) + gray[i] * BG_ALPHA;
        mask[i] = 0;
      } else {
        mask[i] = laneMask === null || laneMask[i] === 1 ? 1 : 0;
      }
    }

    // 2. Connected blobs (4-neighbour flood fill)
    const candidates = this.findBallBlobs();
    this.debugInfo.candidates = candidates;

    // 3. Multi-track update + ball designation
    const hit = this.step(candidates);
    this.debugInfo.tracks = this.tracks.length;
    this.debugInfo.ballId = this.ballId;
    return hit;
  }

  private findBallBlobs(): Blob[] {
    const { mask, labels, stack, width, height } = this;
    labels.fill(0);
    const blobs: Blob[] = [];
    let label = 0;
    this.debugInfo.rawBlobs = 0;

    for (let i = 0; i < this.size; i++) {
      if (mask[i] !== 1 || labels[i] !== 0) continue;
      label++;
      let top = 0;
      stack[top++] = i;
      labels[i] = label;
      let count = 0;
      let sumX = 0;
      let sumY = 0;
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;

      while (top > 0) {
        const p = stack[--top];
        const px = p % width;
        const py = (p / width) | 0;
        count++;
        sumX += px;
        sumY += py;
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;

        if (px > 0 && mask[p - 1] === 1 && labels[p - 1] === 0) {
          labels[p - 1] = label;
          stack[top++] = p - 1;
        }
        if (px < width - 1 && mask[p + 1] === 1 && labels[p + 1] === 0) {
          labels[p + 1] = label;
          stack[top++] = p + 1;
        }
        if (py > 0 && mask[p - width] === 1 && labels[p - width] === 0) {
          labels[p - width] = label;
          stack[top++] = p - width;
        }
        if (
          py < height - 1 &&
          mask[p + width] === 1 &&
          labels[p + width] === 0
        ) {
          labels[p + width] = label;
          stack[top++] = p + width;
        }
      }

      this.debugInfo.rawBlobs++;
      if (count < MIN_BLOB_PIXELS || count > MAX_BLOB_PIXELS) continue;
      const w = maxX - minX + 1;
      const h = maxY - minY + 1;
      const aspect = Math.max(w / h, h / w);
      const fill = count / (w * h);
      if (aspect > MAX_ASPECT || fill < MIN_FILL) continue;
      blobs.push({ x: sumX / count, y: sumY / count, area: count });
    }
    return blobs;
  }

  private step(
    candidates: Blob[],
  ): { x: number; y: number; strength: number; trackId: number } | null {
    // 1. Assign candidates to existing tracks (nearest within SEARCH_RADIUS,
    // each candidate feeds at most one track).
    const used = new Set<Blob>();
    for (const t of this.tracks) {
      const pred = { x: t.pos.x + t.vel.x, y: t.pos.y + t.vel.y };
      let best: Blob | null = null;
      let bestD = SEARCH_RADIUS;
      for (const c of candidates) {
        if (used.has(c)) continue;
        if (t.pos.y - c.y > MAX_UP_STEP) continue; // faster than any ball
        const d = Math.hypot(c.x - pred.x, c.y - pred.y);
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      if (best) {
        used.add(best);
        t.vel = { x: best.x - t.pos.x, y: best.y - t.pos.y };
        t.pos = { x: best.x, y: best.y };
        t.area = best.area;
        t.history.push(t.pos);
        if (t.history.length > HISTORY) t.history.shift();
        t.miss = 0;
        const first = t.history[0];
        const travelled = Math.hypot(t.pos.x - first.x, t.pos.y - first.y);
        if (
          t.history.length >= BALL_MIN_FRAMES &&
          travelled < STAGNANT_TRAVEL
        ) {
          t.stagnant++;
        } else {
          t.stagnant = 0;
        }
      } else {
        t.miss++;
      }
    }

    // 2. Kill dead tracks (too many misses, or going nowhere).
    this.tracks = this.tracks.filter(
      (t) => t.miss <= MISS_LIMIT && t.stagnant <= STAGNANT_LIMIT,
    );
    if (
      this.ballId !== null &&
      !this.tracks.some((t) => t.id === this.ballId)
    ) {
      this.ballId = null;
    }

    // 3. Spawn tracks for unclaimed candidates near the foul line.
    for (const c of candidates) {
      if (used.has(c) || c.y < this.seedMinY) continue;
      if (this.tracks.length >= MAX_TRACKS) break;
      this.tracks.push({
        id: this.nextTrackId++,
        pos: { x: c.x, y: c.y },
        vel: { x: 0, y: 0 },
        born: { x: c.x, y: c.y },
        history: [{ x: c.x, y: c.y }],
        miss: 0,
        stagnant: 0,
        area: c.area,
      });
    }

    // 4. Designate the ball: the track with the most net travel toward the
    // deck (up the image) since it was born. A sliding foot nets a few px;
    // the ball keeps accumulating for its entire journey — so even if a foot
    // is designated first, the ball overtakes it moments after release.
    const netUp = (t: Track) => t.born.y - t.pos.y;
    let best: Track | null = null;
    for (const t of this.tracks) {
      if (t.history.length < BALL_MIN_FRAMES) continue;
      if (netUp(t) < BALL_NET_UP) continue;
      if (!best || netUp(t) > netUp(best)) best = t;
    }
    const current = this.tracks.find((t) => t.id === this.ballId) ?? null;
    if (!current) {
      this.ballId = best ? best.id : null;
    } else if (
      best &&
      best.id !== current.id &&
      netUp(best) > netUp(current) + BALL_SWITCH_MARGIN
    ) {
      this.ballId = best.id;
    }

    const ball = this.tracks.find((t) => t.id === this.ballId);
    if (ball && ball.miss === 0) {
      return {
        x: ball.pos.x,
        y: ball.pos.y,
        strength: ball.area,
        trackId: ball.id,
      };
    }
    return null;
  }
}
