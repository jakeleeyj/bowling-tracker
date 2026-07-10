export const revalidate = 300; // revalidate every 5 minutes

import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import type {
  ProfileRow,
  SessionWithGamesFramesAndProfile,
  PlayerLP,
} from "@/lib/queries";
import RecentActivity from "@/components/RecentActivity";
import Avatar from "@/components/Avatar";
import InstallPrompt from "@/components/InstallPrompt";
import SeasonBanner from "@/components/SeasonBanner";
import RankBanner from "@/components/RankBanner";
import { getRank } from "@/lib/ranking";

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
    SessionWithGamesFramesAndProfile[] | null;
  const allRankings = (allRankingsResult.data ?? []) as unknown as {
    user_id: string;
    lp: number;
    total_games: number;
    rank: string;
    division: string | null;
    season_avg: number;
    season_games: number;
  }[];

  // Index rankings by user_id for feed rank badges
  const userRanks: Record<string, ReturnType<typeof getRank>> = {};
  const userGameCounts: Record<string, number> = {};
  const userLps: Record<string, number> = {};
  for (const r of allRankings) {
    userRanks[r.user_id] = getRank(r.lp);
    userGameCounts[r.user_id] = r.total_games;
    userLps[r.user_id] = r.lp;
  }

  const totalGames = userLpData.total_games ?? 0;
  const avgScore = userLpData.avg ?? 0;
  const highScore = userLpData.high ?? 0;
  const lp = userLpData.lp ?? 0;

  // Trend from rankings data
  const myRanking = allRankings.find((r) => r.user_id === uid);
  const trend = ((myRanking as { trend?: string })?.trend ?? "stable") as
    "up" | "down" | "stable";

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
  // Walk newest-first, subtracting each session's games from the known total
  const gamesBeforeSession: Record<string, Record<string, number>> = {};
  const userRemaining: Record<string, number> = {};
  for (const s of sessions ?? []) {
    const u = s.user_id;
    if (!(u in userRemaining)) {
      userRemaining[u] = userGameCounts[u] ?? 0;
    }
    userRemaining[u] -= s.games.length;
    gamesBeforeSession[u] = gamesBeforeSession[u] ?? {};
    gamesBeforeSession[u][s.id] = userRemaining[u];
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

      <SeasonBanner />

      {/* Notification prompt — shows once for new users */}
      <InstallPrompt />

      {/* Rank Card */}
      {totalGames > 0 && (
        <RankBanner
          lp={lp}
          totalGames={totalGames}
          seasonAvg={myRanking?.season_avg ?? 0}
          seasonGames={myRanking?.season_games ?? 0}
          trend={trend}
          href="/leaderboard"
        />
      )}

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

      <RecentActivity
        initialSessions={(sessions ?? []).map((s) => ({
          session: s,
          lpChange: sessionLpChange[s.id],
        }))}
        initialHasMore={(sessions ?? []).length === 10}
        userId={uid}
        userRanks={userRanks}
        userGameCounts={userGameCounts}
        userLps={userLps}
        gamesBeforeSession={gamesBeforeSession}
      />
    </div>
  );
}
