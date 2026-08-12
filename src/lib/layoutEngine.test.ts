import { describe, it, expect } from "vitest";
import {
  recommendLayout,
  dualAngleToVLS,
  dualAngleTo2LS,
  vlsToDualAngle,
  twoLSToDualAngle,
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
    // Storm 2LS third number is pin-to-COG (center of grip), range ~2-6.5"
    expect(t.pinToCog).toBeGreaterThanOrEqual(1);
    expect(t.pinToCog).toBeLessThanOrEqual(7);
  });

  it("computes pin-to-COG from the two-handed 5 over / 1 down PAP", () => {
    // PAP at (5, -1) from grip; pin 4.5" from PAP at VAL 35°:
    // pin = (5 - 4.5·sin35, -1 + 4.5·cos35) ≈ (2.42, 2.69) → |pin-grip| ≈ 3.6"
    const t = dualAngleTo2LS({
      drillingAngle: 50,
      pinToPap: 4.5,
      valAngle: 35,
    });
    expect(t.pinToCog).toBeCloseTo(3.6, 0);
  });

  it("accepts a custom PAP position for the pin-to-COG measurement", () => {
    const layout = { drillingAngle: 50, pinToPap: 4.5, valAngle: 35 };
    const near = dualAngleTo2LS(layout, { over: 4, up: 0 });
    const far = dualAngleTo2LS(layout, { over: 6, up: 0 });
    expect(near.pinToCog).not.toBeCloseTo(far.pinToCog, 1);
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

describe("vlsToDualAngle", () => {
  it("round-trips a VLS layout back to its VAL angle", () => {
    const original = { drillingAngle: 45, pinToPap: 4.5, valAngle: 35 };
    const vls = dualAngleToVLS(original);
    const back = vlsToDualAngle(vls);
    expect(back.pinToPap).toBe(4.5);
    // buffer is rounded to quarter inches, so allow ±2°
    expect(Math.abs(back.valAngle - 35)).toBeLessThan(2);
  });

  it("clamps an impossible buffer (larger than pin-to-PAP)", () => {
    const back = vlsToDualAngle({ pinToPap: 4, pinBuffer: 5 });
    expect(back.valAngle).toBeLessThanOrEqual(90);
    expect(Number.isFinite(back.valAngle)).toBe(true);
  });
});

describe("twoLSToDualAngle", () => {
  it("round-trips a 2LS layout back to drilling and VAL angles", () => {
    const original = { drillingAngle: 50, pinToPap: 4.5, valAngle: 35 };
    const pap = { over: 5, up: -1 };
    const twoLS = dualAngleTo2LS(original, pap);
    const back = twoLSToDualAngle(twoLS, pap);
    expect(back.pinToPap).toBe(4.5);
    expect(back.drillingAngle).toBeCloseTo(50, -1);
    expect(back.valAngle).toBeCloseTo(35, -1);
  });

  it("returns finite angles for out-of-reach measurements", () => {
    const back = twoLSToDualAngle(
      { pinToPap: 4, psaToPap: 9, pinToCog: 12 },
      { over: 4.5, up: 0 },
    );
    expect(Number.isFinite(back.drillingAngle)).toBe(true);
    expect(Number.isFinite(back.valAngle)).toBe(true);
  });
});
