import { describe, it, expect } from "vitest";
import { ShotSession } from "./shotSession";

describe("ShotSession", () => {
  it("stays idle with no detections", () => {
    const s = new ShotSession();
    expect(s.onFrame(null, 0).type).toBe("idle");
    expect(s.onFrame(null, 33).type).toBe("idle");
  });

  it("tracks a full shot and completes with stats past 55 feet", () => {
    const s = new ShotSession();
    let lastType = "";
    for (let i = 0; i <= 30; i++) {
      const e = s.onFrame({ board: 12, feet: 2 + (56 * i) / 30 }, i * 80);
      lastType = e.type;
      if (e.type === "complete") {
        expect(e.stats.releaseBoard).toBeCloseTo(12, 1);
        expect(e.stats.speedMph).toBeGreaterThan(10);
        break;
      }
    }
    expect(lastType).toBe("complete");
  });

  it("completes via timeout when detections stop mid-lane past 20 feet", () => {
    const s = new ShotSession();
    for (let i = 0; i <= 15; i++) {
      s.onFrame({ board: 12, feet: 2 + (30 * i) / 15 }, i * 80);
    }
    // over LOST_MS (1000ms) of nothing
    const e = s.onFrame(null, 15 * 80 + 1050);
    expect(e.type).toBe("complete");
  });

  it("discards a track that never travels far enough", () => {
    const s = new ShotSession();
    for (let i = 0; i <= 5; i++) {
      s.onFrame({ board: 12, feet: 2 + i }, i * 80);
    }
    const e = s.onFrame(null, 5 * 80 + 1050);
    expect(e.type).toBe("discarded");
  });

  it("returns to idle and can track a second shot", () => {
    const s = new ShotSession();
    for (let i = 0; i <= 30; i++) {
      const e = s.onFrame({ board: 12, feet: 2 + (56 * i) / 30 }, i * 80);
      if (e.type === "complete") break;
    }
    expect(s.onFrame(null, 5000).type).toBe("idle");
    const e = s.onFrame({ board: 20, feet: 3 }, 6000);
    expect(e.type).toBe("tracking");
  });

  it("completes by position even when tracking starts mid-lane", () => {
    const s = new ShotSession();
    let completed = false;
    for (let i = 0; i <= 20; i++) {
      const e = s.onFrame({ board: 10, feet: 20 + (37 * i) / 20 }, i * 80);
      if (e.type === "complete") completed = true;
    }
    expect(completed).toBe(true);
  });
});
