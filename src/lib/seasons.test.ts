import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  vi,
} from "vitest";
import {
  getCurrentSeason,
  getPreviousSeason,
  getSeasonByNumber,
  sgtToday,
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

// Vercel runs in UTC; the cron fires at 16:00 UTC = 00:00 SGT. Seasons follow
// the Singapore calendar, so force UTC here to catch server-local date math.
describe("season boundary in Asia/Singapore time", () => {
  const originalTz = process.env.TZ;

  beforeAll(() => {
    process.env.TZ = "UTC";
  });

  afterAll(() => {
    process.env.TZ = originalTz;
  });

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("1 Jul 00:30 SGT resolves to the July season", () => {
    vi.setSystemTime(new Date("2026-06-30T16:30:00Z"));
    expect(getCurrentSeason().number).toBe(2);
  });

  it("30 Jun 23:30 SGT resolves to the June-side season", () => {
    vi.setSystemTime(new Date("2026-06-30T15:30:00Z"));
    expect(getCurrentSeason().number).toBe(1);
  });

  it("1 Jan 00:30 SGT resolves to the January season (generated path)", () => {
    vi.setSystemTime(new Date("2026-12-31T16:30:00Z"));
    expect(getCurrentSeason().number).toBe(3);
  });

  it("31 Dec 23:30 SGT resolves to the July-side season (generated path)", () => {
    vi.setSystemTime(new Date("2026-12-31T15:30:00Z"));
    expect(getCurrentSeason().number).toBe(2);
  });

  it("the end-season cron tick on 30 Jun closes Season 1", () => {
    vi.setSystemTime(new Date("2026-06-30T16:00:00Z"));
    expect(getPreviousSeason()?.number).toBe(1);
  });

  it("the end-season cron tick on 31 Dec closes Season 2", () => {
    vi.setSystemTime(new Date("2026-12-31T16:00:00Z"));
    expect(getPreviousSeason()?.number).toBe(2);
  });

  it("the cron tick the night before a rollover does nothing new", () => {
    vi.setSystemTime(new Date("2027-06-29T16:00:00Z"));
    expect(getCurrentSeason().number).toBe(3);
    expect(getPreviousSeason()?.number).toBe(2);
  });

  it("returns the real Season 1 in the gap after its last second", () => {
    vi.setSystemTime(new Date("2026-06-30T15:59:59.500Z"));
    expect(getCurrentSeason().start.toISOString()).toBe(
      new Date("2026-03-19T00:00:00+08:00").toISOString(),
    );
  });
});

describe("sgtToday", () => {
  it("uses the Singapore calendar date, not UTC", () => {
    // 2026-10-28 23:30 UTC = 2026-10-29 07:30 SGT
    expect(sgtToday(new Date("2026-10-28T23:30:00Z"))).toBe("2026-10-29");
    // 2026-10-29 15:59 UTC = 2026-10-29 23:59 SGT
    expect(sgtToday(new Date("2026-10-29T15:59:00Z"))).toBe("2026-10-29");
  });
});
