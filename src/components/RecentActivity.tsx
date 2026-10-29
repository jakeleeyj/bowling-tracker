"use client";

import { useState, useTransition } from "react";
import SessionCard from "@/components/SessionCard";
import { BowlingSpinner } from "@/components/Skeleton";
import { loadMoreSessions } from "@/app/(app)/dashboard/actions";
import {
  CALIBRATION_GAMES,
  gamesBeforeEachSession,
  isCalibrationSession,
  lpAfterEachSession,
} from "@/lib/ranking";
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
  userLps: Record<string, number>;
}

export default function RecentActivity({
  initialSessions,
  initialHasMore,
  userId,
  userRanks,
  userGameCounts,
  userLps,
}: RecentActivityProps) {
  const [sessions, setSessions] = useState<SessionCardData[]>(initialSessions);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isPending, startTransition] = useTransition();

  const feed = sessions.map(({ session }) => session);
  const gamesBeforeMap = gamesBeforeEachSession(feed, userGameCounts);
  const lpAfterMap = lpAfterEachSession(
    feed,
    Object.fromEntries(sessions.map((c) => [c.session.id, c.lpChange])),
    userLps,
  );

  function handleLoadMore() {
    const last = sessions[sessions.length - 1];
    if (!last) return;
    startTransition(async () => {
      const result = await loadMoreSessions(last.session.created_at);
      setSessions((prev) => {
        const seen = new Set(prev.map((c) => c.session.id));
        const newCards: SessionCardData[] = result.sessions
          .filter((s) => !seen.has(s.id))
          .map((s) => ({ session: s, lpChange: result.lpChanges[s.id] }));
        return [...prev, ...newCards];
      });
      setHasMore(result.hasMore);
    });
  }

  return (
    <>
      {sessions.length === 0 && (
        <div className="glass flex flex-col items-center px-6 py-10 text-center">
          <p className="text-sm font-semibold">No sessions yet</p>
          <p className="mt-1 text-xs text-text-muted">
            Sessions from you and other bowlers show up here.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {sessions.map(({ session, lpChange }) => {
          const isCalibration = isCalibrationSession(
            gamesBeforeMap[session.id] ?? 0,
          );
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
              lpAfter={lpAfterMap[session.id]}
              isCalibrationSession={isCalibration}
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
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-surface-light py-3 text-sm font-semibold text-text-secondary transition-[transform,opacity] duration-150 ease-out active:scale-[0.98] disabled:opacity-60"
        >
          {isPending && <BowlingSpinner size="sm" />}
          {isPending ? "Loading" : "Load more"}
        </button>
      )}
    </>
  );
}
