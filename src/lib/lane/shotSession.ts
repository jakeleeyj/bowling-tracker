import type { LanePoint } from "./geometry";
import { computeShotStats, type ShotStats, type TrackedPoint } from "./shotStats";

export type ShotEvent =
  | { type: "idle" }
  | { type: "tracking"; path: TrackedPoint[] }
  | { type: "complete"; stats: ShotStats }
  | { type: "discarded" };

const START_FEET = 1; // ignore motion before the foul line
const END_FEET = 55; // ball considered at the pins
const LOST_MS = 700; // no detection for this long while tracking => finish

export class ShotSession {
  private path: TrackedPoint[] = [];
  private lastSeenMs = 0;
  private tracking = false;

  onFrame(hit: LanePoint | null, tMs: number): ShotEvent {
    if (!this.tracking) {
      if (hit && hit.feet >= START_FEET) {
        this.tracking = true;
        this.path = [{ ...hit, tMs }];
        this.lastSeenMs = tMs;
        return { type: "tracking", path: this.path };
      }
      return { type: "idle" };
    }

    if (hit) {
      this.path.push({ ...hit, tMs });
      this.lastSeenMs = tMs;
      if (hit.feet >= END_FEET) return this.finish();
      return { type: "tracking", path: this.path };
    }

    if (tMs - this.lastSeenMs >= LOST_MS) return this.finish();
    return { type: "tracking", path: this.path };
  }

  private finish(): ShotEvent {
    const stats = computeShotStats(this.path);
    this.tracking = false;
    this.path = [];
    return stats ? { type: "complete", stats } : { type: "discarded" };
  }
}
