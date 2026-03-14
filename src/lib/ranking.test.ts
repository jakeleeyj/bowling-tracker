import { describe, it, expect } from "vitest";
import {
  calculateLP,
  getRank,
  getDivisionProgress,
  formatLP,
  getEventWeight,
  EVENT_WEIGHTS,
  CALIBRATION_GAMES,
} from "./ranking";

describe("calculateLP", () => {
  it("returns 0 for empty scores", () => {
    expect(calculateLP([])).toBe(0);
  });

  it("returns starting LP (1200) for a single calibration game of 180 (base)", () => {
    // 180 = base, so 0 gain, but starting LP is 1200
    expect(calculateLP([180])).toBe(1200);
  });

  it("gains LP for above-base scores", () => {
    // Single calibration game of 200: (200-180) * 5 = +100
    expect(calculateLP([200])).toBe(1300);
  });

  it("loses LP for below-base scores", () => {
    // Single calibration game of 140: (140-180) * 5 = -200
    expect(calculateLP([140])).toBe(1000);
  });

  it("calibration games earn 5x LP", () => {
    // 4 calibration games of 200: (200-180) * 5 * 4 = +400
    expect(calculateLP([200, 200, 200, 200])).toBe(1600);
  });

  it("normal games earn 1x LP after calibration", () => {
    // 4 cal games of 180 (0 gain) + 1 normal game of 200 (+20)
    expect(calculateLP([200, 180, 180, 180, 180])).toBe(1220);
  });

  it("LP accumulates over many games", () => {
    // 4 cal + 6 normal, all 200
    // Cal: 4 * (20 * 5) = 400
    // Normal: 6 * 20 = 120
    // Total: 1200 + 400 + 120 = 1720
    const scores = Array.from({ length: 10 }, () => 200);
    expect(calculateLP(scores)).toBe(1720);
  });

  it("applies event weights", () => {
    // 1 cal game of 200, tournament (1.5x): (20 * 1.5 * 5) = 150
    const tournament = calculateLP([200], [1.5]);
    // 1 cal game of 200, casual (1.0x): (20 * 1.0 * 5) = 100
    const casual = calculateLP([200], [1.0]);
    expect(tournament).toBeGreaterThan(casual);
  });

  it("LP floor is 0", () => {
    // Many terrible games should not go below 0
    const scores = Array.from({ length: 50 }, () => 80);
    expect(calculateLP(scores)).toBe(0);
  });
});

describe("getRank", () => {
  it("returns Iron for low LP", () => {
    expect(getRank(500).name).toBe("Iron");
  });

  it("returns Bronze for 1000-1200 range", () => {
    expect(getRank(1100).name).toBe("Bronze");
  });

  it("returns Silver for 1200-1400 range", () => {
    expect(getRank(1300).name).toBe("Silver");
  });

  it("returns Gold for 1400-1600 range", () => {
    expect(getRank(1500).name).toBe("Gold");
  });

  it("returns Platinum for 1600-1800 range", () => {
    expect(getRank(1700).name).toBe("Platinum");
  });

  it("returns Emerald for 1800-2000 range", () => {
    expect(getRank(1900).name).toBe("Emerald");
  });

  it("returns Diamond for 2000-2200 range", () => {
    expect(getRank(2100).name).toBe("Diamond");
  });

  it("returns Challenger for very high LP", () => {
    expect(getRank(3000).name).toBe("Challenger");
  });

  it("includes division for tiered ranks", () => {
    const rank = getRank(1500);
    expect(rank.division).toBeDefined();
    expect(["I", "II", "III", "IV"]).toContain(rank.division);
  });

  it("excludes division for Master, Grandmaster, Challenger", () => {
    expect(getRank(2300).division).toBeUndefined();
    expect(getRank(2500).division).toBeUndefined();
    expect(getRank(3000).division).toBeUndefined();
  });

  it("includes color properties", () => {
    const rank = getRank(1500);
    expect(rank.color).toBeTruthy();
    expect(rank.bgColor).toBeTruthy();
    expect(rank.borderColor).toBeTruthy();
  });
});

describe("getDivisionProgress", () => {
  it("returns 0-100 range", () => {
    const progress = getDivisionProgress(1300);
    expect(progress).toBeGreaterThanOrEqual(0);
    expect(progress).toBeLessThanOrEqual(100);
  });

  it("returns a value between 0 and 100 for various LP values", () => {
    for (const lp of [500, 1100, 1300, 1500, 1700, 1900, 2100, 2300, 3000]) {
      const p = getDivisionProgress(lp);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(100);
    }
  });
});

describe("formatLP", () => {
  it("formats with commas", () => {
    expect(formatLP(1200)).toBe("1,200");
  });

  it("formats large numbers", () => {
    expect(formatLP(2600)).toBe("2,600");
  });

  it("formats zero", () => {
    expect(formatLP(0)).toBe("0");
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
  it("is 4", () => {
    expect(CALIBRATION_GAMES).toBe(4);
  });
});
