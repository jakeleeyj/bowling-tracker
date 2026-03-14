import type { ReactNode } from "react";
import { isSplit } from "@/lib/bowling";

export interface AchievementStats {
  highGame: number;
  totalGames: number;
  totalSessions: number;
  cleanGames: number;
  maxConsecutiveStrikes: number;
  maxConsecutiveSpares: number;
  has200Game: boolean;
  has250Game: boolean;
  has149Game: boolean;
  totalStrikes: number;
  totalSpares: number;
  gamesInSingleSession: number;
  maxSplitsInGame: number;
  max710InGame: number;
  hasSplitSpare: boolean;
}

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  iconName: string;
  color: string;
  bgColor: string;
  check: (s: AchievementStats) => boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: "first-200",
    name: "200 Club",
    description: "Score 200+",
    iconName: "Trophy",
    color: "text-gold",
    bgColor: "bg-gold/10",
    check: (s) => s.has200Game,
  },
  {
    id: "first-250",
    name: "250 Club",
    description: "Score 250+",
    iconName: "Trophy",
    color: "text-gold",
    bgColor: "bg-gold/10",
    check: (s) => s.has250Game,
  },
  {
    id: "turkey",
    name: "Turkey",
    description: "3 strikes in a row",
    iconName: "Zap",
    color: "text-green",
    bgColor: "bg-green/10",
    check: (s) => s.maxConsecutiveStrikes >= 3,
  },
  {
    id: "four-bagger",
    name: "Four-Bagger",
    description: "4 strikes in a row",
    iconName: "Zap",
    color: "text-green",
    bgColor: "bg-green/10",
    check: (s) => s.maxConsecutiveStrikes >= 4,
  },
  {
    id: "clean-game",
    name: "Clean Game",
    description: "No open frames",
    iconName: "Sparkles",
    color: "text-blue",
    bgColor: "bg-blue/10",
    check: (s) => s.cleanGames > 0,
  },
  {
    id: "six-pack",
    name: "Six Pack",
    description: "6 strikes in a row",
    iconName: "Flame",
    color: "text-red",
    bgColor: "bg-red/10",
    check: (s) => s.maxConsecutiveStrikes >= 6,
  },
  {
    id: "perfect",
    name: "Perfect Game",
    description: "Score 300",
    iconName: "Crown",
    color: "text-gold",
    bgColor: "bg-gold/10",
    check: (s) => s.highGame === 300,
  },
  {
    id: "spare-streak",
    name: "Spare Master",
    description: "5+ consecutive spares",
    iconName: "Target",
    color: "text-purple",
    bgColor: "bg-purple/10",
    check: (s) => s.maxConsecutiveSpares >= 5,
  },
  {
    id: "strike-machine",
    name: "Strike Machine",
    description: "50 total strikes",
    iconName: "Zap",
    color: "text-green",
    bgColor: "bg-green/10",
    check: (s) => s.totalStrikes >= 50,
  },
  {
    id: "spare-collector",
    name: "Spare Collector",
    description: "50 total spares",
    iconName: "Target",
    color: "text-purple",
    bgColor: "bg-purple/10",
    check: (s) => s.totalSpares >= 50,
  },
  {
    id: "marathon",
    name: "Marathon",
    description: "6+ games in one session",
    iconName: "Flame",
    color: "text-red",
    bgColor: "bg-red/10",
    check: (s) => s.gamesInSingleSession >= 6,
  },
  {
    id: "ten-sessions",
    name: "Regular",
    description: "10 sessions logged",
    iconName: "Award",
    color: "text-blue",
    bgColor: "bg-blue/10",
    check: (s) => s.totalSessions >= 10,
  },
  {
    id: "fifty-games",
    name: "Dedicated",
    description: "50 games logged",
    iconName: "Award",
    color: "text-pink",
    bgColor: "bg-pink/10",
    check: (s) => s.totalGames >= 50,
  },
  {
    id: "century",
    name: "Century Club",
    description: "100+ games logged",
    iconName: "Award",
    color: "text-pink",
    bgColor: "bg-pink/10",
    check: (s) => s.totalGames >= 100,
  },
  {
    id: "clean-streak",
    name: "Mr. Clean",
    description: "3 clean games",
    iconName: "Sparkles",
    color: "text-blue",
    bgColor: "bg-blue/10",
    check: (s) => s.cleanGames >= 3,
  },
  {
    id: "club-149",
    name: "149 Club",
    description: "Score exactly 149",
    iconName: "Award",
    color: "text-gold",
    bgColor: "bg-gold/10",
    check: (s) => s.has149Game,
  },
  {
    id: "split-spare",
    name: "Split Decision",
    description: "Convert a split",
    iconName: "Target",
    color: "text-green",
    bgColor: "bg-green/10",
    check: (s) => s.hasSplitSpare,
  },
  {
    id: "moses",
    name: "Moses",
    description: "3+ splits in one game",
    iconName: "Zap",
    color: "text-red",
    bgColor: "bg-red/10",
    check: (s) => s.maxSplitsInGame >= 3,
  },
  {
    id: "triple-7-10",
    name: "Are You Serious",
    description: "Three 7-10 splits in one game",
    iconName: "Flame",
    color: "text-red",
    bgColor: "bg-red/10",
    check: (s) => s.max710InGame >= 3,
  },
];

// Map icon names to the actual Lucide icon components (done in the component layer)
export function getAchievementIcon(iconName: string): string {
  return iconName;
}

// Compute stats from game/frame data
export function computeAchievementStats(
  games: {
    total_score: number;
    is_clean: boolean;
    strike_count: number;
    spare_count: number;
    session_id: string;
  }[],
  frames: {
    game_id: string;
    is_strike: boolean;
    is_spare: boolean;
    spare_converted: boolean;
    pins_remaining: number[] | null;
  }[],
  gameIds: string[],
): AchievementStats {
  const totalGames = games.length;
  const highGame =
    totalGames > 0 ? Math.max(...games.map((g) => g.total_score)) : 0;
  const cleanGames = games.filter((g) => g.is_clean).length;
  const has200Game = games.some((g) => g.total_score >= 200);
  const has250Game = games.some((g) => g.total_score >= 250);
  const has149Game = games.some((g) => g.total_score === 149);
  const totalStrikes = games.reduce((s, g) => s + g.strike_count, 0);
  const totalSpares = games.reduce((s, g) => s + g.spare_count, 0);

  // Count unique sessions
  const sessionIds = new Set(games.map((g) => g.session_id));
  const totalSessions = sessionIds.size;

  // Max games in a single session
  const sessionGameCounts: Record<string, number> = {};
  games.forEach((g) => {
    sessionGameCounts[g.session_id] =
      (sessionGameCounts[g.session_id] ?? 0) + 1;
  });
  const gamesInSingleSession = Math.max(0, ...Object.values(sessionGameCounts));

  // Group frames by game for streak + split calc
  const byGame: Record<
    string,
    {
      is_strike: boolean;
      is_spare: boolean;
      spare_converted: boolean;
      pins_remaining: number[] | null;
    }[]
  > = {};
  frames.forEach((f) => {
    if (!byGame[f.game_id]) byGame[f.game_id] = [];
    byGame[f.game_id].push(f);
  });

  let maxStrikes = 0;
  let maxSpares = 0;
  let maxSplitsInGame = 0;
  let max710InGame = 0;
  let hasSplitSpare = false;

  for (const gFrames of Object.values(byGame)) {
    let cs = 0;
    let cp = 0;
    let gameSplits = 0;
    let game710s = 0;

    for (const f of gFrames) {
      if (f.is_strike) {
        cs++;
        maxStrikes = Math.max(maxStrikes, cs);
      } else {
        cs = 0;
      }
      if (f.spare_converted) {
        cp++;
        maxSpares = Math.max(maxSpares, cp);
      } else if (!f.is_strike) {
        cp = 0;
      }

      // Split detection
      const pins = f.pins_remaining;
      if (pins && pins.length >= 2 && isSplit(pins)) {
        gameSplits++;
        // 7-10 split
        if (pins.length === 2 && pins.includes(7) && pins.includes(10)) {
          game710s++;
        }
        // Split spare
        if (f.is_spare || f.spare_converted) {
          hasSplitSpare = true;
        }
      }
    }

    maxSplitsInGame = Math.max(maxSplitsInGame, gameSplits);
    max710InGame = Math.max(max710InGame, game710s);
  }

  return {
    highGame,
    totalGames,
    totalSessions,
    cleanGames,
    maxConsecutiveStrikes: maxStrikes,
    maxConsecutiveSpares: maxSpares,
    has200Game,
    has250Game,
    has149Game,
    totalStrikes,
    totalSpares,
    gamesInSingleSession,
    maxSplitsInGame,
    max710InGame,
    hasSplitSpare,
  };
}

// Detect newly unlocked achievements
export function detectNewAchievements(
  oldStats: AchievementStats,
  newStats: AchievementStats,
): AchievementDef[] {
  return ACHIEVEMENTS.filter((a) => !a.check(oldStats) && a.check(newStats));
}
