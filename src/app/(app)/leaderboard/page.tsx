export const revalidate = 300;

import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import { Swords, ChevronUp, ChevronDown, ChevronRight } from "lucide-react";
import RankInfoModal from "@/components/RankInfoModal";
import RankEmblem from "@/components/RankEmblem";
import type { ProfileRow } from "@/lib/queries";
import Avatar from "@/components/Avatar";
import { getRank, formatLP, CALIBRATION_GAMES } from "@/lib/ranking";

interface RankingRow {
  user_id: string;
  lp: number;
  total_games: number;
  avg: number;
  high: number;
  trend: "up" | "down" | "stable";
  rank: string;
  division: string | null;
  progress: number;
}

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Parallel: profiles + all rankings computed in Postgres
  const [profilesResult, rankingsResult] = await Promise.all([
    supabase.from("profiles").select("id, display_name, avatar_url"),
    supabase.rpc("get_all_rankings"),
  ]);

  const profiles = (profilesResult.data ?? []) as ProfileRow[];
  const rankingRows = (rankingsResult.data ?? []) as unknown as RankingRow[];

  // Index rankings by user_id
  const rankMap = new Map<string, RankingRow>();
  for (const r of rankingRows) {
    rankMap.set(r.user_id, r);
  }

  const rankings = profiles
    .map((profile) => {
      const r = rankMap.get(profile.id);
      const totalGames = r?.total_games ?? 0;
      const rank = getRank(r?.lp ?? 0);

      return {
        id: profile.id,
        name: profile.display_name,
        avatarUrl: profile.avatar_url,
        mmr: r?.lp ?? 0,
        rank,
        progress: r?.progress ?? 0,
        avg: r?.avg ?? 0,
        high: r?.high ?? 0,
        games: totalGames,
        trend: (r?.trend ?? "stable") as "up" | "down" | "stable",
        isCurrentUser: profile.id === user?.id,
        isCalibrating: totalGames < CALIBRATION_GAMES,
        isUnranked: totalGames === 0,
      };
    })
    .sort((a, b) => {
      if (a.isUnranked && !b.isUnranked) return 1;
      if (!a.isUnranked && b.isUnranked) return -1;
      if (a.isCalibrating && !b.isCalibrating) return 1;
      if (!a.isCalibrating && b.isCalibrating) return -1;
      return b.mmr - a.mmr;
    });

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
                  className="h-full rounded-full bg-gradient-to-r from-blue to-green transition-all"
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
                        avg {entry.avg}
                        {" \u2022 "}
                        {entry.games} games
                      </>
                    )}
                  </p>
                </div>

                {/* LP + trend */}
                <span className="shrink-0 text-xs font-bold text-text-muted">
                  {entry.isCalibrating ? "--" : `${formatLP(entry.mmr)} LP`}
                </span>

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
