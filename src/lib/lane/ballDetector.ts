const DIFF_THRESHOLD = 40; // gray levels a pixel must change to count as motion
const MIN_BLOB_PIXELS = 8; // below this, treat as noise
const BG_ALPHA = 0.05; // background running-average rate

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

export class BallDetector {
  private bg: Float32Array;
  private frames = 0;
  private readonly size: number;

  constructor(
    private width: number,
    private height: number,
  ) {
    this.size = width * height;
    this.bg = new Float32Array(this.size);
  }

  detect(
    gray: Uint8ClampedArray,
  ): { x: number; y: number; strength: number } | null {
    if (gray.length !== this.size) {
      throw new Error(`expected ${this.size} pixels, got ${gray.length}`);
    }
    this.frames++;
    if (this.frames === 1) {
      this.bg.set(gray);
      return null;
    }

    let count = 0;
    let sumX = 0;
    let sumY = 0;
    for (let i = 0; i < this.size; i++) {
      const diff = Math.abs(gray[i] - this.bg[i]);
      if (diff > DIFF_THRESHOLD) {
        count++;
        sumX += i % this.width;
        sumY += (i / this.width) | 0;
      }
      // Update background only where the scene is static, so the ball
      // doesn't get absorbed into the background mid-shot.
      if (diff <= DIFF_THRESHOLD) {
        this.bg[i] = this.bg[i] * (1 - BG_ALPHA) + gray[i] * BG_ALPHA;
      }
    }

    if (count < MIN_BLOB_PIXELS) return null;
    return { x: sumX / count, y: sumY / count, strength: count };
  }
}
