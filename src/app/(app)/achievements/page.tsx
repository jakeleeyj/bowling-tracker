import { createClient } from "@/lib/supabase-server";
import type { GameRow, FrameRow } from "@/lib/queries";
import {
  Trophy,
  Zap,
  Sparkles,
  Flame,
  Target,
  Crown,
  Award,
} from "lucide-react";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  check: (stats: Stats) => boolean;
}

interface Stats {
  highGame: number;
  totalGames: number;
  cleanGames: number;
  maxConsecutiveStrikes: number;
  maxConsecutiveSpares: number;
  has200Game: boolean;
}

const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first-200",
    name: "200 Club",
    description: "Score 200+ in a single game",
    icon: <Trophy size={24} />,
    color: "text-gold",
    check: (s) => s.has200Game,
  },
  {
    id: "turkey",
    name: "Turkey",
    description: "3 strikes in a row",
    icon: <Zap size={24} />,
    color: "text-green",
    check: (s) => s.maxConsecutiveStrikes >= 3,
  },
  {
    id: "clean-game",
    name: "Clean Game",
    description: "No open frames in a game",
    icon: <Sparkles size={24} />,
    color: "text-blue",
    check: (s) => s.cleanGames > 0,
  },
  {
    id: "six-pack",
    name: "Six Pack",
    description: "6 strikes in a row",
    icon: <Flame size={24} />,
    color: "text-red",
    check: (s) => s.maxConsecutiveStrikes >= 6,
  },
  {
    id: "perfect",
    name: "Perfect Game",
    description: "Score a 300",
    icon: <Crown size={24} />,
    color: "text-gold",
    check: (s) => s.highGame === 300,
  },
  {
    id: "spare-streak",
    name: "Spare Master",
    description: "Pick up 5+ consecutive spares",
    icon: <Target size={24} />,
    color: "text-purple",
    check: (s) => s.maxConsecutiveSpares >= 5,
  },
  {
    id: "century",
    name: "Century Club",
    description: "Log 100+ games",
    icon: <Award size={24} />,
    color: "text-pink",
    check: (s) => s.totalGames >= 100,
  },
];

export default async function AchievementsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: games } = (await supabase
    .from("games")
    .select("*")
    .eq("user_id", user?.id ?? "")) as { data: GameRow[] | null };

  const gameIds = games?.map((g) => g.id) ?? [];
  const { data: allFrames } = (await supabase
    .from("frames")
    .select("*")
    .in("game_id", gameIds.length > 0 ? gameIds : ["none"])
    .order("frame_number", { ascending: true })) as { data: FrameRow[] | null };

  // Calculate stats
  const totalGames = games?.length ?? 0;
  const highGame =
    totalGames > 0 ? Math.max(...(games?.map((g) => g.total_score) ?? [0])) : 0;
  const cleanGames = games?.filter((g) => g.is_clean).length ?? 0;
  const has200Game = games?.some((g) => g.total_score >= 200) ?? false;

  // Consecutive strikes
  let maxConsecutiveStrikes = 0;
  let currentStrikes = 0;
  // Group frames by game
  const framesByGame: Record<string, typeof allFrames> = {};
  allFrames?.forEach((f) => {
    if (!framesByGame[f.game_id]) framesByGame[f.game_id] = [];
    framesByGame[f.game_id]!.push(f);
  });

  for (const gFrames of Object.values(framesByGame)) {
    currentStrikes = 0;
    for (const f of gFrames ?? []) {
      if (f.is_strike) {
        currentStrikes++;
        maxConsecutiveStrikes = Math.max(maxConsecutiveStrikes, currentStrikes);
      } else {
        currentStrikes = 0;
      }
    }
  }

  // Consecutive spares
  let maxConsecutiveSpares = 0;
  let currentSpares = 0;
  for (const gFrames of Object.values(framesByGame)) {
    currentSpares = 0;
    for (const f of gFrames ?? []) {
      if (f.spare_converted) {
        currentSpares++;
        maxConsecutiveSpares = Math.max(maxConsecutiveSpares, currentSpares);
      } else if (!f.is_strike) {
        currentSpares = 0;
      }
    }
  }

  const stats: Stats = {
    highGame,
    totalGames,
    cleanGames,
    maxConsecutiveStrikes,
    maxConsecutiveSpares,
    has200Game,
  };

  const earned = ACHIEVEMENTS.filter((a) => a.check(stats));
  const locked = ACHIEVEMENTS.filter((a) => !a.check(stats));

  return (
    <div>
      <h1 className="mb-2 text-xl font-extrabold">Achievements</h1>
      <p className="mb-6 text-sm text-text-muted">
        {earned.length}/{ACHIEVEMENTS.length} unlocked
      </p>

      {earned.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-text-secondary">
            Earned
          </h2>
          <div className="flex flex-col gap-2">
            {earned.map((a) => (
              <div key={a.id} className="glass flex items-center gap-4 p-4">
                <div className={a.color}>{a.icon}</div>
                <div>
                  <p className="text-sm font-bold">{a.name}</p>
                  <p className="text-[11px] text-text-muted">{a.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-text-secondary">
        Locked
      </h2>
      <div className="flex flex-col gap-2">
        {locked.map((a) => (
          <div
            key={a.id}
            className="glass flex items-center gap-4 p-4 opacity-40"
          >
            <div className="text-text-muted">{a.icon}</div>
            <div>
              <p className="text-sm font-bold">{a.name}</p>
              <p className="text-[11px] text-text-muted">{a.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
