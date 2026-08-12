// Dual Angle layout recommendation engine with VLS / 2LS conversions.
// Ranges and angle-sum guidance from Mo Pinel's Dual Angle system and the
// Maverick "Dual Angle Sweet Spot": matched ≈ 100°±30, speed-dominant ≈ 60°±30,
// rev-dominant ≈ 130°±30; valid sum band 30–160.

import {
  BowlerSpecs,
  clampSpecs,
  getSpeedRevMatch,
  getStyle,
} from "./flightAnalysis";

export type LaneCondition = "dry" | "medium" | "oily";

export interface DualAngleLayout {
  drillingAngle: number;
  pinToPap: number;
  valAngle: number;
}

export interface VLSLayout {
  pinToPap: number;
  pinBuffer: number;
}

export interface TwoLSLayout {
  pinToPap: number;
  psaToPap: number;
  pinBuffer: number;
}

export interface LayoutRecommendation {
  dualAngle: DualAngleLayout;
  vls: VLSLayout;
  twoLS: TwoLSLayout;
  reasons: string[];
}

const LIMITS = {
  drillingAngle: { min: 10, max: 90 },
  pinToPap: { min: 2.5, max: 5.5 },
  valAngle: { min: 20, max: 70 },
  angleSum: { min: 30, max: 160 },
} as const;

// 1" of surface arc ≈ 13.44° on a 27" circumference ball
const DEG_PER_INCH = 360 / 26.785;
const DEG = Math.PI / 180;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundHalf(value: number): number {
  return Math.round(value * 2) / 2;
}

const LANE_SUM_SHIFT: Record<LaneCondition, number> = {
  dry: 20,
  medium: 0,
  oily: -20,
};

export function recommendLayout(
  rawSpecs: BowlerSpecs,
  lane: LaneCondition,
): LayoutRecommendation {
  const specs = clampSpecs(rawSpecs);
  const { ratio, match } = getSpeedRevMatch(specs.ballSpeedMph, specs.revRate);
  const style = getStyle(specs);
  const reasons: string[] = [];

  // Target angle sum from speed/rev match, interpolated on the ratio
  // (0.85 → 75, 1.0 → 100, 1.15 → 125, clamped to the sweet-spot bands).
  let sum = clamp(100 + (ratio - 1) * 165, 55, 145);
  reasons.push(
    match === "matched"
      ? "A balanced speed-to-rev ratio puts your angle total near 100°, the all-purpose sweet spot."
      : match === "speed-dominant"
        ? "Because you are speed-dominant, the angle total is lowered so the ball starts its move sooner."
        : "Because you are rev-dominant, the angle total is raised so the ball conserves energy longer.",
  );

  // Tilt: high tilt already delays the roll → smaller sum; low tilt → larger.
  if (specs.axisTilt > 20) {
    sum -= 12;
    reasons.push(
      "Your high axis tilt makes the ball naturally skid longer, so the layout compensates with an earlier-rolling angle total.",
    );
  } else if (specs.axisTilt < 10) {
    sum += 10;
    reasons.push(
      "Your low axis tilt gets the ball into a roll early, so the layout adds length with a higher angle total.",
    );
  }

  // Lane condition shifts the sum.
  sum += LANE_SUM_SHIFT[lane];
  if (lane !== "medium") {
    reasons.push(
      lane === "oily"
        ? "Oily lanes need the ball to slow down and grip sooner, lowering the angle total."
        : "Dry lanes burn the ball up early, so a higher angle total saves energy for the backend.",
    );
  }
  sum = clamp(sum, LIMITS.angleSum.min + 25, LIMITS.angleSum.max - 10);

  // Split the sum between drilling and VAL angle:
  // high axis rotation → favor VAL (control), low rotation → favor drilling angle (backend).
  const drillShare = clamp(
    0.55 - (specs.axisRotation - 50) * 0.003,
    0.45,
    0.62,
  );
  let drillingAngle = clamp(
    sum * drillShare,
    LIMITS.drillingAngle.min,
    LIMITS.drillingAngle.max,
  );
  let valAngle = clamp(
    sum - drillingAngle,
    LIMITS.valAngle.min,
    LIMITS.valAngle.max,
  );
  drillingAngle = clamp(
    sum - valAngle,
    LIMITS.drillingAngle.min,
    LIMITS.drillingAngle.max,
  );
  if (specs.axisRotation >= 60) {
    reasons.push(
      "Your high axis rotation already creates angle at the breakpoint, so the layout leans toward control.",
    );
  }

  // Pin-to-PAP by rev rate: low revs need flare help (closer to the 3 3/8" max-flare
  // distance), high revs get longer pins to tame flare.
  let pinToPap = specs.revRate < 250 ? 3.5 : specs.revRate <= 400 ? 4.25 : 5;
  if (lane === "dry")
    pinToPap = clamp(pinToPap + 0.5, LIMITS.pinToPap.min, LIMITS.pinToPap.max);
  if (lane === "oily")
    pinToPap = clamp(pinToPap - 0.25, LIMITS.pinToPap.min, LIMITS.pinToPap.max);
  reasons.push(
    specs.revRate > 400
      ? "A longer pin-to-PAP distance reduces track flare, keeping your high rev rate from over-hooking."
      : specs.revRate < 250
        ? "A pin-to-PAP distance near 3 3/8\" maximizes track flare, adding hook your rev rate doesn't create on its own."
        : "A mid-range pin-to-PAP distance gives a versatile amount of track flare.",
  );
  if (style === "two-handed") {
    reasons.push(
      'Two-handed players typically use longer pin distances for control; PAP is measured 5" over and 2" down from the bridge.',
    );
  }

  const dualAngle: DualAngleLayout = {
    drillingAngle: Math.round(drillingAngle / 5) * 5,
    pinToPap: roundHalf(pinToPap),
    valAngle: Math.round(valAngle / 5) * 5,
  };

  return {
    dualAngle,
    vls: dualAngleToVLS(dualAngle),
    twoLS: dualAngleTo2LS(dualAngle),
    reasons,
  };
}

// Pin buffer = distance from pin to the VAL along the surface.
// Flat-geometry approximation: buffer ≈ pinToPap · sin(valAngle).
export function dualAngleToVLS(layout: DualAngleLayout): VLSLayout {
  const pinBuffer = layout.pinToPap * Math.sin(layout.valAngle * DEG);
  return {
    pinToPap: layout.pinToPap,
    pinBuffer: Math.round(pinBuffer * 4) / 4,
  };
}

// PSA-to-PAP via spherical law of cosines with pin-to-PSA fixed at 6.75" (≈90° arc):
// cos(psaToPap) = sin(pinToPap) · cos(drillingAngle), all as arc angles.
export function dualAngleTo2LS(layout: DualAngleLayout): TwoLSLayout {
  const pinArc = layout.pinToPap * DEG_PER_INCH * DEG;
  const psaArc = Math.acos(
    Math.sin(pinArc) * Math.cos(layout.drillingAngle * DEG),
  );
  const psaToPap = psaArc / DEG / DEG_PER_INCH;
  const { pinBuffer } = dualAngleToVLS(layout);
  return {
    pinToPap: layout.pinToPap,
    psaToPap: Math.round(psaToPap * 4) / 4,
    pinBuffer,
  };
}
