export const revalidate = 300; // revalidate every 5 minutes

import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import { ChevronUp, ChevronDown, ChevronRight } from "lucide-react";
import type {
  ProfileRow,
  SessionWithGamesFramesAndProfile,
  PlayerLP,
} from "@/lib/queries";
import SessionCard from "@/components/SessionCard";
import Avatar from "@/components/Avatar";
import NotificationPrompt from "@/components/NotificationPrompt";
import {
  getRank,
  getDivisionProgress,
  formatLP,
  CALIBRATION_GAMES,
} from "@/lib/ranking";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const uid = user?.id ?? "";

  // Phase 1: fetch profile, user LP, recent sessions, and all rankings in parallel
  const [profileResult, userLpResult, sessionsResult, allRankingsResult] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).single(),
      supabase.rpc("get_player_lp", { p_user_id: uid }),
      supabase
        .from("sessions")
        .select("*, profiles(*), games(*, frames(*))")
        .order("created_at", { ascending: false })
        .limit(10),
      supabase.rpc("get_all_rankings"),
    ]);

  const profile = profileResult.data as ProfileRow | null;
  const userLpData = (userLpResult.data ?? {}) as unknown as PlayerLP;
  const sessions = sessionsResult.data as
    | SessionWithGamesFramesAndProfile[]
    | null;
  const allRankings = (allRankingsResult.data ?? []) as unknown as {
    user_id: string;
    lp: number;
    total_games: number;
    rank: string;
    division: string | null;
  }[];

  // Index rankings by user_id for feed rank badges
  const userRanks: Record<string, ReturnType<typeof getRank>> = {};
  const userGameCounts: Record<string, number> = {};
  for (const r of allRankings) {
    userRanks[r.user_id] = getRank(r.lp);
    userGameCounts[r.user_id] = r.total_games;
  }

  const totalGames = userLpData.total_games ?? 0;
  const avgScore = userLpData.avg ?? 0;
  const highScore = userLpData.high ?? 0;
  const lp = userLpData.lp ?? 0;
  const rank = getRank(lp);

  // Trend from rankings data
  const myRanking = allRankings.find((r) => r.user_id === uid);
  const trend = ((myRanking as { trend?: string })?.trend ?? "stable") as
    | "up"
    | "down"
    | "stable";

  // Phase 2: compute session LP deltas via Postgres function
  const sessionIds = sessions?.map((s) => s.id) ?? [];
  let sessionLpChange: Record<string, number> = {};
  if (sessionIds.length > 0) {
    const { data: deltas } = await supabase.rpc("get_session_lp_deltas", {
      p_session_ids: sessionIds,
    });
    sessionLpChange = (deltas ?? {}) as Record<string, number>;
  }

  const displayName = profile?.display_name ?? "Bowler";

  // Track which sessions include calibration games (per user)
  // Sessions are newest-first, so walk in reverse to count chronologically
  const gamesBeforeSession: Record<string, Record<string, number>> = {};
  const userRunning: Record<string, number> = {};
  for (const s of [...(sessions ?? [])].reverse()) {
    const u = s.user_id;
    userRunning[u] = userRunning[u] ?? 0;
    gamesBeforeSession[u] = gamesBeforeSession[u] ?? {};
    gamesBeforeSession[u][s.id] = userRunning[u];
    userRunning[u] += s.games.length;
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-[13px] text-text-muted">Welcome back</p>
          <h1 className="text-xl font-extrabold">{displayName}</h1>
        </div>
        <Avatar name={displayName} avatarUrl={profile?.avatar_url} size="md" />
      </div>

      {/* Notification prompt — shows once for new users */}
      <NotificationPrompt />

      {/* Quick Stats */}
      <div className="mb-5 flex gap-2">
        <div className="glass flex-1 p-3 text-center">
          <div className="text-[10px] uppercase tracking-wide text-text-muted">
            Avg
          </div>
          <div className="my-1 text-2xl font-extrabold">{avgScore}</div>
        </div>
        <div className="glass flex-1 p-3 text-center">
          <div className="text-[10px] uppercase tracking-wide text-text-muted">
            High
          </div>
          <div className="my-1 text-2xl font-extrabold">{highScore}</div>
        </div>
        <div className="glass flex-1 p-3 text-center">
          <div className="text-[10px] uppercase tracking-wide text-text-muted">
            Games
          </div>
          <div className="my-1 text-2xl font-extrabold">{totalGames}</div>
        </div>
      </div>

      {/* Rank Card */}
      {totalGames > 0 && (
        <Link
          href="/leaderboard"
          className={`glass mb-5 flex items-center gap-3 border p-3 ${totalGames >= CALIBRATION_GAMES ? rank.borderColor : "border-border/30"} active:scale-[0.98]`}
        >
          <div className={`flex h-10 w-10 items-center justify-center`}>
            <svg width={24} height={24} viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L3 7v5c0 5.25 3.83 10.15 9 11.25C17.17 22.15 21 17.25 21 12V7L12 2z"
                fill="currentColor"
                fillOpacity={0.15}
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinejoin="round"
                className={
                  totalGames >= CALIBRATION_GAMES
                    ? rank.color
                    : "text-text-muted"
                }
              />
              <path
                d="M12 7l3 5-3 5-3-5z"
                fill="currentColor"
                fillOpacity={0.4}
                stroke="currentColor"
                strokeWidth={0.75}
                className={
                  totalGames >= CALIBRATION_GAMES
                    ? rank.color
                    : "text-text-muted"
                }
              />
            </svg>
          </div>
          <div className="flex-1">
            {totalGames >= CALIBRATION_GAMES ? (
              <>
                <div className="flex items-center gap-1">
                  <span className={`text-sm font-extrabold ${rank.color}`}>
                    {rank.name}
                    {rank.division ? ` ${rank.division}` : ""}
                  </span>
                  {trend === "up" && (
                    <ChevronUp size={14} className="text-green" />
                  )}
                  {trend === "down" && (
                    <ChevronDown size={14} className="text-red" />
                  )}
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-light">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue to-green"
                      style={{ width: `${getDivisionProgress(lp)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-text-muted">
                    {formatLP(lp)} LP
                  </span>
                </div>
              </>
            ) : (
              <>
                <span className="text-sm font-extrabold text-text-muted">
                  Calibrating
                </span>
                <p className="text-[10px] text-text-muted">
                  {CALIBRATION_GAMES - totalGames} more game
                  {CALIBRATION_GAMES - totalGames !== 1 ? "s" : ""} to rank
                </p>
              </>
            )}
          </div>
          <ChevronRight size={14} className="shrink-0 text-text-muted/30" />
        </Link>
      )}

      {/* CTA */}
      <Link
        href="/log"
        className="mb-5 block rounded-xl bg-gradient-to-r from-blue to-blue-dark py-4 text-center text-base font-bold text-white shadow-lg shadow-blue/25 transition-all duration-150 active:scale-[0.97]"
      >
        Log a Session
      </Link>

      {/* Activity Feed */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold">Recent Activity</h2>
        <Link href="/profile" className="text-xs text-blue">
          See all
        </Link>
      </div>

      {(!sessions || sessions.length === 0) && (
        <div className="glass p-8 text-center">
          <p className="text-sm text-text-muted">
            No games yet. Log your first session!
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {sessions?.map((session) => {
          const gamesBefore =
            gamesBeforeSession[session.user_id]?.[session.id] ?? 0;
          const isCalibrationSession = gamesBefore < CALIBRATION_GAMES;
          const sessionProfile = session.profiles;
          const sessionGames = [...session.games].sort(
            (a, b) => a.game_number - b.game_number,
          );
          const isOwnSession = session.user_id === user?.id;
          const name = isOwnSession
            ? "You"
            : (sessionProfile?.display_name ?? "Unknown");
          const realName = sessionProfile?.display_name ?? "Unknown";
          const avg =
            sessionGames.length > 0
              ? Math.round(
                  sessionGames.reduce((s, g) => s + g.total_score, 0) /
                    sessionGames.length,
                )
              : 0;

          const createdAt = new Date(session.created_at);
          const dateLabel = createdAt.toLocaleDateString("en-SG", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
            timeZone: "Asia/Singapore",
          });

          return (
            <SessionCard
              key={session.id}
              sessionId={session.id}
              name={name}
              realName={realName}
              dateLabel={dateLabel}
              avg={avg}
              totalPins={session.total_pins}
              venue={session.venue}
              eventLabel={session.event_label}
              games={sessionGames}
              avatarUrl={sessionProfile?.avatar_url}
              isOwn={isOwnSession}
              lpChange={sessionLpChange[session.id]}
              isCalibrationSession={isCalibrationSession}
              rankLabel={
                userRanks[session.user_id] &&
                (userGameCounts[session.user_id] ?? 0) >= CALIBRATION_GAMES
                  ? `${userRanks[session.user_id].name}${userRanks[session.user_id].division ? ` ${userRanks[session.user_id].division}` : ""}`
                  : undefined
              }
              rankColor={
                (userGameCounts[session.user_id] ?? 0) >= CALIBRATION_GAMES
                  ? userRanks[session.user_id]?.color
                  : undefined
              }
            />
          );
        })}
      </div>
    </div>
  );
}
