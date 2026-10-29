// LP Ranking System (League Points, like LoL)
// Each game earns LP = (score - 185) × event_weight × recency_weight
// Calibration games (first 4) earn 5× LP with no event weight (pure skill placement)
// Recency: linear decay from 1.0x to 0.25x floor over 60 games
// LP accumulates over time, floor at 0
// Starting LP: 1200 (Silver baseline)

const LP_BASE_SCORE = 185;
const STARTING_LP = 1200;
const CALIBRATION_MULTIPLIER = 5;
export const CALIBRATION_GAMES = 4;

export interface RankTier {
  name: string;
  division?: string; // I, II, III, IV
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
}

// Tier ranges (LP thresholds, 200 LP per tier):
// Iron: 0-1000, Bronze: 1000-1200, Silver: 1200-1400, Gold: 1400-1600
// Platinum: 1600-1800, Emerald: 1800-2000, Diamond: 2000-2200
// Master: 2200-2400, Grandmaster: 2400-2600, Challenger: 2600+
const TIERS = [
  {
    name: "Iron",
    min: 0,
    max: 1000,
    color: "text-gray-400",
    bgColor: "bg-gray-400/10",
    borderColor: "border-gray-400/30",
  },
  {
    name: "Bronze",
    min: 1000,
    max: 1200,
    color: "text-amber-600",
    bgColor: "bg-amber-600/10",
    borderColor: "border-amber-600/30",
  },
  {
    name: "Silver",
    min: 1200,
    max: 1400,
    color: "text-gray-300",
    bgColor: "bg-gray-300/10",
    borderColor: "border-gray-300/30",
  },
  {
    name: "Gold",
    min: 1400,
    max: 1600,
    color: "text-gold",
    bgColor: "bg-gold/10",
    borderColor: "border-gold/30",
  },
  {
    name: "Platinum",
    min: 1600,
    max: 1800,
    color: "text-cyan-400",
    bgColor: "bg-cyan-400/10",
    borderColor: "border-cyan-400/30",
  },
  {
    name: "Emerald",
    min: 1800,
    max: 2000,
    color: "text-emerald-400",
    bgColor: "bg-emerald-400/10",
    borderColor: "border-emerald-400/30",
  },
  {
    name: "Diamond",
    min: 2000,
    max: 2200,
    color: "text-blue",
    bgColor: "bg-blue/10",
    borderColor: "border-blue/30",
  },
  {
    name: "Master",
    min: 2200,
    max: 2400,
    color: "text-purple",
    bgColor: "bg-purple/10",
    borderColor: "border-purple/30",
  },
  {
    name: "Grandmaster",
    min: 2400,
    max: 2600,
    color: "text-red",
    bgColor: "bg-red/10",
    borderColor: "border-red/30",
  },
  {
    name: "Challenger",
    min: 2600,
    max: Infinity,
    color: "text-rose-400",
    bgColor: "bg-rose-400/10",
    borderColor: "border-rose-400/30",
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

// Calculate cumulative LP from all games
// scores should be newest-first (as returned by Supabase order desc)
export function calculateLP(scores: number[], eventWeights?: number[]): number {
  if (scores.length === 0) return 0;

  let lp = STARTING_LP;
  const totalGames = scores.length;

  // Process oldest-first (reverse the newest-first array)
  // i=0 is newest, i=length-1 is oldest
  for (let i = scores.length - 1; i >= 0; i--) {
    const chronologicalIndex = totalGames - 1 - i;
    const isCal = chronologicalIndex < CALIBRATION_GAMES;
    const eventW = isCal ? 1.0 : (eventWeights?.[i] ?? 1.0);
    const multiplier = isCal ? CALIBRATION_MULTIPLIER : 1;
    // Recency: linear decay from 1.0 to 0.25 over 60 games
    const recencyW = Math.max(0.25, 1.0 - i * 0.0125);
    const gain = Math.round(
      (scores[i] - LP_BASE_SCORE) * eventW * multiplier * recencyW,
    );
    lp += gain;
  }

  return Math.max(0, lp);
}

// Keep calculateMMR as alias for backward compat during transition
export const calculateMMR = calculateLP;

export function getRank(lp: number): RankTier {
  const tier =
    TIERS.find((t) => lp >= t.min && lp < t.max) ?? TIERS[TIERS.length - 1];

  // Master, Grandmaster, Challenger have no divisions
  if (
    tier.name === "Master" ||
    tier.name === "Grandmaster" ||
    tier.name === "Challenger"
  ) {
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
  const position = lp - tier.min;
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

// Progress bar value (0-100), one rule shared with SQL refresh_player_ranking:
// - Iron to Diamond: progress within the current division
// - Master, Grandmaster: progress across the whole tier, floored
// - Challenger: always 100 (no ceiling)
export function getDivisionProgress(lp: number): number {
  const tier =
    TIERS.find((t) => lp >= t.min && lp < t.max) ?? TIERS[TIERS.length - 1];

  if (tier.name === "Challenger") return 100;

  if (tier.name === "Master" || tier.name === "Grandmaster") {
    const pct = Math.floor(((lp - tier.min) / (tier.max - tier.min)) * 100);
    return Math.min(Math.max(pct, 0), 100);
  }

  const range = tier.max - tier.min;
  const divSize = range / 4;
  const position = lp - tier.min;
  const withinDiv = position % divSize;
  return Math.min(Math.round((withinDiv / divSize) * 100), 100);
}

// For display: LP as comma-formatted number (locale pinned so every device
// renders the same separators)
export function formatLP(lp: number): string {
  return lp.toLocaleString("en-SG");
}

// For display: an LP change, e.g. "+12 LP", "−12 LP" (true minus), "0 LP"
export function formatLPDelta(delta: number): string {
  if (delta > 0) return `+${formatLP(delta)} LP`;
  if (delta < 0) return `\u2212${formatLP(Math.abs(delta))} LP`;
  return "0 LP";
}

// "3 more games to rank" for a player still calibrating
export function formatCalibrationGamesLeft(totalGames: number): string {
  const left = Math.max(CALIBRATION_GAMES - totalGames, 0);
  return `${left} more game${left === 1 ? "" : "s"} to rank`;
}

// A session counts as calibration if any of its games were among the
// player's first CALIBRATION_GAMES games ever.
export function isCalibrationSession(gamesBefore: number): boolean {
  return gamesBefore < CALIBRATION_GAMES;
}

interface FeedSession {
  id: string;
  user_id: string;
  games: readonly unknown[];
}

// Lifetime games each player had before each session. Sessions must be
// newest-first and contiguous per player from their latest session (a feed or
// history page, unfiltered). Counts back from the lifetime totals, so the
// result for a session never depends on how many pages are loaded.
export function gamesBeforeEachSession(
  sessions: readonly FeedSession[],
  lifetimeGames: Record<string, number>,
): Record<string, number> {
  const result: Record<string, number> = {};
  const remaining: Record<string, number> = {};
  for (const s of sessions) {
    const u = s.user_id;
    if (!(u in remaining)) remaining[u] = lifetimeGames[u] ?? 0;
    remaining[u] -= s.games.length;
    result[s.id] = remaining[u];
  }
  return result;
}

// LP each player landed on after each session: walk newest-first from their
// current LP, backing out each session's delta. The chain stops at the first
// session without a delta (e.g. a previous season).
export function lpAfterEachSession(
  sessions: readonly Omit<FeedSession, "games">[],
  lpChanges: Record<string, number | undefined>,
  currentLps: Record<string, number>,
): Record<string, number> {
  const result: Record<string, number> = {};
  const running: Record<string, number | null> = {};
  for (const s of sessions) {
    const u = s.user_id;
    if (!(u in running)) running[u] = currentLps[u] ?? null;
    const cur = running[u];
    const change = lpChanges[s.id];
    if (cur !== null && change !== undefined) {
      result[s.id] = cur;
      running[u] = cur - change;
    } else {
      running[u] = null;
    }
  }
  return result;
}

// Keep old name working
export const formatMMR = formatLP;

// All tier names for reference
export const TIER_NAMES = TIERS.map((t) => t.name);
