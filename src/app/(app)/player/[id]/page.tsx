export const revalidate = 300;

import { createClient } from "@/lib/supabase-server";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type {
  ProfileRow,
  PlayerLP,
  SessionWithGamesFramesAndProfile,
} from "@/lib/queries";
import Avatar from "@/components/Avatar";
import PlayerSessions from "@/components/PlayerSessions";
import RankBanner from "@/components/RankBanner";
import { CALIBRATION_GAMES } from "@/lib/ranking";

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [profileResult, lpResult, rankingRowResult, sessionsResult] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", id).single(),
      supabase.rpc("get_player_lp", { p_user_id: id }),
      supabase
        .from("player_rankings_cache")
        .select("season_avg, season_games, trend")
        .eq("user_id", id)
        .maybeSingle(),
      supabase
        .from("sessions")
        .select("*, profiles(*), games(*, frames(*))")
        .eq("user_id", id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

  const profile = profileResult.data as ProfileRow | null;
  const lpData = (lpResult.data ?? {}) as unknown as PlayerLP;
  const sessions = sessionsResult.data as
    SessionWithGamesFramesAndProfile[] | null;

  if (!profile) {
    return (
      <div>
        <Link
          href="/leaderboard"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-muted"
        >
          <ArrowLeft size={16} />
          Back
        </Link>
        <div className="glass p-8 text-center">
          <p className="text-sm text-text-muted">Player not found.</p>
        </div>
      </div>
    );
  }

  const totalGames = lpData.total_games ?? 0;
  const avg = lpData.avg ?? 0;
  const high = lpData.high ?? 0;
  const lp = lpData.lp ?? 0;
  const rankingRow = rankingRowResult.data as {
    season_avg: number;
    season_games: number;
    trend: "up" | "down" | "stable";
  } | null;

  // Fetch session LP deltas from cache
  const sessionIds = sessions?.map((s) => s.id) ?? [];
  let sessionLpChanges: Record<string, number> = {};
  if (sessionIds.length > 0 && totalGames >= CALIBRATION_GAMES) {
    const { data: deltas } = await supabase.rpc("get_session_lp_deltas", {
      p_session_ids: sessionIds,
    });
    sessionLpChanges = (deltas ?? {}) as Record<string, number>;
  }

  return (
    <div>
      <Link
        href="/leaderboard"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-muted active:text-text-primary"
      >
        <ArrowLeft size={16} />
        Ranked
      </Link>

      {/* Player header */}
      <div className="mb-5 flex items-center gap-3">
        <Avatar
          name={profile.display_name}
          avatarUrl={profile.avatar_url}
          size="lg"
        />
        <div>
          <h1 className="text-xl font-extrabold">{profile.display_name}</h1>
        </div>
      </div>

      {/* Rank Card */}
      {totalGames > 0 && (
        <RankBanner
          lp={lp}
          totalGames={totalGames}
          seasonAvg={rankingRow?.season_avg ?? 0}
          seasonGames={rankingRow?.season_games ?? 0}
          trend={rankingRow?.trend ?? "stable"}
        />
      )}

      {/* Stats */}
      <div className="mb-5 flex gap-2">
        <div className="glass flex-1 p-3 text-center">
          <div className="text-[10px] uppercase tracking-wide text-text-muted">
            Avg
          </div>
          <div className="text-2xl font-extrabold">{avg}</div>
        </div>
        <div className="glass flex-1 p-3 text-center">
          <div className="text-[10px] uppercase tracking-wide text-text-muted">
            High
          </div>
          <div className="text-2xl font-extrabold text-gold">{high}</div>
        </div>
        <div className="glass flex-1 p-3 text-center">
          <div className="text-[10px] uppercase tracking-wide text-text-muted">
            Games
          </div>
          <div className="text-2xl font-extrabold">{totalGames}</div>
        </div>
      </div>

      {/* Recent sessions */}
      <h2 className="mb-3 text-sm font-bold">Recent Sessions</h2>
      <PlayerSessions
        playerId={id}
        playerName={profile.display_name}
        avatarUrl={profile.avatar_url}
        initialSessions={sessions ?? []}
        initialHasMore={(sessions?.length ?? 0) === 20}
        totalGames={totalGames}
        initialLpChanges={sessionLpChanges}
      />
    </div>
  );
}
