"use client";

import { useState, useTransition } from "react";
import SessionCard from "@/components/SessionCard";
import { loadMoreSessions } from "@/app/(app)/dashboard/actions";
import { CALIBRATION_GAMES } from "@/lib/ranking";
import type { SessionWithGamesFramesAndProfile } from "@/lib/queries";
import type { getRank } from "@/lib/ranking";

interface SessionCardData {
  session: SessionWithGamesFramesAndProfile;
  lpChange?: number;
}

interface RecentActivityProps {
  initialSessions: SessionCardData[];
  initialHasMore: boolean;
  userId: string;
  userRanks: Record<string, ReturnType<typeof getRank>>;
  userGameCounts: Record<string, number>;
  gamesBeforeSession: Record<string, Record<string, number>>;
}

export default function RecentActivity({
  initialSessions,
  initialHasMore,
  userId,
  userRanks,
  userGameCounts,
  gamesBeforeSession: initialGamesBeforeSession,
}: RecentActivityProps) {
  const [sessions, setSessions] = useState<SessionCardData[]>(initialSessions);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [gamesBeforeMap, setGamesBeforeMap] = useState(
    initialGamesBeforeSession,
  );
  const [isPending, startTransition] = useTransition();

  function handleLoadMore() {
    startTransition(async () => {
      const result = await loadMoreSessions(sessions.length);
      const newCards: SessionCardData[] = result.sessions.map((s) => ({
        session: s,
        lpChange: result.lpChanges[s.id],
      }));

      // Recalculate gamesBeforeSession for all sessions including new ones
      const allCards = [...sessions, ...newCards];
      const updated: Record<string, Record<string, number>> = {};
      const perUser: Record<string, SessionCardData[]> = {};
      for (const card of allCards) {
        const u = card.session.user_id;
        if (!perUser[u]) perUser[u] = [];
        perUser[u].push(card);
      }
      for (const [u, cards] of Object.entries(perUser)) {
        updated[u] = {};
        let remaining = userGameCounts[u] ?? 0;
        for (const card of cards) {
          remaining -= card.session.games.length;
          updated[u][card.session.id] = remaining;
        }
      }

      setGamesBeforeMap(updated);
      setSessions(allCards);
      setHasMore(result.hasMore);
    });
  }

  return (
    <>
      {sessions.length === 0 && (
        <div className="glass p-8 text-center">
          <p className="text-sm text-text-muted">
            No games yet. Log your first session!
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {sessions.map(({ session, lpChange }) => {
          const gamesBefore =
            gamesBeforeMap[session.user_id]?.[session.id] ?? 0;
          const isCalibrationSession = gamesBefore < CALIBRATION_GAMES;
          const sessionProfile = session.profiles;
          const sessionGames = [...session.games].sort(
            (a, b) => a.game_number - b.game_number,
          );
          const isOwnSession = session.user_id === userId;
          const name = isOwnSession
            ? "You"
            : (sessionProfile?.display_name ?? "Unknown");
          const realName = sessionProfile?.display_name ?? "Unknown";
          const avg =
            sessionGames.length > 0
              ? Math.floor(
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
              lpChange={lpChange}
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
              rankTierName={
                (userGameCounts[session.user_id] ?? 0) >= CALIBRATION_GAMES
                  ? userRanks[session.user_id]?.name
                  : undefined
              }
            />
          );
        })}
      </div>

      {hasMore && (
        <button
          onClick={handleLoadMore}
          disabled={isPending}
          className="mt-3 w-full rounded-xl bg-surface-light py-3 text-sm font-semibold text-text-muted active:scale-[0.98] disabled:opacity-50"
        >
          {isPending ? "Loading..." : "Load More"}
        </button>
      )}
    </>
  );
}
