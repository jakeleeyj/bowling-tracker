import type { LanePoint } from "./geometry";
import {
  computeShotStats,
  type ShotStats,
  type TrackedPoint,
} from "./shotStats";

export type ShotEvent =
  | { type: "idle" }
  | { type: "tracking"; path: TrackedPoint[] }
  | { type: "complete"; stats: ShotStats }
  | { type: "discarded" };

const START_FEET = 1; // ignore motion before the foul line
const MAX_START_FEET = 30; // a shot must be first seen in the front half
const END_FEET = 55; // ball considered at the pins
const LOST_MS = 1000; // no detection for this long while tracking => finish
const STALL_MS = 900; // no down-lane progress for this long => finish
const PROGRESS_FEET = 0.5; // minimum feet gain that counts as progress
// Physically impossible moves are contamination (pin scatter, sweep, another
// lane). Budgets scale with time since the last accepted point, so a few
// missed detector frames don't turn real ball movement into a "teleport".
// 0.105 ft/ms ≈ 70 mph; floors cover single-frame jitter.
const MAX_JUMP_FEET_PER_MS = 0.105;
const MIN_JUMP_FEET = 3.5;
const MAX_JUMP_BOARDS_PER_MS = 0.24;
const MIN_JUMP_BOARDS = 8;

export class ShotSession {
  private path: TrackedPoint[] = [];
  private lastSeenMs = 0;
  private tracking = false;
  private maxFeet = 0;
  private lastProgressMs = 0;
  private trackId: number | undefined;
  // Why the last finish() fired — for the offline tuning harness.
  lastFinishReason = "";

  onFrame(hit: LanePoint | null, tMs: number, trackId?: number): ShotEvent {
    // The detector switched to a different object (e.g. from a foot to the
    // real ball): wrap up whatever we were following and start fresh.
    if (this.tracking && hit && trackId !== this.trackId) {
      const ev = this.finish("track-switch");
      this.startIfEligible(hit, tMs, trackId);
      return ev;
    }

    if (!this.tracking) {
      if (this.startIfEligible(hit, tMs, trackId)) {
        return { type: "tracking", path: this.path };
      }
      return { type: "idle" };
    }

    if (hit) {
      // Reject teleports: treat them as a missed frame instead.
      const last = this.path[this.path.length - 1];
      const dt = tMs - last.tMs;
      const feetBudget = Math.max(MIN_JUMP_FEET, MAX_JUMP_FEET_PER_MS * dt);
      const boardBudget = Math.max(
        MIN_JUMP_BOARDS,
        MAX_JUMP_BOARDS_PER_MS * dt,
      );
      if (
        Math.abs(hit.feet - last.feet) > feetBudget ||
        Math.abs(hit.board - last.board) > boardBudget
      ) {
        if (tMs - this.lastSeenMs >= LOST_MS) return this.finish("jump-lost");
        return { type: "tracking", path: this.path };
      }
      this.path.push({ ...hit, tMs });
      this.lastSeenMs = tMs;
      if (hit.feet >= this.maxFeet + PROGRESS_FEET) {
        this.maxFeet = hit.feet;
        this.lastProgressMs = tMs;
      }
      if (hit.feet >= END_FEET) return this.finish("end");
      // Still "detecting" something but not going anywhere down-lane:
      // that's flicker noise (or a dead ball) — wrap it up. A real shot
      // that travelled far enough completes; noise gets discarded by the
      // stats validator.
      if (tMs - this.lastProgressMs >= STALL_MS) return this.finish("stall");
      return { type: "tracking", path: this.path };
    }

    if (tMs - this.lastSeenMs >= LOST_MS) return this.finish("lost");
    return { type: "tracking", path: this.path };
  }

  private startIfEligible(
    hit: LanePoint | null,
    tMs: number,
    trackId?: number,
  ): boolean {
    if (!hit || hit.feet < START_FEET || hit.feet > MAX_START_FEET) {
      return false;
    }
    this.tracking = true;
    this.path = [{ ...hit, tMs }];
    this.lastSeenMs = tMs;
    this.maxFeet = hit.feet;
    this.lastProgressMs = tMs;
    this.trackId = trackId;
    return true;
  }

  private finish(reason = ""): ShotEvent {
    this.lastFinishReason = reason;
    const stats = computeShotStats(this.path);
    this.tracking = false;
    this.path = [];
    this.trackId = undefined;
    return stats ? { type: "complete", stats } : { type: "discarded" };
  }
}
