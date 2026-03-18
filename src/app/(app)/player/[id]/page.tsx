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
import {
  getRank,
  getDivisionProgress,
  formatLP,
  CALIBRATION_GAMES,
} from "@/lib/ranking";

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [profileResult, lpResult, sessionsResult] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", id).single(),
    supabase.rpc("get_player_lp", { p_user_id: id }),
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
    | SessionWithGamesFramesAndProfile[]
    | null;

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
  const rank = getRank(lp);
  const isCalibrating = totalGames < CALIBRATION_GAMES;

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
        <div
          className={`glass mb-5 flex items-center gap-3 border p-3 ${totalGames >= CALIBRATION_GAMES ? rank.borderColor : "border-border/30"}`}
        >
          <div className="flex h-10 w-10 items-center justify-center">
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
                <span className={`text-sm font-extrabold ${rank.color}`}>
                  {rank.name}
                  {rank.division ? ` ${rank.division}` : ""}
                </span>
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
        </div>
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
