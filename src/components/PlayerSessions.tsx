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
  initialLpChanges: Record<string, number>;
}

import { CALIBRATION_GAMES } from "@/lib/ranking";

export default function PlayerSessions({
  playerId,
  playerName,
  avatarUrl,
  initialSessions,
  initialHasMore,
  totalGames,
  initialLpChanges,
}: PlayerSessionsProps) {
  const supabase = createClient();
  const [sessions, setSessions] =
    useState<SessionWithGamesFramesAndProfile[]>(initialSessions);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);

    const { data } = (await supabase
      .from("sessions")
      .select("*, profiles(*), games(*, frames(*))")
      .eq("user_id", playerId)
      .order("created_at", { ascending: false })
      .range(sessions.length, sessions.length + SESSIONS_PER_PAGE - 1)) as {
      data: SessionWithGamesFramesAndProfile[] | null;
    };

    if (data) {
      setSessions((prev) => [...prev, ...data]);
      setHasMore(data.length === SESSIONS_PER_PAGE);
    } else {
      setHasMore(false);
    }
    setLoading(false);
    loadingRef.current = false;
  }, [supabase, playerId, sessions.length]);

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

  // Track calibration: walk oldest-first to count games chronologically
  const gamesBeforeSession: Record<string, number> = {};
  let running = 0;
  for (const s of [...sessions].reverse()) {
    gamesBeforeSession[s.id] = running;
    running += s.games.length;
  }

  if (sessions.length === 0) {
    return (
      <div className="glass p-8 text-center">
        <p className="text-sm text-text-muted">No sessions yet.</p>
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

        const isCalibrationSession =
          (gamesBeforeSession[session.id] ?? 0) < CALIBRATION_GAMES;

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
            isCalibrationSession={isCalibrationSession}
            lpChange={
              totalGames >= CALIBRATION_GAMES
                ? initialLpChanges[session.id]
                : undefined
            }
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
