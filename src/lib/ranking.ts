// MMR Ranking System
// Base score: 180. MMR = weighted average of (score - 180).
// Recent games weighted more heavily using exponential decay (0.93^index).

const BASE_SCORE = 180;
const DECAY_FACTOR = 0.93;
export const CALIBRATION_GAMES = 3;

export interface RankTier {
  name: string;
  division?: string; // I, II, III, IV
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string; // emoji-free, we'll use SVG in the component
}

// Tier ranges (MMR values, base 180):
// Iron: <140 avg, Bronze: 140-160, Silver: 160-190, Gold: 190-215
// Platinum: 215-235, Diamond: 235-255, Master: 255-270, Grandmaster: 270+
const TIERS = [
  {
    name: "Iron",
    min: -Infinity,
    max: -40,
    color: "text-gray-400",
    bgColor: "bg-gray-400/10",
    borderColor: "border-gray-400/30",
  },
  {
    name: "Bronze",
    min: -40,
    max: -20,
    color: "text-amber-700",
    bgColor: "bg-amber-700/10",
    borderColor: "border-amber-700/30",
  },
  {
    name: "Silver",
    min: -20,
    max: 10,
    color: "text-gray-300",
    bgColor: "bg-gray-300/10",
    borderColor: "border-gray-300/30",
  },
  {
    name: "Gold",
    min: 10,
    max: 35,
    color: "text-gold",
    bgColor: "bg-gold/10",
    borderColor: "border-gold/30",
  },
  {
    name: "Platinum",
    min: 35,
    max: 55,
    color: "text-cyan-400",
    bgColor: "bg-cyan-400/10",
    borderColor: "border-cyan-400/30",
  },
  {
    name: "Diamond",
    min: 55,
    max: 75,
    color: "text-blue",
    bgColor: "bg-blue/10",
    borderColor: "border-blue/30",
  },
  {
    name: "Master",
    min: 75,
    max: 90,
    color: "text-purple",
    bgColor: "bg-purple/10",
    borderColor: "border-purple/30",
  },
  {
    name: "Grandmaster",
    min: 90,
    max: Infinity,
    color: "text-red",
    bgColor: "bg-red/10",
    borderColor: "border-red/30",
  },
] as const;

// Divisions within a tier: IV (bottom) to I (top)
const DIVISIONS = ["IV", "III", "II", "I"] as const;

// Canonical event labels — used across log page, session cards, and ranking weights
export const EVENT_LABELS = [
  "League",
  "Tournament",
  "Casual",
  "Funbowl",
] as const;
export type EventLabel = (typeof EVENT_LABELS)[number];

// Event type weights — competitive events count more
export const EVENT_WEIGHTS: Record<string, number> = {
  Tournament: 1.5,
  Funbowl: 1.35,
  League: 1.25,
  Casual: 1.0,
};

export function getEventWeight(eventLabel: string | null): number {
  if (!eventLabel) return 1.0;
  return EVENT_WEIGHTS[eventLabel] ?? 1.0;
}

export function calculateMMR(
  scores: number[],
  eventWeights?: number[],
): number {
  if (scores.length === 0) return 0;

  // Scores should be newest-first
  let weightedSum = 0;
  let totalWeight = 0;

  for (let i = 0; i < scores.length; i++) {
    const decay = Math.pow(DECAY_FACTOR, i);
    const eventW = eventWeights?.[i] ?? 1.0;
    const weight = decay * eventW;
    weightedSum += (scores[i] - BASE_SCORE) * weight;
    totalWeight += weight;
  }

  return Math.round(weightedSum / totalWeight);
}

export function getRank(mmr: number): RankTier {
  const tier = TIERS.find((t) => mmr >= t.min && mmr < t.max) ?? TIERS[0];

  // Master and Grandmaster have no divisions
  if (tier.name === "Master" || tier.name === "Grandmaster") {
    return {
      name: tier.name,
      color: tier.color,
      bgColor: tier.bgColor,
      borderColor: tier.borderColor,
      icon: tier.name,
    };
  }

  // Calculate division within tier
  const range = tier.max - tier.min;
  const position = mmr - tier.min;
  const divIndex = Math.min(Math.floor((position / range) * 4), 3);
  const division = DIVISIONS[divIndex];

  return {
    name: tier.name,
    division,
    color: tier.color,
    bgColor: tier.bgColor,
    borderColor: tier.borderColor,
    icon: tier.name,
  };
}

// Progress within current division (0-100%)
export function getDivisionProgress(mmr: number): number {
  const tier = TIERS.find((t) => mmr >= t.min && mmr < t.max) ?? TIERS[0];

  if (
    tier.name === "Master" ||
    tier.name === "Grandmaster" ||
    tier.min === -Infinity
  ) {
    // Tiers with infinite bounds: show progress within a fixed range
    const range =
      tier.max === Infinity
        ? 20
        : tier.min === -Infinity
          ? 20
          : tier.max - tier.min;
    const anchor = tier.min === -Infinity ? tier.max - range : tier.min;
    const position = Math.max(0, mmr - anchor);
    return Math.min(Math.round((position / range) * 100), 100);
  }

  const range = tier.max - tier.min;
  const divSize = range / 4;
  const position = mmr - tier.min;
  const withinDiv = position % divSize;
  return Math.min(Math.round((withinDiv / divSize) * 100), 100);
}

// For display: MMR as a signed string
export function formatMMR(mmr: number): string {
  if (mmr > 0) return `+${mmr}`;
  return mmr.toString();
}

// Get the equivalent average score for an MMR
export function mmrToAverage(mmr: number): number {
  return BASE_SCORE + mmr;
}

// All tier names for reference
export const TIER_NAMES = TIERS.map((t) => t.name);
