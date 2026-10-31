import { describe, expect, it } from "vitest";
import type { FrameData } from "@/lib/bowling";
import { formatRoll } from "./FrameScorecard";

function tenth(r1: number, r2: number | null, r3: number | null): FrameData {
  return {
    frameNumber: 10,
    roll1: r1,
    roll2: r2,
    roll3: r3,
    isStrike: r1 === 10,
    isSpare: r1 < 10 && r2 !== null && r1 + r2 === 10,
    pinsRemaining: null,
    pinsRemainingRoll2: null,
    pinsRemainingRoll3: null,
    spareConverted: false,
  };
}

const marks = (f: FrameData) =>
  ([1, 2, 3] as const).map((r) => formatRoll(f, r, 10)).join(" ");

describe("10th frame marks", () => {
  it("shows a gutter then all ten as a spare", () => {
    expect(marks(tenth(0, 10, 4))).toBe("- / 4");
  });

  it("shows a strike, a gutter, then all ten as a spare, not a strike", () => {
    expect(marks(tenth(10, 0, 10))).toBe("X - /");
  });

  it("still shows three strikes", () => {
    expect(marks(tenth(10, 10, 10))).toBe("X X X");
  });
});
