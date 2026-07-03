import { describe, it, expect } from "vitest";
import { thinPath } from "./pathThinning";

describe("thinPath", () => {
  it("keeps first and last point for a 90-point path with maxPoints=60", () => {
    const path = Array.from({ length: 90 }, (_, i) => ({
      board: i,
      feet: i * 0.1,
      tMs: i * 16,
    }));

    const result = thinPath(path, 60);

    // First point should be at index 0
    expect(result[0]).toEqual(path[0]);
    // Last point should be the original last point
    expect(result[result.length - 1]).toEqual(path[89]);
  });

  it("result length is at most 61 for a 90-point path with maxPoints=60", () => {
    const path = Array.from({ length: 90 }, (_, i) => ({
      board: i,
      feet: i * 0.1,
      tMs: i * 16,
    }));

    const result = thinPath(path, 60);

    // With step=2, we keep indices 0, 2, 4, ..., 88, 89
    // That's roughly 45 points + the final point = at most 61
    expect(result.length).toBeLessThanOrEqual(61);
  });

  it("returns unchanged path for paths shorter than maxPoints", () => {
    const path = Array.from({ length: 50 }, (_, i) => ({
      board: i,
      feet: i * 0.1,
      tMs: i * 16,
    }));

    const result = thinPath(path, 60);

    expect(result).toEqual(path);
  });

  it("returns empty array for empty path", () => {
    const path: Array<{ board: number; feet: number; tMs: number }> = [];

    const result = thinPath(path, 60);

    expect(result).toEqual([]);
  });
});
