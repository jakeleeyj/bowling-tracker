export const revalidate = 300;

import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import {
  Swords,
  ChevronUp,
  ChevronDown,
  Minus,
  ChevronRight,
} from "lucide-react";
import RankInfoModal from "@/components/RankInfoModal";
import type { ProfileRow, GameRow } from "@/lib/queries";
import Avatar from "@/components/Avatar";
import {
  calculateLP,
  getRank,
  getDivisionProgress,
  formatLP,
  getEventWeight,
  CALIBRATION_GAMES,
} from "@/lib/ranking";

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
    Emerald: { fill: "#34d399", stroke: "#10b981" },
    Challenger: { fill: "#fb7185", stroke: "#f43f5e" },
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

      if (totalGames === 0) {
        return {
          id: profile.id,
          name: profile.display_name,
          avatarUrl: profile.avatar_url,
          mmr: 0,
          rank: getRank(0),
          progress: 0,
          avg: 0,
          high: 0,
          games: 0,
          trend: "stable" as const,
          isCurrentUser: profile.id === user?.id,
          isCalibrating: true,
          isUnranked: true,
        };
      }

      // Scores newest-first (already sorted by query)
      const scores = userGames.map((g) => g.total_score);
      const weights = userGames.map((g) =>
        getEventWeight(g.sessions?.event_label ?? null),
      );
      const mmr = calculateLP(scores, weights);
      const rank = getRank(mmr);
      const progress = getDivisionProgress(mmr);
      const avg = Math.round(scores.reduce((s, v) => s + v, 0) / scores.length);
      const high = Math.max(...scores);

      // Recent trend: compare last 5 games avg LP gain vs overall avg LP gain
      let trend: "up" | "down" | "stable" = "stable";
      if (scores.length >= 10) {
        const recentAvg = scores.slice(0, 5).reduce((s, v) => s + v, 0) / 5;
        const olderAvg = scores.slice(5, 10).reduce((s, v) => s + v, 0) / 5;
        if (recentAvg - olderAvg > 5) trend = "up";
        else if (olderAvg - recentAvg > 5) trend = "down";
      }

      return {
        id: profile.id,
        name: profile.display_name,
        avatarUrl: profile.avatar_url,
        mmr,
        rank,
        progress,
        avg,
        high,
        games: totalGames,
        trend,
        isCurrentUser: profile.id === user?.id,
        isCalibrating: totalGames < CALIBRATION_GAMES,
        isUnranked: false,
      };
    })
    .sort((a, b) => {
      // Unranked (0 games) at very bottom
      if (a.isUnranked && !b.isUnranked) return 1;
      if (!a.isUnranked && b.isUnranked) return -1;
      // Calibrating users next to bottom
      if (a.isCalibrating && !b.isCalibrating) return 1;
      if (!a.isCalibrating && b.isCalibrating) return -1;
      return b.mmr - a.mmr;
    });

  // Find current user's entry
  const currentUserEntry = rankings.find((e) => e?.isCurrentUser);

  return (
    <div>
      <div className="mb-5 flex items-center gap-2">
        <Swords size={20} className="text-blue" />
        <h1 className="flex-1 text-xl font-extrabold text-text-primary">
          Ranked
        </h1>
        <RankInfoModal />
      </div>

      {/* Current user's rank card */}
      {currentUserEntry && (
        <div
          className={`glass mb-5 overflow-hidden border ${currentUserEntry.isCalibrating ? "border-border/30" : currentUserEntry.rank.borderColor}`}
        >
          <div className="flex items-center gap-3 p-4">
            {currentUserEntry.isCalibrating ? (
              <div className="flex h-12 w-12 items-center justify-center text-text-muted">
                <svg width={28} height={28} viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2L3 7v5c0 5.25 3.83 10.15 9 11.25C17.17 22.15 21 17.25 21 12V7L12 2z"
                    fill="currentColor"
                    fillOpacity={0.1}
                    stroke="currentColor"
                    strokeWidth={1.5}
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            ) : (
              <RankEmblem tierName={currentUserEntry.rank.name} size="lg" />
            )}
            <div className="flex-1">
              {currentUserEntry.isCalibrating ? (
                <>
                  <span className="text-lg font-extrabold text-text-muted">
                    Calibrating
                  </span>
                  <p className="text-[11px] text-text-muted">
                    {CALIBRATION_GAMES - currentUserEntry.games} more game
                    {CALIBRATION_GAMES - currentUserEntry.games !== 1
                      ? "s"
                      : ""}{" "}
                    to set your rank
                  </p>
                </>
              ) : (
                <>
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
                    {formatLP(currentUserEntry.mmr)} LP &bull; avg{" "}
                    {currentUserEntry.avg} &bull; {currentUserEntry.games} games
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Division progress bar */}
          {!currentUserEntry.isCalibrating && (
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
          )}
          {currentUserEntry.isCalibrating && (
            <div className="px-4 pb-3">
              <div className="flex gap-1.5">
                {Array.from({ length: CALIBRATION_GAMES }, (_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full ${
                      i < currentUserEntry.games ? "bg-blue" : "bg-white/5"
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Rankings list */}
      {rankings.length > 1 && (
        <p className="mb-2 text-[11px] text-text-muted">
          Tap a player to view their history
        </p>
      )}
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

            const href = entry.isCurrentUser
              ? "/profile"
              : `/player/${entry.id}`;

            return (
              <Link
                key={entry.id}
                href={href}
                className={`glass flex items-center gap-2.5 p-2.5 active:bg-white/[0.03] ${
                  entry.isCurrentUser && !entry.isCalibrating
                    ? `border ${entry.rank.borderColor}`
                    : ""
                }`}
              >
                {/* Position */}
                <span className="w-5 text-center text-xs font-bold text-text-muted">
                  {entry.isCalibrating ? "-" : position}
                </span>

                {/* Rank emblem */}
                {entry.isCalibrating ? (
                  <div className="flex h-7 w-7 items-center justify-center text-text-muted">
                    <svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                      <path
                        d="M12 2L3 7v5c0 5.25 3.83 10.15 9 11.25C17.17 22.15 21 17.25 21 12V7L12 2z"
                        fill="currentColor"
                        fillOpacity={0.1}
                        stroke="currentColor"
                        strokeWidth={1.5}
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                ) : (
                  <RankEmblem tierName={entry.rank.name} size="sm" />
                )}

                {/* Avatar */}
                <Avatar
                  name={entry.name}
                  avatarUrl={entry.avatarUrl}
                  size="sm"
                />

                {/* Name + rank */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-text-primary">
                    {entry.isCurrentUser ? "You" : entry.name}
                  </p>
                  <p className="text-[10px] text-text-muted">
                    {entry.isCalibrating ? (
                      <span className="text-text-muted">
                        {entry.isUnranked
                          ? "No games yet"
                          : `Calibrating \u2022 ${entry.games} games`}
                      </span>
                    ) : (
                      <>
                        <span className={entry.rank.color}>
                          {entry.rank.name}
                          {entry.rank.division && ` ${entry.rank.division}`}
                        </span>
                        {" \u2022 "}
                        {entry.games} games
                      </>
                    )}
                  </p>
                </div>

                {/* LP + trend */}
                <div className="flex items-center gap-1 shrink-0">
                  {entry.isCalibrating ? (
                    <div className="text-right">
                      <div className="text-sm font-extrabold text-text-muted">
                        --
                      </div>
                      <div className="text-[9px] text-text-muted">LP</div>
                    </div>
                  ) : (
                    <>
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
                          {formatLP(entry.mmr)}
                        </div>
                        <div className="text-[9px] text-text-muted">LP</div>
                      </div>
                    </>
                  )}
                </div>

                <ChevronRight
                  size={14}
                  className="shrink-0 text-text-muted/30"
                />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
