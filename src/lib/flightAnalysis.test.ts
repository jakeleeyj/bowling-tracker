import { describe, it, expect } from "vitest";
import {
  getSpeedRevMatch,
  getStyle,
  analyzeFlight,
  STYLE_PRESETS,
  kmhToMph,
  formatSpeed,
  parseMeasure,
} from "./flightAnalysis";

describe("getSpeedRevMatch", () => {
  // matched baseline: 17 mph ≈ 375 rpm → ratio = rev / (mph * 22)
  it("classifies the 17 mph / 375 rpm baseline as matched", () => {
    const result = getSpeedRevMatch(17, 375);
    expect(result.match).toBe("matched");
    expect(result.ratio).toBeCloseTo(1.0, 1);
  });

  it("classifies high speed with low revs as speed-dominant", () => {
    expect(getSpeedRevMatch(18, 250).match).toBe("speed-dominant");
  });

  it("classifies low speed with high revs as rev-dominant", () => {
    expect(getSpeedRevMatch(14, 450).match).toBe("rev-dominant");
  });

  it("uses 0.85 and 1.15 ratio thresholds", () => {
    // ratio exactly at boundary stays matched
    // 17 mph * 22 = 374; 0.85 * 374 = 317.9 → 318 rpm is matched
    expect(getSpeedRevMatch(17, 318).match).toBe("matched");
    expect(getSpeedRevMatch(17, 317).match).toBe("speed-dominant");
    // 1.15 * 374 = 430.1 → 430 matched, 431 rev-dominant
    expect(getSpeedRevMatch(17, 430).match).toBe("matched");
    expect(getSpeedRevMatch(17, 431).match).toBe("rev-dominant");
  });
});

describe("getStyle", () => {
  it("classifies a low-rev player as stroker", () => {
    expect(
      getStyle({
        ballSpeedMph: 15,
        revRate: 275,
        axisTilt: 12,
        axisRotation: 45,
      }),
    ).toBe("stroker");
  });

  it("classifies a mid-rev player as tweener", () => {
    expect(
      getStyle({
        ballSpeedMph: 16.5,
        revRate: 350,
        axisTilt: 13,
        axisRotation: 50,
      }),
    ).toBe("tweener");
  });

  it("classifies a high-rev player as cranker", () => {
    expect(
      getStyle({
        ballSpeedMph: 18,
        revRate: 450,
        axisTilt: 15,
        axisRotation: 65,
      }),
    ).toBe("cranker");
  });

  it("classifies high tilt as spinner regardless of revs", () => {
    expect(
      getStyle({
        ballSpeedMph: 15,
        revRate: 280,
        axisTilt: 40,
        axisRotation: 70,
      }),
    ).toBe("spinner");
  });
});

describe("STYLE_PRESETS", () => {
  it("provides specs for stroker, tweener, cranker and two-handed", () => {
    for (const key of [
      "stroker",
      "tweener",
      "cranker",
      "two-handed",
    ] as const) {
      const p = STYLE_PRESETS[key];
      expect(p.ballSpeedMph).toBeGreaterThan(10);
      expect(p.revRate).toBeGreaterThan(150);
      expect(p.axisTilt).toBeGreaterThanOrEqual(0);
      expect(p.axisRotation).toBeGreaterThanOrEqual(0);
    }
  });

  it("preset specs classify as their own style", () => {
    expect(getStyle(STYLE_PRESETS.stroker)).toBe("stroker");
    expect(getStyle(STYLE_PRESETS.tweener)).toBe("tweener");
    expect(getStyle(STYLE_PRESETS.cranker)).toBe("cranker");
  });
});

describe("speed units", () => {
  it("converts km/h to mph", () => {
    expect(kmhToMph(27.4)).toBeCloseTo(17, 1);
  });

  it("formats speed in the requested unit", () => {
    expect(formatSpeed(17, "mph")).toBe("17 mph");
    expect(formatSpeed(17, "kmh")).toBe("27.4 km/h");
  });
});

describe("analyzeFlight", () => {
  it("returns match, style and at least two plain-language reasons", () => {
    const result = analyzeFlight({
      ballSpeedMph: 18,
      revRate: 250,
      axisTilt: 12,
      axisRotation: 40,
    });
    expect(result.match).toBe("speed-dominant");
    expect(result.style).toBe("stroker");
    expect(result.reasons.length).toBeGreaterThanOrEqual(2);
    for (const reason of result.reasons) {
      expect(typeof reason).toBe("string");
      expect(reason.length).toBeGreaterThan(10);
    }
  });

  it("classifies as two-handed when the flag is set, regardless of numbers", () => {
    const result = analyzeFlight(
      { ballSpeedMph: 18, revRate: 480, axisTilt: 10, axisRotation: 55 },
      "mph",
      { twoHanded: true },
    );
    expect(result.style).toBe("two-handed");
  });

  it("clamps out-of-range inputs into valid bounds", () => {
    const result = analyzeFlight({
      ballSpeedMph: 99,
      revRate: 9999,
      axisTilt: 200,
      axisRotation: -20,
    });
    // cap is 50 km/h expressed in mph
    expect(result.specs.ballSpeedMph).toBeLessThanOrEqual(31.1);
    expect(result.specs.revRate).toBeLessThanOrEqual(700);
    expect(result.specs.axisTilt).toBeLessThanOrEqual(90);
    expect(result.specs.axisRotation).toBeGreaterThanOrEqual(0);
  });
});

describe("parseMeasure", () => {
  it("parses plain decimals", () => {
    expect(parseMeasure("3.375")).toBeCloseTo(3.375, 5);
    expect(parseMeasure("45")).toBe(45);
  });

  it("parses fractions and mixed numbers", () => {
    expect(parseMeasure("3/8")).toBeCloseTo(0.375, 5);
    expect(parseMeasure("3 3/8")).toBeCloseTo(3.375, 5);
    expect(parseMeasure("6 3/4")).toBeCloseTo(6.75, 5);
  });

  it("parses negatives and dash-separated mixed numbers", () => {
    expect(parseMeasure("-3/8")).toBeCloseTo(-0.375, 5);
    expect(parseMeasure("-1 1/2")).toBeCloseTo(-1.5, 5);
    expect(parseMeasure("3-3/8")).toBeCloseTo(3.375, 5);
  });

  it("returns NaN for junk", () => {
    expect(Number.isNaN(parseMeasure("abc"))).toBe(true);
    expect(Number.isNaN(parseMeasure(""))).toBe(true);
    expect(Number.isNaN(parseMeasure("3/0"))).toBe(true);
  });
});
