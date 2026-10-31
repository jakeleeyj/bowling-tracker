import { describe, it, expect } from "vitest";
import {
  type RibbonPalette,
  frameKind,
  frameKinds,
  parseColor,
  scoreBand,
  scorePoints,
  scoreTone,
  bucketScores,
} from "./ribbon";

function f(
  frame_number: number,
  roll_1: number,
  roll_2: number | null = null,
  flags: { is_strike?: boolean; is_spare?: boolean } = {},
) {
  return {
    frame_number,
    roll_1,
    roll_2,
    is_strike: flags.is_strike ?? (frame_number < 10 && roll_1 === 10),
    is_spare:
      flags.is_spare ??
      (frame_number < 10 && roll_1 < 10 && roll_1 + (roll_2 ?? 0) === 10),
  };
}

const game = [
  f(1, 10),
  f(2, 9, 1),
  f(3, 8, 1),
  f(4, 10),
  f(5, 7, 3),
  f(6, 0, 0),
  f(7, 10),
  f(8, 6, 2),
  f(9, 5, 5),
  f(10, 10, 10),
];

describe("frameKinds", () => {
  it("maps strikes, spares and open frames in order", () => {
    expect(frameKinds(game)?.join("")).toBe("X/OX/OXO/X");
  });

  it("sorts frames by frame number", () => {
    expect(frameKinds([...game].reverse())?.join("")).toBe("X/OX/OXO/X");
  });

  it("reads frame 10 from rolls since its flags are not set", () => {
    const spareTenth = [...game.slice(0, 9), f(10, 4, 6)];
    const openTenth = [...game.slice(0, 9), f(10, 4, 5)];
    expect(frameKinds(spareTenth)?.[9]).toBe("/");
    expect(frameKinds(openTenth)?.[9]).toBe("O");
  });

  it("returns null for games without full frame data", () => {
    expect(frameKinds([])).toBeNull();
    expect(frameKinds(game.slice(0, 9))).toBeNull();
  });
});

describe("frameKind", () => {
  it("reads one frame from its rolls, including one still in progress", () => {
    expect(frameKind(10, null)).toBe("X");
    expect(frameKind(3, 7)).toBe("/");
    expect(frameKind(3, 4)).toBe("O");
    expect(frameKind(3, null)).toBe("O");
  });
});

describe("parseColor", () => {
  it("reads hex and rgb strings", () => {
    expect(parseColor(" #ffd60a")).toEqual([255, 214, 10]);
    expect(parseColor("#fff")).toEqual([255, 255, 255]);
    expect(parseColor("rgb(100, 210, 255)")).toEqual([100, 210, 255]);
  });
});

describe("score ribbon", () => {
  const palette: RibbonPalette = {
    X: [100, 210, 255],
    "/": [255, 214, 10],
    O: [110, 110, 118],
  };

  it("bands games against the average", () => {
    expect(scoreBand(215, 200)).toBe("above");
    expect(scoreBand(205, 200)).toBe("near");
    expect(scoreBand(190, 200)).toBe("below");
  });

  it("tones grey well below, spare at the average, strike well above", () => {
    expect(scoreTone(150, 200, palette)).toEqual([110, 110, 118]);
    expect(scoreTone(200, 200, palette)).toEqual([255, 214, 10]);
    expect(scoreTone(260, 200, palette)).toEqual([100, 210, 255]);
  });

  it("places one point per game from the top and closes the loop", () => {
    const pts = scorePoints([150, 300, 225], {
      base: 50,
      amp: 20,
      w0: 1,
      w1: 3,
      rot: 0,
      per: 1,
    });
    // One point per game plus the closing point back at the first game
    expect(pts).toHaveLength(4);
    expect(pts[0].r).toBe(50);
    expect(pts[1].r).toBe(70);
    expect(pts[0].sin).toBeCloseTo(-1);
    expect(pts[3].r).toBe(pts[0].r);
    expect(pts[3].sin).toBeCloseTo(-1);
  });
});

describe("bucketScores", () => {
  it("averages consecutive runs of games into the requested number of points", () => {
    expect(bucketScores([100, 200, 300, 400], 2)).toEqual([150, 350]);
    expect(bucketScores([100, 200, 300, 400, 500, 600], 3)).toEqual([
      150, 350, 550,
    ]);
  });

  it("keeps every game when there are fewer games than points", () => {
    expect(bucketScores([180, 220], 24)).toEqual([180, 220]);
  });
});
