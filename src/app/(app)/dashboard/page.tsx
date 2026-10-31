export const revalidate = 300; // revalidate every 5 minutes

import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import { Plus } from "lucide-react";
import type {
  ProfileRow,
  SessionWithGamesFramesAndProfile,
  PlayerLP,
} from "@/lib/queries";
import RecentActivity from "@/components/RecentActivity";
import Avatar from "@/components/Avatar";
import LargeTitle from "@/components/LargeTitle";
import NotificationPrompt from "@/components/NotificationPrompt";
import SeasonBanner from "@/components/SeasonBanner";
import RankBanner from "@/components/RankBanner";
import { getRank } from "@/lib/ranking";
import SessionOrb from "@/components/SessionOrb";
import { type FrameKind, frameKinds } from "@/lib/ribbon";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const uid = user?.id ?? "";

  // Phase 1: fetch profile, user LP, recent sessions, and all rankings in parallel
  const [
    profileResult,
    userLpResult,
    sessionsResult,
    allRankingsResult,
    lastSessionResult,
    lifetimeResult,
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", uid).single(),
    supabase.rpc("get_player_lp", { p_user_id: uid }),
    supabase
      .from("sessions")
      .select("*, profiles(*), games(*, frames(*))")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase.rpc("get_all_rankings"),
    supabase
      .from("sessions")
      .select("games(total_score)")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("games")
      .select("frames(frame_number, roll_1, roll_2, is_strike, is_spare)")
      .eq("user_id", uid)
      .eq("entry_type", "detailed")
      .order("created_at", { ascending: false })
      .limit(300),
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

  // Lifetime games as ribbons, oldest first so the newest draws brightest
  const ribbons = (lifetimeResult.data ?? [])
    .map((g) => frameKinds(g.frames))
    .filter((k): k is FrameKind[] => k !== null)
    .reverse();
  const lastScores = (lastSessionResult.data?.games ?? []).map(
    (g) => g.total_score,
  );
  const lastAvg = lastScores.length
    ? Math.round(lastScores.reduce((a, b) => a + b, 0) / lastScores.length)
    : 0;

  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm text-text-muted">
            Welcome back
          </p>
          <LargeTitle title={displayName} />
        </div>
        <Avatar name={displayName} avatarUrl={profile?.avatar_url} size="md" />
      </div>

      <SeasonBanner />

      {/* Notification prompt — shows once for new users */}
      <NotificationPrompt />

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

      {ribbons.length > 0 && (
        <SessionOrb games={ribbons}>
          <span className="text-xs font-semibold text-text-secondary">
            Average
          </span>
          <span className="mt-0.5 mb-0.5 text-[50px] leading-none font-bold tabular-nums">
            {avgScore}
          </span>
          <span className="text-xs font-semibold text-text-secondary">
            {totalGames} {totalGames === 1 ? "game" : "games"}
          </span>
        </SessionOrb>
      )}

      {ribbons.length > 0 && (
        <p className="mb-6 flex justify-center gap-2 text-sm text-text-secondary">
          <span>
            High{" "}
            <b className="font-semibold text-text-primary tabular-nums">
              {highScore}
            </b>
          </span>
          {lastScores.length > 0 && (
            <>
              <span aria-hidden>·</span>
              <span>
                Last session avg{" "}
                <b className="font-semibold text-text-primary tabular-nums">
                  {lastAvg}
                </b>
              </span>
            </>
          )}
        </p>
      )}

      {/* Quick Stats */}
      <div
        className={`mb-5 grid grid-cols-3 gap-2 ${ribbons.length > 0 ? "hidden" : ""}`}
      >
        {[
          { label: "Avg", value: avgScore },
          { label: "High", value: highScore },
          { label: "Games", value: totalGames },
        ].map((stat) => (
          <div key={stat.label} className="glass px-3 py-3.5 text-center">
            <div className="text-[11px] font-semibold text-text-muted">
              {stat.label}
            </div>
            <div className="mt-1.5 text-2xl leading-none font-extrabold tabular-nums">
              {totalGames > 0 ? stat.value : "-"}
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <Link
        href="/log"
        className="mb-6 flex items-center justify-center gap-2 rounded-xl bg-blue py-4 text-base font-semibold text-white inset-shadow-2xs inset-shadow-white/20 transition-transform duration-150 ease-out active:scale-[0.97]"
      >
        <Plus size={18} strokeWidth={2.75} />
        Log a session
      </Link>

      {/* Activity Feed */}
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Recent activity</h2>
        <Link
          href="/profile"
          className="-mr-2 rounded-lg px-2 py-2.5 text-xs font-semibold text-blue transition-opacity active:opacity-60"
        >
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
      />
    </div>
  );
}
