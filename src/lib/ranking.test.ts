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

  it("returns starting LP (1200) for a single calibration game of 185 (base)", () => {
    // 185 = base, so 0 gain, but starting LP is 1200
    expect(calculateLP([185])).toBe(1200);
  });

  it("gains LP for above-base scores", () => {
    // Single calibration game of 200: (200-185) * 5 = +75
    expect(calculateLP([200])).toBe(1275);
  });

  it("loses LP for below-base scores", () => {
    // Single calibration game of 140: (140-185) * 5 = -225
    expect(calculateLP([140])).toBe(975);
  });

  it("calibration games earn 5x LP", () => {
    // 4 calibration games of 200 with linear recency decay
    // i=3: 15*5*max(0.25, 1-0.0375)=15*5*0.9625=72
    // i=2: 15*5*max(0.25, 1-0.025)=15*5*0.975=73
    // i=1: 15*5*max(0.25, 1-0.0125)=15*5*0.9875=74
    // i=0: 15*5*max(0.25, 1-0)=15*5*1.0=75
    // Total: 1200 + 72+73+74+75 = 1494
    expect(calculateLP([200, 200, 200, 200])).toBe(1494);
  });

  it("normal games earn 1x LP after calibration", () => {
    // 4 cal games of 185 (0 gain) + 1 normal game of 200 (+15)
    expect(calculateLP([200, 185, 185, 185, 185])).toBe(1215);
  });

  it("LP accumulates over many games", () => {
    // 4 cal + 6 normal, all 200, with linear recency decay
    const scores = Array.from({ length: 10 }, () => 200);
    const lp = calculateLP(scores);
    // Should be between 1500 and 1650 (decay reduces older games)
    expect(lp).toBeGreaterThan(1500);
    expect(lp).toBeLessThan(1650);
  });

  it("ignores event weights during calibration", () => {
    // Calibration games always use 1.0 event weight
    const tournament = calculateLP([200], [1.5]);
    const casual = calculateLP([200], [1.0]);
    expect(tournament).toBe(casual);
  });

  it("applies event weights after calibration", () => {
    // 4 cal + 1 normal: tournament weight only affects the 5th game
    const scores = [200, 200, 200, 200, 200];
    const tournamentW = [1.5, 1.0, 1.0, 1.0, 1.0];
    const casualW = [1.0, 1.0, 1.0, 1.0, 1.0];
    expect(calculateLP(scores, tournamentW)).toBeGreaterThan(
      calculateLP(scores, casualW),
    );
  });

  it("LP floor is 0", () => {
    // Many terrible games should not go below 0
    const scores = Array.from({ length: 50 }, () => 80);
    expect(calculateLP(scores)).toBe(0);
  });

  it("recent games count more than old games (recency weighting)", () => {
    // 45 games total: 4 calibration (185) + 41 normal
    // Compare a 220 at position 5 (recent, 1.0x) vs position 35 (older, 0.5x)
    const cal = Array.from({ length: 4 }, () => 185);

    // 220 is the 5th newest game (index 4, recency 1.0x)
    const recentScores = [
      ...cal,
      ...Array(4).fill(185),
      220,
      ...Array(36).fill(185),
    ];
    // 220 is the 35th newest game (index 34, recency 0.5x)
    const oldScores = [
      ...cal,
      ...Array(34).fill(185),
      220,
      ...Array(6).fill(185),
    ];

    const lpRecent = calculateLP(recentScores);
    const lpOld = calculateLP(oldScores);

    // Recent 220 (1.0x) should give more LP than older 220 (0.5x)
    expect(lpRecent).toBeGreaterThan(lpOld);
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
