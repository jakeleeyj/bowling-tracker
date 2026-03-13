export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase-server";
import { Swords, ChevronUp, ChevronDown, Minus } from "lucide-react";
import type { ProfileRow, GameRow } from "@/lib/queries";
import {
  calculateMMR,
  getRank,
  getDivisionProgress,
  formatMMR,
  getEventWeight,
} from "@/lib/ranking";

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

function RankEmblem({
  tierName,
  size = "md",
}: {
  tierName: string;
  size?: "sm" | "md" | "lg";
}) {
  const dims =
    size === "lg" ? "h-12 w-12" : size === "md" ? "h-9 w-9" : "h-7 w-7";
  const iconSize = size === "lg" ? 28 : size === "md" ? 20 : 16;

  const tierColors: Record<string, { fill: string; stroke: string }> = {
    Iron: { fill: "#9ca3af", stroke: "#6b7280" },
    Bronze: { fill: "#b45309", stroke: "#92400e" },
    Silver: { fill: "#d1d5db", stroke: "#9ca3af" },
    Gold: { fill: "#f59e0b", stroke: "#d97706" },
    Platinum: { fill: "#22d3ee", stroke: "#06b6d4" },
    Diamond: { fill: "#3b82f6", stroke: "#2563eb" },
    Master: { fill: "#8b5cf6", stroke: "#7c3aed" },
    Grandmaster: { fill: "#ef4444", stroke: "#dc2626" },
  };

  const colors = tierColors[tierName] ?? tierColors.Iron;

  return (
    <div className={`${dims} flex items-center justify-center`}>
      <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
        {/* Shield shape */}
        <path
          d="M12 2L3 7v5c0 5.25 3.83 10.15 9 11.25C17.17 22.15 21 17.25 21 12V7L12 2z"
          fill={colors.fill}
          fillOpacity={0.2}
          stroke={colors.stroke}
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
        {/* Inner diamond */}
        <path
          d="M12 7l3 5-3 5-3-5z"
          fill={colors.fill}
          fillOpacity={0.6}
          stroke={colors.stroke}
          strokeWidth={0.75}
        />
      </svg>
    </div>
  );
}

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profiles } = (await supabase.from("profiles").select("*")) as {
    data: ProfileRow[] | null;
  };

  const { data: allGames } = (await supabase
    .from("games")
    .select("*, sessions(event_label)")
    .order("created_at", { ascending: false })) as {
    data:
      | (GameRow & { sessions: { event_label: string | null } | null })[]
      | null;
  };

  const rankings = (profiles ?? [])
    .map((profile) => {
      const userGames = allGames?.filter((g) => g.user_id === profile.id) ?? [];
      const totalGames = userGames.length;
      if (totalGames === 0) return null;

      // Scores newest-first (already sorted by query)
      const scores = userGames.map((g) => g.total_score);
      const weights = userGames.map((g) =>
        getEventWeight(g.sessions?.event_label ?? null),
      );
      const mmr = calculateMMR(scores, weights);
      const rank = getRank(mmr);
      const progress = getDivisionProgress(mmr);
      const avg = Math.round(scores.reduce((s, v) => s + v, 0) / scores.length);
      const high = Math.max(...scores);

      // Recent trend: compare last 5 games MMR vs previous 5
      let trend: "up" | "down" | "stable" = "stable";
      if (scores.length >= 10) {
        const recentMMR = calculateMMR(scores.slice(0, 5), weights.slice(0, 5));
        const olderMMR = calculateMMR(
          scores.slice(5, 10),
          weights.slice(5, 10),
        );
        if (recentMMR - olderMMR > 3) trend = "up";
        else if (olderMMR - recentMMR > 3) trend = "down";
      }

      return {
        id: profile.id,
        name: profile.display_name,
        mmr,
        rank,
        progress,
        avg,
        high,
        games: totalGames,
        trend,
        isCurrentUser: profile.id === user?.id,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b!.mmr - a!.mmr);

  // Find current user's entry
  const currentUserEntry = rankings.find((e) => e?.isCurrentUser);

  return (
    <div>
      <div className="mb-5 flex items-center gap-2">
        <Swords size={20} className="text-blue" />
        <h1 className="text-xl font-extrabold text-text-primary">Ranked</h1>
      </div>

      {/* Current user's rank card */}
      {currentUserEntry && (
        <div
          className={`glass mb-5 overflow-hidden border ${currentUserEntry.rank.borderColor}`}
        >
          <div className="flex items-center gap-3 p-4">
            <RankEmblem tierName={currentUserEntry.rank.name} size="lg" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={`text-lg font-extrabold ${currentUserEntry.rank.color}`}
                >
                  {currentUserEntry.rank.name}
                  {currentUserEntry.rank.division &&
                    ` ${currentUserEntry.rank.division}`}
                </span>
                {currentUserEntry.trend === "up" && (
                  <ChevronUp size={16} className="text-green" />
                )}
                {currentUserEntry.trend === "down" && (
                  <ChevronDown size={16} className="text-red" />
                )}
              </div>
              <p className="text-[11px] text-text-muted">
                {formatMMR(currentUserEntry.mmr)} MMR &bull; avg{" "}
                {currentUserEntry.avg} &bull; {currentUserEntry.games} games
              </p>
            </div>
          </div>

          {/* Division progress bar */}
          <div className="px-4 pb-3">
            <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
              <div
                className={`h-full rounded-full ${currentUserEntry.rank.bgColor.replace("/10", "")} transition-all`}
                style={{ width: `${currentUserEntry.progress}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between text-[9px] text-text-muted">
              <span>
                {currentUserEntry.rank.name}{" "}
                {currentUserEntry.rank.division ?? ""}
              </span>
              <span>{currentUserEntry.progress}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Rankings list */}
      {rankings.length === 0 ? (
        <div className="glass p-8 text-center">
          <p className="text-sm text-text-muted">
            No scores yet. Be the first to log a game!
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {rankings.map((entry, index) => {
            if (!entry) return null;
            const position = index + 1;

            return (
              <div
                key={entry.id}
                className={`glass flex items-center gap-2.5 p-2.5 ${
                  entry.isCurrentUser ? `border ${entry.rank.borderColor}` : ""
                }`}
              >
                {/* Position */}
                <span className="w-5 text-center text-xs font-bold text-text-muted">
                  {position}
                </span>

                {/* Rank emblem */}
                <RankEmblem tierName={entry.rank.name} size="sm" />

                {/* Avatar */}
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${getAvatarGradient(entry.name)} text-[10px] font-bold`}
                >
                  {entry.name.charAt(0).toUpperCase()}
                </div>

                {/* Name + rank */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-text-primary">
                    {entry.isCurrentUser ? "You" : entry.name}
                  </p>
                  <p className="text-[10px] text-text-muted">
                    <span className={entry.rank.color}>
                      {entry.rank.name}
                      {entry.rank.division && ` ${entry.rank.division}`}
                    </span>
                    {" \u2022 "}
                    {entry.games} games
                  </p>
                </div>

                {/* MMR + trend */}
                <div className="flex items-center gap-1">
                  {entry.trend === "up" && (
                    <ChevronUp size={12} className="text-green" />
                  )}
                  {entry.trend === "down" && (
                    <ChevronDown size={12} className="text-red" />
                  )}
                  {entry.trend === "stable" && (
                    <Minus size={10} className="text-text-muted" />
                  )}
                  <div className="text-right">
                    <div className="text-sm font-extrabold text-text-primary">
                      {formatMMR(entry.mmr)}
                    </div>
                    <div className="text-[9px] text-text-muted">MMR</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
