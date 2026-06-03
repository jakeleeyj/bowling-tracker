import { describe, it, expect } from "vitest";
import {
  actionPoints,
  computeTotals,
  standings,
  frameCounts,
  playerSummary,
  rulesFromPreset,
  currentGameIndex,
  endsFrame,
  tenthFrameClosed,
  PRESETS,
  DEFAULT_RULES,
  type MinigameState,
  type MinigameEvent,
} from "./minigame";

let seq = 0;
function evt(
  playerId: string,
  type: MinigameEvent["type"],
  points: number,
  gameIndex = 0,
  frameIndex = 0,
): MinigameEvent {
  seq += 1;
  return { id: `e-${seq}`, playerId, type, points, gameIndex, frameIndex };
}

function baseState(overrides: Partial<MinigameState> = {}): MinigameState {
  return {
    step: "playing",
    rules: { ...DEFAULT_RULES },
    players: [
      { id: "a", name: "Alice" },
      { id: "b", name: "Bob" },
    ],
    events: [],
    games: [],
    frameByPlayer: { a: 0, b: 0 },
    pickingWinner: false,
    ...overrides,
  };
}

describe("actionPoints", () => {
  it("returns rule values for strike and corner made", () => {
    expect(actionPoints("strike", DEFAULT_RULES)).toBe(2);
    expect(actionPoints("cornerMade", DEFAULT_RULES)).toBe(2);
  });

  it("returns the spare points (0 by default — a marker)", () => {
    expect(actionPoints("spare", DEFAULT_RULES)).toBe(0);
    expect(actionPoints("spare", { ...DEFAULT_RULES, sparePoints: 1 })).toBe(1);
  });

  it("returns 0 for a missed corner when penalty is off", () => {
    expect(actionPoints("cornerMissed", DEFAULT_RULES)).toBe(0);
  });

  it("returns negative penalty for a missed corner when penalty is on", () => {
    const rules = {
      ...DEFAULT_RULES,
      penaltyEnabled: true,
      cornerMissPenalty: 1,
    };
    expect(actionPoints("cornerMissed", rules)).toBe(-1);
  });
});

describe("endsFrame", () => {
  it("ends the frame on strike, spare, and miss", () => {
    expect(endsFrame("strike")).toBe(true);
    expect(endsFrame("spare")).toBe(true);
    expect(endsFrame("cornerMissed")).toBe(true);
  });

  it("does NOT end the frame on a made corner (a miss may follow)", () => {
    expect(endsFrame("cornerMade")).toBe(false);
  });
});

describe("tenthFrameClosed", () => {
  const TENTH = 9;
  it("is open until 3 inputs", () => {
    const s = baseState({
      events: [
        evt("a", "strike", 2, 0, TENTH),
        evt("a", "strike", 2, 0, TENTH),
      ],
    });
    expect(tenthFrameClosed(s, "a", 0)).toBe(false);
  });

  it("closes at 3 inputs", () => {
    const s = baseState({
      events: [
        evt("a", "strike", 2, 0, TENTH),
        evt("a", "cornerMade", 2, 0, TENTH),
        evt("a", "spare", 0, 0, TENTH),
      ],
    });
    expect(tenthFrameClosed(s, "a", 0)).toBe(true);
  });

  it("closes immediately on an open", () => {
    const s = baseState({
      events: [
        evt("a", "cornerMade", 2, 0, TENTH),
        evt("a", "cornerMissed", -1, 0, TENTH),
      ],
    });
    expect(tenthFrameClosed(s, "a", 0)).toBe(true);
  });
});

describe("currentGameIndex", () => {
  it("equals the number of completed games", () => {
    expect(currentGameIndex(baseState())).toBe(0);
    expect(currentGameIndex(baseState({ games: [{ winnerId: "a" }] }))).toBe(1);
  });
});

describe("computeTotals", () => {
  it("sums event points per player across frames and games", () => {
    const state = baseState({
      events: [
        evt("a", "strike", 2, 0, 0),
        evt("a", "cornerMade", 2, 0, 3),
        evt("a", "strike", 2, 1, 5),
        evt("b", "strike", 2, 0, 0),
      ],
    });
    const totals = computeTotals(state);
    expect(totals.a).toBe(6);
    expect(totals.b).toBe(2);
  });

  it("adds the winner bonus for each game won", () => {
    const state = baseState({
      events: [evt("a", "strike", 2, 0, 0)],
      games: [{ winnerId: "b" }, { winnerId: "b" }],
    });
    const totals = computeTotals(state);
    expect(totals.a).toBe(2);
    expect(totals.b).toBe(6); // two game wins x +3
  });

  it("ignores winner bonus for a tied game (null winner)", () => {
    const state = baseState({ games: [{ winnerId: null }] });
    expect(computeTotals(state).a).toBe(0);
  });

  it("can go negative with miss penalties", () => {
    const state = baseState({
      events: [
        evt("a", "cornerMissed", -1, 0, 0),
        evt("a", "cornerMissed", -1, 0, 1),
      ],
    });
    expect(computeTotals(state).a).toBe(-2);
  });
});

describe("standings", () => {
  it("sorts by total descending", () => {
    const state = baseState({
      events: [evt("b", "strike", 2), evt("b", "strike", 2)],
    });
    const result = standings(state);
    expect(result[0].player.id).toBe("b");
    expect(result[0].rank).toBe(1);
    expect(result[1].rank).toBe(2);
  });

  it("assigns shared rank on ties and keeps entry order", () => {
    const result = standings(baseState());
    expect(result[0].rank).toBe(1);
    expect(result[1].rank).toBe(1);
    expect(result.map((r) => r.player.id)).toEqual(["a", "b"]);
  });
});

describe("frameCounts", () => {
  it("counts a player's events in a specific game + frame", () => {
    const state = baseState({
      events: [
        evt("a", "strike", 2, 0, 0),
        evt("a", "strike", 2, 0, 0),
        evt("a", "cornerMade", 2, 0, 1),
        evt("a", "strike", 2, 1, 0),
      ],
    });
    expect(frameCounts(state, "a", 0, 0)).toEqual({
      strikes: 2,
      spares: 0,
      cornerMade: 0,
      cornerMissed: 0,
    });
    expect(frameCounts(state, "a", 0, 1)).toEqual({
      strikes: 0,
      spares: 0,
      cornerMade: 1,
      cornerMissed: 0,
    });
  });

  it("stacks corner + miss within one frame (the +2 −1 case)", () => {
    const rules = {
      ...DEFAULT_RULES,
      penaltyEnabled: true,
      cornerMissPenalty: 1,
    };
    const state = baseState({
      rules,
      events: [
        evt("a", "cornerMade", 2, 0, 2),
        evt("a", "cornerMissed", -1, 0, 2),
      ],
    });
    expect(frameCounts(state, "a", 0, 2)).toEqual({
      strikes: 0,
      spares: 0,
      cornerMade: 1,
      cornerMissed: 1,
    });
    expect(computeTotals(state).a).toBe(1);
  });

  it("counts a whole game when frameIndex omitted", () => {
    const state = baseState({
      events: [
        evt("a", "strike", 2, 0, 0),
        evt("a", "spare", 0, 0, 3),
        evt("a", "strike", 2, 1, 0),
      ],
    });
    expect(frameCounts(state, "a", 0)).toEqual({
      strikes: 1,
      spares: 1,
      cornerMade: 0,
      cornerMissed: 0,
    });
  });
});

describe("playerSummary", () => {
  it("totals events across the session and counts games won", () => {
    const state = baseState({
      events: [
        evt("a", "strike", 2, 0, 0),
        evt("a", "strike", 2, 1, 0),
        evt("a", "cornerMade", 2, 0, 3),
        evt("a", "cornerMissed", 0, 1, 5),
      ],
      games: [{ winnerId: "a" }, { winnerId: "b" }],
    });
    expect(playerSummary(state, "a")).toEqual({
      strikes: 2,
      spares: 0,
      cornerMade: 1,
      cornerMissed: 1,
      gamesWon: 1,
    });
  });
});

describe("rulesFromPreset", () => {
  it("applies preset point values while preserving penalty settings", () => {
    const base = {
      ...DEFAULT_RULES,
      penaltyEnabled: true,
      cornerMissPenalty: 2,
    };
    const preset = PRESETS.find((p) => p.id === "1-1-2")!;
    const rules = rulesFromPreset(preset, base);
    expect(rules.strikePoints).toBe(1);
    expect(rules.cornerPoints).toBe(1);
    expect(rules.winnerPoints).toBe(2);
    expect(rules.penaltyEnabled).toBe(true);
    expect(rules.cornerMissPenalty).toBe(2);
  });
});
