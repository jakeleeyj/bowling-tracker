import { describe, it, expect } from "vitest";
import { frameKinds, parseColor } from "./ribbon";

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

describe("parseColor", () => {
  it("reads hex and rgb strings", () => {
    expect(parseColor(" #ffd60a")).toEqual([255, 214, 10]);
    expect(parseColor("#fff")).toEqual([255, 255, 255]);
    expect(parseColor("rgb(100, 210, 255)")).toEqual([100, 210, 255]);
  });
});
