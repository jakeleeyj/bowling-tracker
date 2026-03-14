export const revalidate = 300;

import { createClient } from "@/lib/supabase-server";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type {
  ProfileRow,
  SessionWithGamesFramesAndProfile,
} from "@/lib/queries";
import Avatar from "@/components/Avatar";
import SessionCard from "@/components/SessionCard";
import {
  calculateLP,
  getRank,
  formatLP,
  getEventWeight,
  CALIBRATION_GAMES,
} from "@/lib/ranking";

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [profileResult, gamesResult, sessionsResult] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", id).single(),
    supabase
      .from("games")
      .select("total_score, sessions(event_label)")
      .eq("user_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("sessions")
      .select("*, profiles(*), games(*, frames(*))")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const profile = profileResult.data as ProfileRow | null;
  const userGames = gamesResult.data as
    | { total_score: number; sessions: { event_label: string | null } | null }[]
    | null;
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

  const totalGames = userGames?.length ?? 0;
  const scores = userGames?.map((g) => g.total_score) ?? [];
  const weights =
    userGames?.map((g) => getEventWeight(g.sessions?.event_label ?? null)) ??
    [];
  const avg =
    totalGames > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / totalGames)
      : 0;
  const high = totalGames > 0 ? Math.max(...scores) : 0;
  const lp = calculateLP(scores, weights);
  const rank = getRank(lp);
  const isCalibrating = totalGames < CALIBRATION_GAMES;

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
          {isCalibrating ? (
            <p className="text-xs text-text-muted">
              Calibrating ({totalGames}/{CALIBRATION_GAMES} games)
            </p>
          ) : (
            <p className={`text-sm font-semibold ${rank.color}`}>
              {rank.name}
              {rank.division ? ` ${rank.division}` : ""}{" "}
              <span className="text-text-muted">{formatLP(lp)} LP</span>
            </p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="mb-5 flex gap-2">
        <div className="glass flex-1 p-3 text-center">
          <div className="text-[10px] uppercase text-text-muted">Avg</div>
          <div className="text-2xl font-extrabold">{avg}</div>
        </div>
        <div className="glass flex-1 p-3 text-center">
          <div className="text-[10px] uppercase text-text-muted">High</div>
          <div className="text-2xl font-extrabold text-gold">{high}</div>
        </div>
        <div className="glass flex-1 p-3 text-center">
          <div className="text-[10px] uppercase text-text-muted">Games</div>
          <div className="text-2xl font-extrabold">{totalGames}</div>
        </div>
      </div>

      {/* Recent sessions */}
      <h2 className="mb-3 text-sm font-bold">Recent Sessions</h2>
      {!sessions || sessions.length === 0 ? (
        <div className="glass p-8 text-center">
          <p className="text-sm text-text-muted">No sessions yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {sessions.map((session) => {
            const sessionGames = [...session.games].sort(
              (a, b) => a.game_number - b.game_number,
            );
            const sessionAvg =
              sessionGames.length > 0
                ? Math.round(
                    sessionGames.reduce((s, g) => s + g.total_score, 0) /
                      sessionGames.length,
                  )
                : 0;
            const createdAt = new Date(session.created_at);
            const dateLabel = createdAt.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            });

            return (
              <SessionCard
                key={session.id}
                sessionId={session.id}
                name={profile.display_name}
                realName={profile.display_name}
                dateLabel={dateLabel}
                avg={sessionAvg}
                totalPins={session.total_pins}
                venue={session.venue}
                eventLabel={session.event_label}
                games={sessionGames}
                avatarUrl={profile.avatar_url}
                isOwn={false}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
