// Ball flight analysis: speed/rev matching and style classification.
// Baseline: 17 mph launch ≈ 375 rpm is "matched" (rev / (mph * 22) ≈ 1.0).
// Sources: Mo Pinel Dual Angle doc, Maverick Dual Angle Sweet Spot, BowlersMart.

export type SpeedRevMatch = "speed-dominant" | "matched" | "rev-dominant";
export type BowlerStyle =
  "stroker" | "tweener" | "cranker" | "two-handed" | "spinner";

export interface BowlerSpecs {
  ballSpeedMph: number;
  revRate: number;
  axisTilt: number;
  axisRotation: number;
}

export interface FlightAnalysis {
  specs: BowlerSpecs;
  ratio: number;
  match: SpeedRevMatch;
  style: BowlerStyle;
  reasons: string[];
}

export const SPEC_LIMITS = {
  ballSpeedMph: { min: 8, max: 20 },
  revRate: { min: 100, max: 700 },
  axisTilt: { min: 0, max: 90 },
  axisRotation: { min: 0, max: 90 },
} as const;

export type SpeedUnit = "mph" | "kmh";

const KMH_PER_MPH = 1.609344;

export function kmhToMph(kmh: number): number {
  return kmh / KMH_PER_MPH;
}

export function mphToKmh(mph: number): number {
  return mph * KMH_PER_MPH;
}

export function formatSpeed(mph: number, unit: SpeedUnit): string {
  if (unit === "kmh") return `${Math.round(mphToKmh(mph) * 10) / 10} km/h`;
  return `${Math.round(mph * 10) / 10} mph`;
}

const MATCHED_LOW = 0.85;
const MATCHED_HIGH = 1.15;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function clampSpecs(specs: BowlerSpecs): BowlerSpecs {
  return {
    ballSpeedMph: clamp(
      specs.ballSpeedMph,
      SPEC_LIMITS.ballSpeedMph.min,
      SPEC_LIMITS.ballSpeedMph.max,
    ),
    revRate: clamp(
      specs.revRate,
      SPEC_LIMITS.revRate.min,
      SPEC_LIMITS.revRate.max,
    ),
    axisTilt: clamp(
      specs.axisTilt,
      SPEC_LIMITS.axisTilt.min,
      SPEC_LIMITS.axisTilt.max,
    ),
    axisRotation: clamp(
      specs.axisRotation,
      SPEC_LIMITS.axisRotation.min,
      SPEC_LIMITS.axisRotation.max,
    ),
  };
}

export function getSpeedRevMatch(
  ballSpeedMph: number,
  revRate: number,
): { ratio: number; match: SpeedRevMatch } {
  const ratio = revRate / (ballSpeedMph * 22);
  const match: SpeedRevMatch =
    ratio < MATCHED_LOW
      ? "speed-dominant"
      : ratio > MATCHED_HIGH
        ? "rev-dominant"
        : "matched";
  return { ratio, match };
}

export function getStyle(specs: BowlerSpecs): BowlerStyle {
  if (specs.axisTilt > 30) return "spinner";
  if (specs.revRate > 400) return "cranker";
  if (specs.revRate >= 300) return "tweener";
  return "stroker";
}

export const STYLE_PRESETS: Record<
  Exclude<BowlerStyle, "spinner">,
  BowlerSpecs
> = {
  stroker: { ballSpeedMph: 15, revRate: 275, axisTilt: 12, axisRotation: 45 },
  tweener: { ballSpeedMph: 16.5, revRate: 350, axisTilt: 13, axisRotation: 50 },
  cranker: { ballSpeedMph: 18, revRate: 450, axisTilt: 15, axisRotation: 65 },
  "two-handed": {
    ballSpeedMph: 18,
    revRate: 500,
    axisTilt: 10,
    axisRotation: 55,
  },
};

const MATCH_REASONS: Record<SpeedRevMatch, string> = {
  "speed-dominant":
    "Your ball speed outpaces your rev rate, so the ball skids longer and hooks less on its own — layouts that help it read the lane earlier work in your favor.",
  matched:
    "Your speed and rev rate are well balanced, so the ball has a predictable, versatile motion — an all-purpose layout suits you.",
  "rev-dominant":
    "Your rev rate outpaces your ball speed, so the ball wants to hook early and hard — layouts that delay the reaction keep your backend under control.",
};

const STYLE_REASONS: Record<BowlerStyle, string> = {
  stroker:
    "With a smoother, lower-rev release you benefit from layouts that use more of the ball's flare to create shape.",
  tweener:
    "Your medium rev rate gives you flexibility — moderate layouts keep the ball readable on most house conditions.",
  cranker:
    "Your high rev rate creates plenty of hook on its own, so longer pin distances tame the flare and keep the motion controllable.",
  "two-handed":
    "A two-handed release generates high revs with lots of axis rotation — control-oriented layouts prevent over-hooking.",
  spinner:
    "Your high axis tilt makes the ball spin like a top and clear the front of the lane — you need layouts and surfaces that help it slow down and grip.",
};

export function analyzeFlight(
  rawSpecs: BowlerSpecs,
  speedUnit: SpeedUnit = "mph",
  options?: { twoHanded?: boolean },
): FlightAnalysis {
  const specs = clampSpecs(rawSpecs);
  const { ratio, match } = getSpeedRevMatch(specs.ballSpeedMph, specs.revRate);
  const style: BowlerStyle = options?.twoHanded
    ? "two-handed"
    : getStyle(specs);
  const reasons = [
    `At ${formatSpeed(specs.ballSpeedMph, speedUnit)} with ${Math.round(specs.revRate)} rpm, you are ${match.replace("-", " ")}.`,
    MATCH_REASONS[match],
    STYLE_REASONS[style],
  ];
  return { specs, ratio, match, style, reasons };
}
