import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getCurrentSeason,
  getPreviousSeason,
  getSeasonByNumber,
} from "./seasons";

describe("season rollover", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("reproduces the stuck-cron bug: after S1 ends, the current season's end is always in the future", () => {
    // Jul 7 2026 — a week after Season 1 ended
    vi.setSystemTime(new Date("2026-07-07T12:00:00+08:00"));

    const current = getCurrentSeason();
    expect(current.number).toBe(2);
    // The old cron checked `now < currentSeason.end` and exited — this is
    // why end_season never fired.
    expect(new Date() < current.end).toBe(true);

    // The fixed cron checks the previous season instead.
    const prev = getPreviousSeason();
    expect(prev?.number).toBe(1);
    expect(prev && new Date() > prev.end).toBe(true);
  });

  it("returns the hardcoded Season 1 as previous during Season 2", () => {
    vi.setSystemTime(new Date("2026-08-15T12:00:00+08:00"));
    const prev = getPreviousSeason();
    expect(prev?.name).toBe("Season 1");
    expect(prev?.start.toISOString()).toBe(
      new Date("2026-03-19T00:00:00+08:00").toISOString(),
    );
  });

  it("returns generated Season 2 as previous during Season 3 (H1 2027)", () => {
    vi.setSystemTime(new Date("2027-01-02T12:00:00+08:00"));
    expect(getCurrentSeason().number).toBe(3);
    const prev = getPreviousSeason();
    expect(prev?.number).toBe(2);
    expect(prev?.end.toISOString()).toBe(
      new Date("2026-12-31T23:59:59+08:00").toISOString(),
    );
  });

  it("has no previous season during Season 1", () => {
    vi.setSystemTime(new Date("2026-05-01T12:00:00+08:00"));
    expect(getPreviousSeason()).toBeNull();
  });

  it("generates consistent seasons by number", () => {
    expect(getSeasonByNumber(4)?.start.toISOString()).toBe(
      new Date("2027-07-01T00:00:00+08:00").toISOString(),
    );
    expect(getSeasonByNumber(5)?.start.toISOString()).toBe(
      new Date("2028-01-01T00:00:00+08:00").toISOString(),
    );
    expect(getSeasonByNumber(0)).toBeNull();
  });
});
