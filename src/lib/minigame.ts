// Casual minigame scoring engine ("2-2-3" and variants)
//
// A lightweight side-game played during casual bowling, structured like a real
// session: multiple games, 10 frames each. Per frame you log each player's
// minigame events (strike / corner-pin made / corner-pin missed). The winner of
// each game earns a bonus. Points accumulate across all games. No LP/ranking.

export const TOTAL_FRAMES = 10;

export interface MinigameRules {
  strikePoints: number;
  sparePoints: number; // usually 0 — a bowling-format marker
  cornerPoints: number;
  winnerPoints: number;
  // When true, the Miss button is shown and subtracts cornerMissPenalty.
  penaltyEnabled: boolean;
  cornerMissPenalty: number;
}

export type MinigameActionType =
  | "strike"
  | "spare"
  | "cornerMade"
  | "cornerMissed";

export interface MinigameEvent {
  id: string;
  gameIndex: number;
  frameIndex: number; // 0-based, 0..9
  playerId: string;
  type: MinigameActionType;
  points: number;
}

// One completed game. winnerId gets the winner bonus; null = tie / no winner.
export interface GameResult {
  winnerId: string | null;
}

export interface MinigamePlayer {
  id: string;
  name: string;
}

export type MinigameStep = "setup" | "playing" | "finished";

export interface MinigameState {
  step: MinigameStep;
  rules: MinigameRules;
  players: MinigamePlayer[];
  events: MinigameEvent[];
  games: GameResult[]; // completed games
  frameByPlayer: Record<string, number>; // each player's current frame (0..9) in the in-progress game
  pickingWinner: boolean; // showing the winner picker for the current game
}

// Whether logging this event completes the player's frame (auto-advance).
// A made corner does NOT end the frame — a Miss may follow it (corner + miss).
export function endsFrame(type: MinigameActionType): boolean {
  return type === "strike" || type === "spare" || type === "cornerMissed";
}

// A player's current frame index, defaulting to 0.
export function playerFrame(state: MinigameState, playerId: string): number {
  return state.frameByPlayer[playerId] ?? 0;
}

export const TENTH_FRAME_MAX_INPUTS = 3;

// The 10th frame is closed once it has 3 inputs, or an Open (which ends the
// frame with no bonus ball). No more inputs may be logged after that.
export function tenthFrameClosed(
  state: MinigameState,
  playerId: string,
  gameIndex: number,
): boolean {
  let count = 0;
  let hasOpen = false;
  for (const e of state.events) {
    if (e.playerId !== playerId || e.gameIndex !== gameIndex) continue;
    if (e.frameIndex !== TOTAL_FRAMES - 1) continue;
    count++;
    if (e.type === "cornerMissed") hasOpen = true;
  }
  return hasOpen || count >= TENTH_FRAME_MAX_INPUTS;
}

export interface MinigamePreset {
  id: string;
  label: string;
  strikePoints: number;
  cornerPoints: number;
  winnerPoints: number;
}

export const PRESETS: MinigamePreset[] = [
  {
    id: "2-2-3",
    label: "2-2-3",
    strikePoints: 2,
    cornerPoints: 2,
    winnerPoints: 3,
  },
  {
    id: "1-1-2",
    label: "1-1-2",
    strikePoints: 1,
    cornerPoints: 1,
    winnerPoints: 2,
  },
];

export const DEFAULT_RULES: MinigameRules = {
  strikePoints: 2,
  sparePoints: 0,
  cornerPoints: 2,
  winnerPoints: 3,
  penaltyEnabled: false,
  cornerMissPenalty: 1,
};

// The game currently being played (= number of completed games).
export function currentGameIndex(state: MinigameState): number {
  return state.games.length;
}

// Points an event is worth under the given rules. Misses are negative.
export function actionPoints(
  type: MinigameActionType,
  rules: MinigameRules,
): number {
  switch (type) {
    case "strike":
      return rules.strikePoints;
    case "spare":
      return rules.sparePoints;
    case "cornerMade":
      return rules.cornerPoints;
    case "cornerMissed":
      return rules.penaltyEnabled ? -rules.cornerMissPenalty : 0;
  }
}

// Total points per player: all event points + winner bonus for each game won.
export function computeTotals(state: MinigameState): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const p of state.players) totals[p.id] = 0;

  for (const e of state.events) {
    if (e.playerId in totals) totals[e.playerId] += e.points;
  }

  for (const g of state.games) {
    if (g.winnerId && g.winnerId in totals)
      totals[g.winnerId] += state.rules.winnerPoints;
  }

  return totals;
}

// Players sorted by total points descending (stable on entry order for ties).
export function standings(
  state: MinigameState,
): Array<{ player: MinigamePlayer; total: number; rank: number }> {
  const totals = computeTotals(state);
  const ordered = state.players
    .map((player, index) => ({ player, total: totals[player.id], index }))
    .sort((a, b) => b.total - a.total || a.index - b.index);

  let lastTotal: number | null = null;
  let lastRank = 0;
  return ordered.map((row, i) => {
    const rank = lastTotal === row.total ? lastRank : i + 1;
    lastTotal = row.total;
    lastRank = rank;
    return { player: row.player, total: row.total, rank };
  });
}

// Event counts for one player within a specific game + frame (for the live
// per-frame chips). Omit frameIndex to count the whole game.
export function frameCounts(
  state: MinigameState,
  playerId: string,
  gameIndex: number,
  frameIndex?: number,
): {
  strikes: number;
  spares: number;
  cornerMade: number;
  cornerMissed: number;
} {
  let strikes = 0;
  let spares = 0;
  let cornerMade = 0;
  let cornerMissed = 0;
  for (const e of state.events) {
    if (e.playerId !== playerId || e.gameIndex !== gameIndex) continue;
    if (frameIndex !== undefined && e.frameIndex !== frameIndex) continue;
    if (e.type === "strike") strikes++;
    else if (e.type === "spare") spares++;
    else if (e.type === "cornerMade") cornerMade++;
    else if (e.type === "cornerMissed") cornerMissed++;
  }
  return { strikes, spares, cornerMade, cornerMissed };
}

// Whole-session breakdown for one player, including games won.
export function playerSummary(
  state: MinigameState,
  playerId: string,
): {
  strikes: number;
  spares: number;
  cornerMade: number;
  cornerMissed: number;
  gamesWon: number;
} {
  const totals = { strikes: 0, spares: 0, cornerMade: 0, cornerMissed: 0 };
  for (const e of state.events) {
    if (e.playerId !== playerId) continue;
    if (e.type === "strike") totals.strikes++;
    else if (e.type === "spare") totals.spares++;
    else if (e.type === "cornerMade") totals.cornerMade++;
    else if (e.type === "cornerMissed") totals.cornerMissed++;
  }
  const gamesWon = state.games.filter((g) => g.winnerId === playerId).length;
  return { ...totals, gamesWon };
}

export function rulesFromPreset(
  preset: MinigamePreset,
  base: MinigameRules,
): MinigameRules {
  return {
    ...base,
    strikePoints: preset.strikePoints,
    cornerPoints: preset.cornerPoints,
    winnerPoints: preset.winnerPoints,
  };
}
