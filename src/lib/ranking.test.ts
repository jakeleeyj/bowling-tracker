import { describe, it, expect } from "vitest";
import {
  calculateLP,
  getRank,
  getDivisionProgress,
  formatLP,
  formatLPDelta,
  formatCalibrationGamesLeft,
  isCalibrationSession,
  gamesBeforeEachSession,
  lpAfterEachSession,
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

describe("getDivisionProgress tiers", () => {
  it("keeps progress within the division for divisioned tiers", () => {
    // Gold 1400-1600, divisions of 50 LP
    expect(getDivisionProgress(1400)).toBe(0);
    expect(getDivisionProgress(1425)).toBe(50);
    expect(getDivisionProgress(1450)).toBe(0);
    expect(getDivisionProgress(1599)).toBe(98);
    // Iron 0-1000, divisions of 250 LP
    expect(getDivisionProgress(125)).toBe(50);
  });

  it("uses progress across the whole tier for Master, floored", () => {
    expect(getDivisionProgress(2200)).toBe(0);
    expect(getDivisionProgress(2300)).toBe(50);
    expect(getDivisionProgress(2399)).toBe(99);
  });

  it("uses progress across the whole tier for Grandmaster", () => {
    expect(getDivisionProgress(2400)).toBe(0);
    expect(getDivisionProgress(2450)).toBe(25);
    expect(getDivisionProgress(2599)).toBe(99);
  });

  it("is always 100 for Challenger", () => {
    expect(getDivisionProgress(2600)).toBe(100);
    expect(getDivisionProgress(3000)).toBe(100);
    expect(getDivisionProgress(9999)).toBe(100);
  });
});

describe("formatLPDelta", () => {
  it("prefixes gains with a plus", () => {
    expect(formatLPDelta(12)).toBe("+12 LP");
  });

  it("prefixes losses with a true minus sign", () => {
    expect(formatLPDelta(-8)).toBe("\u22128 LP");
    expect(formatLPDelta(-8)).not.toContain("-");
  });

  it("shows zero without a sign", () => {
    expect(formatLPDelta(0)).toBe("0 LP");
  });

  it("formats large deltas with separators", () => {
    expect(formatLPDelta(1234)).toBe("+1,234 LP");
    expect(formatLPDelta(-1234)).toBe("\u22121,234 LP");
  });
});

describe("formatCalibrationGamesLeft", () => {
  it("pluralises", () => {
    expect(formatCalibrationGamesLeft(0)).toBe("4 more games to rank");
    expect(formatCalibrationGamesLeft(2)).toBe("2 more games to rank");
  });

  it("uses singular for one game", () => {
    expect(formatCalibrationGamesLeft(3)).toBe("1 more game to rank");
  });

  it("never goes negative", () => {
    expect(formatCalibrationGamesLeft(7)).toBe("0 more games to rank");
  });
});

function session(id: string, userId: string, gameCount: number) {
  return { id, user_id: userId, games: Array.from({ length: gameCount }) };
}

describe("gamesBeforeEachSession", () => {
  it("counts back from lifetime totals for mixed users", () => {
    const feed = [
      session("a3", "alice", 3),
      session("b2", "bob", 2),
      session("a2", "alice", 3),
      session("b1", "bob", 2),
      session("a1", "alice", 4),
    ];
    const result = gamesBeforeEachSession(feed, { alice: 10, bob: 4 });
    expect(result).toEqual({ a3: 7, a2: 4, a1: 0, b2: 2, b1: 0 });
    expect(isCalibrationSession(result.a1)).toBe(true);
    expect(isCalibrationSession(result.a2)).toBe(false);
    expect(isCalibrationSession(result.b1)).toBe(true);
    expect(isCalibrationSession(result.b2)).toBe(true);
  });

  it("gives the same answer whether one or two pages are loaded", () => {
    // Veteran with 40 lifetime games, 3 games per session
    const page1 = Array.from({ length: 5 }, (_, i) =>
      session(`s${i}`, "vet", 3),
    );
    const page2 = Array.from({ length: 5 }, (_, i) =>
      session(`s${i + 5}`, "vet", 3),
    );
    const onePage = gamesBeforeEachSession(page1, { vet: 40 });
    const twoPages = gamesBeforeEachSession([...page1, ...page2], {
      vet: 40,
    });
    for (const s of page1) expect(twoPages[s.id]).toBe(onePage[s.id]);
    // The oldest loaded session of a veteran is not a calibration session
    expect(isCalibrationSession(onePage.s4)).toBe(false);
    expect(isCalibrationSession(twoPages.s9)).toBe(false);
  });

  it("treats exactly 4 games in one session as calibration", () => {
    const result = gamesBeforeEachSession([session("only", "new", 4)], {
      new: 4,
    });
    expect(result.only).toBe(0);
    expect(isCalibrationSession(result.only)).toBe(true);
  });

  it("marks only the sessions that contain the first 4 games", () => {
    const result = gamesBeforeEachSession(
      [session("fifth", "p", 1), session("first4", "p", 4)],
      { p: 5 },
    );
    expect(result).toEqual({ fifth: 4, first4: 0 });
    expect(isCalibrationSession(result.fifth)).toBe(false);
    expect(isCalibrationSession(result.first4)).toBe(true);
  });

  it("treats a session that straddles game 4 as calibration", () => {
    const result = gamesBeforeEachSession(
      [session("later", "p", 3), session("first", "p", 3)],
      { p: 6 },
    );
    expect(isCalibrationSession(result.later)).toBe(true);
  });
});

describe("lpAfterEachSession", () => {
  it("walks back from each player's current LP", () => {
    const feed = [
      { id: "a2", user_id: "alice" },
      { id: "b1", user_id: "bob" },
      { id: "a1", user_id: "alice" },
    ];
    const result = lpAfterEachSession(
      feed,
      { a2: 20, b1: -10, a1: 15 },
      { alice: 1500, bob: 1300 },
    );
    expect(result).toEqual({ a2: 1500, a1: 1480, b1: 1300 });
  });

  it("stops the chain at the first session without a delta", () => {
    const feed = [
      { id: "s3", user_id: "p" },
      { id: "s2", user_id: "p" },
      { id: "s1", user_id: "p" },
    ];
    const result = lpAfterEachSession(feed, { s3: 10, s1: 5 }, { p: 1400 });
    expect(result).toEqual({ s3: 1400 });
  });

  it("skips players with no known current LP", () => {
    const result = lpAfterEachSession(
      [{ id: "x", user_id: "ghost" }],
      { x: 10 },
      {},
    );
    expect(result).toEqual({});
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

  it("uses en-SG separators", () => {
    expect(formatLP(1234567)).toBe("1,234,567");
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
