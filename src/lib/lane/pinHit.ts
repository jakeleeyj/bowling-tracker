import type { Calibration } from "./geometry";

const CHANGE_LEVEL = 25; // grey levels a pixel must jump to count as moving
const CHANGE_SHARE = 0.025; // share of the pin box that must move at once

/**
 * Watches the pins, just above the deck line, for the first big movement
 * once armed. Frame-to-frame differences, so lighting drift doesn't trigger.
 */
export class PinHitWatcher {
  private x0: number;
  private x1: number;
  private y0: number;
  private y1: number;
  private need: number;
  private prev: Uint8ClampedArray | null = null;
  private armed = false;
  hitMs: number | null = null;

  constructor(w: number, h: number, cal: Calibration) {
    const left = Math.min(cal.deckLeft.x, cal.deckRight.x);
    const right = Math.max(cal.deckLeft.x, cal.deckRight.x);
    const deckY = (cal.deckLeft.y + cal.deckRight.y) / 2;
    // Pins stand about half a lane-width tall in the picture
    this.x0 = Math.max(0, Math.round(left));
    this.x1 = Math.min(w, Math.round(right));
    this.y0 = Math.max(0, Math.round(deckY - 0.5 * (right - left)));
    this.y1 = Math.min(h, Math.round(deckY));
    this.need = Math.max(
      1,
      CHANGE_SHARE * (this.x1 - this.x0) * (this.y1 - this.y0),
    );
  }

  arm() {
    this.armed = true;
  }

  feed(gray: Uint8ClampedArray, w: number, tMs: number) {
    const prev = this.prev;
    this.prev = gray;
    if (!this.armed || this.hitMs !== null || !prev) return;
    let moved = 0;
    for (let y = this.y0; y < this.y1; y++) {
      for (let x = this.x0; x < this.x1; x++) {
        const i = y * w + x;
        if (Math.abs(gray[i] - prev[i]) > CHANGE_LEVEL) moved++;
      }
    }
    if (moved >= this.need) this.hitMs = tMs;
  }
}
