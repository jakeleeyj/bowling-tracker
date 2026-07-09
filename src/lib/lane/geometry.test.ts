import { describe, it, expect } from "vitest";
import { computeHomography, pixelToLane, type Calibration } from "./geometry";

// Trivial camera: lane fills a 100x600 image exactly, no perspective.
const flatCal: Calibration = {
  foulLeft: { x: 0, y: 600 },
  foulRight: { x: 100, y: 600 },
  deckLeft: { x: 0, y: 0 },
  deckRight: { x: 100, y: 0 },
};

// Perspective camera: lane converges toward the top of the frame.
const perspCal: Calibration = {
  foulLeft: { x: 20, y: 500 },
  foulRight: { x: 355, y: 500 },
  deckLeft: { x: 150, y: 80 },
  deckRight: { x: 225, y: 80 },
};

describe("pixelToLane", () => {
  it("maps foul line corners to feet=0 and edge boards", () => {
    const h = computeHomography(flatCal);
    const left = pixelToLane(h, { x: 0, y: 600 });
    const right = pixelToLane(h, { x: 100, y: 600 });
    expect(left.feet).toBeCloseTo(0, 5);
    expect(right.feet).toBeCloseTo(0, 5);
    expect(left.board).toBeCloseTo(39, 5);
    expect(right.board).toBeCloseTo(1, 5);
  });

  it("maps the image center of a flat lane to board 20 at 30 feet", () => {
    const h = computeHomography(flatCal);
    const mid = pixelToLane(h, { x: 50, y: 300 });
    expect(mid.board).toBeCloseTo(20, 5);
    expect(mid.feet).toBeCloseTo(30, 5);
  });

  it("maps perspective corners correctly", () => {
    const h = computeHomography(perspCal);
    expect(pixelToLane(h, perspCal.deckRight).feet).toBeCloseTo(60, 4);
    expect(pixelToLane(h, perspCal.deckRight).board).toBeCloseTo(1, 4);
    expect(pixelToLane(h, perspCal.foulLeft).board).toBeCloseTo(39, 4);
  });

  it("keeps straight lane lines straight under perspective", () => {
    const h = computeHomography(perspCal);
    // Midpoint of left edge in pixel space is NOT the midpoint in lane space,
    // but it must still map to the left edge (board 39).
    const midLeftPx = {
      x: (perspCal.foulLeft.x + perspCal.deckLeft.x) / 2,
      y: (perspCal.foulLeft.y + perspCal.deckLeft.y) / 2,
    };
    expect(pixelToLane(h, midLeftPx).board).toBeCloseTo(39, 3);
  });

  it("clamps board into [0, 40] (one board of gutter slack per side)", () => {
    const h = computeHomography(flatCal);
    expect(pixelToLane(h, { x: -500, y: 300 }).board).toBe(40);
    expect(pixelToLane(h, { x: 800, y: 300 }).board).toBe(0);
  });
});

describe("computeHomography", () => {
  it("throws on degenerate calibration points", () => {
    const cal: Calibration = {
      foulLeft: { x: 0, y: 600 },
      foulRight: { x: 0, y: 600 },
      deckLeft: { x: 0, y: 0 },
      deckRight: { x: 100, y: 0 },
    };
    expect(() => computeHomography(cal)).toThrow();
  });
});
