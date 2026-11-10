import { describe, it, expect } from "vitest";
import { fitPath } from "./pathFit";

// Real track from a glossy lane (IMG_1703 in the browser): the ball's
// reflection and the pin deck add stray points near the end
const glossyLane = [
  [12.0,25.2],[12.4,24.8],[13.1,24.3],[13.4,23.9],[13.7,23.7],[14.1,23.4],[14.6,23.2],[15.1,23.0],[15.7,22.8],[16.2,22.7],[17.0,22.6],[17.7,22.3],[18.0,21.8],[18.3,21.5],[18.6,21.2],[18.9,20.9],[19.4,20.6],[20.0,20.4],[20.5,20.3],[21.1,20.2],[21.9,20.1],[22.4,20.0],[23.1,19.7],[23.5,19.4],[23.8,18.9],[24.2,18.5],[24.6,18.2],[25.1,18.1],[25.4,17.8],[25.9,17.6],[26.2,17.5],[26.5,17.2],[27.5,17.2],[28.4,17.2],[30.9,18.9],[28.7,16.0],[28.8,15.6],[29.3,15.6],[29.3,15.3],[30.0,15.3],[30.1,15.0],[30.8,14.9],[31.2,14.8],[32.4,14.9],[33.0,13.9],[31.1,12.0],[31.6,12.2],[33.4,12.9],[34.9,13.0],[35.4,13.1],[35.4,12.8],[36.2,12.7],[37.5,13.0],[40.2,14.1],[40.6,15.8],[41.2,16.3],[38.0,10.9],[38.3,11.1],[39.1,11.6],[38.9,10.9],[39.8,10.9],[40.1,10.9],[39.9,10.0],[42.0,11.0],[45.3,12.7],[46.4,13.3],[46.5,13.7],[44.3,9.8],[44.0,9.7],[44.4,9.8],[44.9,9.9],[43.2,9.1],[45.8,9.5],[49.1,10.1],[50.7,10.0],[51.0,9.8],[51.1,10.1],[51.4,9.9],[52.0,9.4],[52.2,9.7],[52.4,9.4],[53.6,9.7],[53.0,10.0],[53.4,10.2],[53.8,9.9],[51.1,6.3],[51.1,6.3],[50.6,6.1],[51.5,6.2],[52.3,6.2],[52.6,6.1],[59.3,9.1],
].map(([feet, board]) => ({ feet, board }));

describe("fitPath", () => {
  it("keeps the line on the lane when stray points pile up near the pins", () => {
    const fit = fitPath(glossyLane)!;
    for (let f = 0; f <= 60; f += 1) {
      expect(fit.boardAt(f)).toBeGreaterThanOrEqual(0);
      expect(fit.boardAt(f)).toBeLessThanOrEqual(40);
    }
  });

  it("doesn't bend the line off the lane to chase a few points at the end", () => {
    // straight from board 20 at 12 ft to board 10 at 50 ft, then 3 stray
    // points that drop away (pin deck, reflection)
    const pts = Array.from({ length: 40 }, (_, i) => {
      const feet = 12 + i;
      return { feet, board: 20 - ((feet - 12) * 10) / 38 };
    }).filter((p) => p.feet <= 50);
    pts.push({ feet: 51.5, board: 8 }, { feet: 52.5, board: 6 }, { feet: 53, board: 4.5 });
    const fit = fitPath(pts)!;
    expect(fit.boardAt(60)).toBeGreaterThanOrEqual(0);
    expect(fit.boardAt(30)).toBeCloseTo(15.3, 0);
  });

  it("follows the tracked points it keeps", () => {
    const fit = fitPath(glossyLane)!;
    expect(fit.boardAt(15)).toBeCloseTo(23, 0);
    expect(fit.boardAt(30)).toBeGreaterThan(13);
    expect(fit.boardAt(30)).toBeLessThan(17);
  });
});
