export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase-server";
import { Trophy } from "lucide-react";
import type { ProfileRow, GameRow } from "@/lib/queries";

const AVATAR_GRADIENTS = [
  "from-blue to-indigo-500",
  "from-purple to-fuchsia-500",
  "from-pink to-rose-500",
  "from-green to-emerald-500",
  "from-gold to-orange-500",
  "from-cyan-500 to-blue",
];

function getAvatarGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get all profiles
  const { data: profiles } = (await supabase.from("profiles").select("*")) as {
    data: ProfileRow[] | null;
  };

  // Get all games
  const { data: allGames } = (await supabase.from("games").select("*")) as {
    data: GameRow[] | null;
  };

  // Build leaderboard
  const leaderboard = (profiles ?? [])
    .map((profile) => {
      const userGames = allGames?.filter((g) => g.user_id === profile.id) ?? [];
      const totalGames = userGames.length;
      if (totalGames === 0) return null;

      const avg = Math.round(
        userGames.reduce((sum, g) => sum + g.total_score, 0) / totalGames,
      );
      const high = Math.max(...userGames.map((g) => g.total_score));

      return {
        id: profile.id,
        name: profile.display_name,
        avg,
        high,
        games: totalGames,
        isCurrentUser: profile.id === user?.id,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b!.avg - a!.avg);

  return (
    <div>
      <h1 className="mb-6 text-xl font-extrabold">Leaderboard</h1>

      {leaderboard.length === 0 ? (
        <div className="glass p-8 text-center">
          <p className="text-sm text-text-muted">
            No scores yet. Be the first to log a game!
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {leaderboard.map((entry, index) => {
            if (!entry) return null;
            const rank = index + 1;

            return (
              <div
                key={entry.id}
                className={`glass flex items-center gap-3 p-3 ${entry.isCurrentUser ? "border-blue/30" : ""}`}
              >
                {/* Rank */}
                <div className="flex h-8 w-8 items-center justify-center">
                  {rank <= 3 ? (
                    <Trophy
                      size={18}
                      className={
                        rank === 1
                          ? "text-gold"
                          : rank === 2
                            ? "text-gray-300"
                            : "text-amber-700"
                      }
                      fill="currentColor"
                    />
                  ) : (
                    <span className="text-sm font-bold text-text-muted">
                      {rank}
                    </span>
                  )}
                </div>

                {/* Avatar */}
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br ${getAvatarGradient(entry.name)} text-[11px] font-bold`}
                >
                  {entry.name.charAt(0).toUpperCase()}
                </div>

                {/* Name */}
                <div className="flex-1">
                  <p className="text-sm font-semibold">
                    {entry.isCurrentUser ? "You" : entry.name}
                  </p>
                  <p className="text-[10px] text-text-muted">
                    {entry.games} games &bull; high {entry.high}
                  </p>
                </div>

                {/* Average */}
                <div className="text-right">
                  <div className="text-lg font-extrabold">{entry.avg}</div>
                  <div className="text-[9px] text-text-muted">avg</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
