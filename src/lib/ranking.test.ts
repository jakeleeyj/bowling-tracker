import { describe, it, expect } from "vitest";
import {
  calculateMMR,
  getRank,
  getDivisionProgress,
  formatMMR,
  getEventWeight,
  EVENT_WEIGHTS,
  CALIBRATION_GAMES,
} from "./ranking";

describe("calculateMMR", () => {
  it("returns 0 for empty scores", () => {
    expect(calculateMMR([])).toBe(0);
  });

  it("returns 0 for a single game of 180 (base score)", () => {
    expect(calculateMMR([180])).toBe(0);
  });

  it("returns positive MMR for above-average scores", () => {
    expect(calculateMMR([220])).toBe(40);
  });

  it("returns negative MMR for below-average scores", () => {
    expect(calculateMMR([140])).toBe(-40);
  });

  it("weights recent games more heavily", () => {
    // Recent 220 followed by old 140 — should be positive
    const recentHigh = calculateMMR([220, 140]);
    // Recent 140 followed by old 220 — should be negative-ish
    const recentLow = calculateMMR([140, 220]);
    expect(recentHigh).toBeGreaterThan(recentLow);
  });

  it("applies event weights", () => {
    const noWeight = calculateMMR([220], [1.0]);
    const tournament = calculateMMR([220], [1.5]);
    // Both are single game, so weight doesn't change the ratio
    // (score - 180) * weight / weight = same
    expect(noWeight).toBe(tournament);

    // But with mixed games, tournament weight matters more
    const mixed = calculateMMR([220, 140], [1.5, 1.0]);
    const mixedNoWeight = calculateMMR([220, 140], [1.0, 1.0]);
    // Tournament 220 weighted higher should increase MMR
    expect(mixed).toBeGreaterThan(mixedNoWeight);
  });

  it("handles many games with decay", () => {
    const scores = Array.from({ length: 20 }, () => 200);
    const mmr = calculateMMR(scores);
    expect(mmr).toBe(20); // All 200s → deviation of +20 from 180
  });
});

describe("getRank", () => {
  it("returns Iron for very low MMR", () => {
    expect(getRank(-50).name).toBe("Iron");
  });

  it("returns Bronze for -40 to -20 range", () => {
    expect(getRank(-30).name).toBe("Bronze");
  });

  it("returns Silver for -20 to 10 range", () => {
    expect(getRank(0).name).toBe("Silver");
  });

  it("returns Gold for 10 to 35 range", () => {
    expect(getRank(20).name).toBe("Gold");
  });

  it("returns Grandmaster for very high MMR", () => {
    expect(getRank(100).name).toBe("Grandmaster");
  });

  it("includes division for non-Master tiers", () => {
    const rank = getRank(0);
    expect(rank.division).toBeDefined();
    expect(["I", "II", "III", "IV"]).toContain(rank.division);
  });

  it("excludes division for Master and Grandmaster", () => {
    expect(getRank(80).division).toBeUndefined();
    expect(getRank(100).division).toBeUndefined();
  });

  it("includes color properties", () => {
    const rank = getRank(20);
    expect(rank.color).toBeTruthy();
    expect(rank.bgColor).toBeTruthy();
    expect(rank.borderColor).toBeTruthy();
  });
});

describe("getDivisionProgress", () => {
  it("returns 0-100 range", () => {
    const progress = getDivisionProgress(0);
    expect(progress).toBeGreaterThanOrEqual(0);
    expect(progress).toBeLessThanOrEqual(100);
  });

  it("returns a value between 0 and 100", () => {
    // Test across several MMR values
    for (const mmr of [-50, -20, 0, 20, 50, 80, 100]) {
      const p = getDivisionProgress(mmr);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(100);
    }
  });
});

describe("formatMMR", () => {
  it("adds + prefix for positive", () => {
    expect(formatMMR(25)).toBe("+25");
  });

  it("shows negative as-is", () => {
    expect(formatMMR(-10)).toBe("-10");
  });

  it("shows zero without prefix", () => {
    expect(formatMMR(0)).toBe("0");
  });
});

describe("getEventWeight", () => {
  it("returns 1.0 for null", () => {
    expect(getEventWeight(null)).toBe(1.0);
  });

  it("returns 1.0 for unknown labels", () => {
    expect(getEventWeight("Random")).toBe(1.0);
  });

  it("returns correct weight for Tournament", () => {
    expect(getEventWeight("Tournament")).toBe(EVENT_WEIGHTS.Tournament);
  });

  it("returns correct weight for League", () => {
    expect(getEventWeight("League")).toBe(EVENT_WEIGHTS.League);
  });
});

describe("CALIBRATION_GAMES", () => {
  it("is a positive number", () => {
    expect(CALIBRATION_GAMES).toBeGreaterThan(0);
  });
});
