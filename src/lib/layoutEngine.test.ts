import { describe, it, expect } from "vitest";
import {
  recommendLayout,
  dualAngleToVLS,
  dualAngleTo2LS,
} from "./layoutEngine";

const stroker = {
  ballSpeedMph: 15,
  revRate: 275,
  axisTilt: 12,
  axisRotation: 45,
};
const tweener = {
  ballSpeedMph: 16.5,
  revRate: 350,
  axisTilt: 13,
  axisRotation: 50,
};
const cranker = {
  ballSpeedMph: 18,
  revRate: 450,
  axisTilt: 15,
  axisRotation: 65,
};
const speedDominant = {
  ballSpeedMph: 19,
  revRate: 250,
  axisTilt: 12,
  axisRotation: 40,
};

describe("recommendLayout — dual angle validity", () => {
  const allCases = [stroker, tweener, cranker, speedDominant].flatMap((specs) =>
    (["dry", "medium", "oily"] as const).map((lane) => ({ specs, lane })),
  );

  it("always returns components within Pinel's valid ranges", () => {
    for (const { specs, lane } of allCases) {
      const { dualAngle } = recommendLayout(specs, lane);
      expect(dualAngle.drillingAngle).toBeGreaterThanOrEqual(10);
      expect(dualAngle.drillingAngle).toBeLessThanOrEqual(90);
      expect(dualAngle.pinToPap).toBeGreaterThanOrEqual(2.5);
      expect(dualAngle.pinToPap).toBeLessThanOrEqual(5.5);
      expect(dualAngle.valAngle).toBeGreaterThanOrEqual(20);
      expect(dualAngle.valAngle).toBeLessThanOrEqual(70);
    }
  });

  it("keeps the angle sum inside the 30–160 band", () => {
    for (const { specs, lane } of allCases) {
      const { dualAngle } = recommendLayout(specs, lane);
      const sum = dualAngle.drillingAngle + dualAngle.valAngle;
      expect(sum).toBeGreaterThanOrEqual(30);
      expect(sum).toBeLessThanOrEqual(160);
    }
  });
});

describe("recommendLayout — speed/rev mapping", () => {
  it("gives speed-dominant players a lower angle sum than rev-dominant players", () => {
    const speedSum = (() => {
      const { dualAngle } = recommendLayout(speedDominant, "medium");
      return dualAngle.drillingAngle + dualAngle.valAngle;
    })();
    const revSum = (() => {
      const { dualAngle } = recommendLayout(
        { ...cranker, ballSpeedMph: 14, revRate: 500 },
        "medium",
      );
      return dualAngle.drillingAngle + dualAngle.valAngle;
    })();
    expect(speedSum).toBeLessThan(revSum);
  });

  it("gives higher-rev players longer pin-to-PAP than low-rev players", () => {
    const low = recommendLayout(stroker, "medium").dualAngle.pinToPap;
    const high = recommendLayout(cranker, "medium").dualAngle.pinToPap;
    expect(high).toBeGreaterThan(low);
  });

  it("uses a lower angle sum on oily lanes than on dry lanes", () => {
    const oily = recommendLayout(tweener, "oily").dualAngle;
    const dry = recommendLayout(tweener, "dry").dualAngle;
    expect(oily.drillingAngle + oily.valAngle).toBeLessThan(
      dry.drillingAngle + dry.valAngle,
    );
  });

  it("returns at least two reasons explaining the recommendation", () => {
    const { reasons } = recommendLayout(tweener, "medium");
    expect(reasons.length).toBeGreaterThanOrEqual(2);
  });
});

describe("dualAngleToVLS", () => {
  it("computes pin buffer as pinToPap * sin(valAngle)", () => {
    // 4.5" pin-to-PAP at 26.4° VAL → buffer ≈ 2.0"
    const vls = dualAngleToVLS({
      drillingAngle: 50,
      pinToPap: 4.5,
      valAngle: 26.4,
    });
    expect(vls.pinToPap).toBe(4.5);
    expect(vls.pinBuffer).toBeCloseTo(2.0, 1);
  });

  it("larger VAL angle gives a larger buffer", () => {
    const small = dualAngleToVLS({
      drillingAngle: 50,
      pinToPap: 4.5,
      valAngle: 30,
    });
    const large = dualAngleToVLS({
      drillingAngle: 50,
      pinToPap: 4.5,
      valAngle: 45,
    });
    expect(large.pinBuffer).toBeGreaterThan(small.pinBuffer);
  });
});

describe("dualAngleTo2LS", () => {
  it("returns pin-to-PAP, PSA-to-PAP and buffer", () => {
    const t = dualAngleTo2LS({
      drillingAngle: 90,
      pinToPap: 4.5,
      valAngle: 35,
    });
    // Pinel: at 90° drilling angle PSA-to-PAP stays 6.75" for any pin distance
    expect(t.psaToPap).toBeCloseTo(6.75, 1);
    expect(t.pinToPap).toBe(4.5);
    expect(t.pinBuffer).toBeGreaterThan(0);
  });

  it("smaller drilling angle brings the PSA closer to the PAP", () => {
    const small = dualAngleTo2LS({
      drillingAngle: 20,
      pinToPap: 4,
      valAngle: 35,
    });
    const large = dualAngleTo2LS({
      drillingAngle: 70,
      pinToPap: 4,
      valAngle: 35,
    });
    expect(small.psaToPap).toBeLessThan(large.psaToPap);
  });
});
