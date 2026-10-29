"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase-browser";
import SessionCard from "@/components/SessionCard";
import type { SessionWithGamesFramesAndProfile } from "@/lib/queries";

const SESSIONS_PER_PAGE = 20;

interface PlayerSessionsProps {
  playerId: string;
  playerName: string;
  avatarUrl: string | null;
  initialSessions: SessionWithGamesFramesAndProfile[];
  initialHasMore: boolean;
  totalGames: number;
  currentLp: number;
  initialLpChanges: Record<string, number>;
}

import {
  CALIBRATION_GAMES,
  gamesBeforeEachSession,
  isCalibrationSession,
  lpAfterEachSession,
} from "@/lib/ranking";

export default function PlayerSessions({
  playerId,
  playerName,
  avatarUrl,
  initialSessions,
  initialHasMore,
  totalGames,
  currentLp,
  initialLpChanges,
}: PlayerSessionsProps) {
  const supabase = createClient();
  const [sessions, setSessions] =
    useState<SessionWithGamesFramesAndProfile[]>(initialSessions);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [lpChanges, setLpChanges] =
    useState<Record<string, number>>(initialLpChanges);
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);

    const last = sessions[sessions.length - 1];
    const { data } = (await supabase
      .from("sessions")
      .select("*, profiles(*), games(*, frames(*))")
      .eq("user_id", playerId)
      .lt("created_at", last?.created_at ?? new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(SESSIONS_PER_PAGE)) as {
      data: SessionWithGamesFramesAndProfile[] | null;
    };

    if (data) {
      if (data.length > 0 && totalGames >= CALIBRATION_GAMES) {
        const { data: deltas } = await supabase.rpc("get_session_lp_deltas", {
          p_session_ids: data.map((s) => s.id),
        });
        const moreChanges = (deltas ?? {}) as Record<string, number>;
        setLpChanges((prev) => ({ ...prev, ...moreChanges }));
      }
      setSessions((prev) => {
        const seen = new Set(prev.map((s) => s.id));
        return [...prev, ...data.filter((s) => !seen.has(s.id))];
      });
      setHasMore(data.length === SESSIONS_PER_PAGE);
    } else {
      setHasMore(false);
    }
    setLoading(false);
    loadingRef.current = false;
  }, [supabase, playerId, sessions, totalGames]);

  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  const gamesBeforeSession = gamesBeforeEachSession(sessions, {
    [playerId]: totalGames,
  });
  const lpAfterSession = lpAfterEachSession(sessions, lpChanges, {
    [playerId]: currentLp,
  });
  const showLp = totalGames >= CALIBRATION_GAMES;

  if (sessions.length === 0) {
    return (
      <div className="glass flex flex-col items-center px-6 py-10 text-center">
        <p className="text-sm font-semibold">No sessions yet</p>
        <p className="mt-1 text-xs text-text-muted">
          Logged sessions appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {sessions.map((session) => {
        const sessionGames = [...session.games].sort(
          (a, b) => a.game_number - b.game_number,
        );
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

        const isCalibration = isCalibrationSession(
          gamesBeforeSession[session.id] ?? 0,
        );

        return (
          <SessionCard
            key={session.id}
            sessionId={session.id}
            name={playerName}
            realName={playerName}
            dateLabel={dateLabel}
            avg={avg}
            totalPins={session.total_pins}
            venue={session.venue}
            eventLabel={session.event_label}
            games={sessionGames}
            avatarUrl={avatarUrl}
            isOwn={false}
            isCalibrationSession={isCalibration}
            lpChange={showLp ? lpChanges[session.id] : undefined}
            lpAfter={showLp ? lpAfterSession[session.id] : undefined}
          />
        );
      })}

      {hasMore && (
        <div ref={sentinelRef} className="flex justify-center py-4">
          {loading && (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue border-t-transparent" />
          )}
        </div>
      )}
    </div>
  );
}
