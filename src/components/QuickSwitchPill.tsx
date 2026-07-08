"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Dices } from "lucide-react";
import { calculateFrameScores, type FrameData } from "@/lib/bowling";
import { standings, type MinigameState } from "@/lib/minigame";

const SESSION_KEY = "spare-me-session";
const MINIGAME_KEY = "spare-me-minigame-v4";

interface SessionSnapshot {
  gameNumber: number;
  frameNumber: number;
  score: number;
  entryMode: "quick" | "detailed";
}

interface MinigameSnapshot {
  leaderName: string;
  leaderPoints: number;
}

function readSession(): SessionSnapshot | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.step !== "game") return null;
    const frames = (data.frames ?? []) as FrameData[];
    const scores = calculateFrameScores(frames);
    const lastScore = [...scores].reverse().find((s) => s != null);
    return {
      gameNumber: (data.currentGameIndex ?? 0) + 1,
      frameNumber: (data.currentFrame ?? 0) + 1,
      score:
        data.entryMode === "quick"
          ? parseInt(data.quickScore, 10) || 0
          : (lastScore ?? 0),
      entryMode: data.entryMode ?? "detailed",
    };
  } catch {
    return null;
  }
}

function readMinigame(): MinigameSnapshot | null {
  try {
    const raw = localStorage.getItem(MINIGAME_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw) as MinigameState;
    if (state.step !== "playing" || !state.players?.length) return null;
    const [leader] = standings(state);
    return { leaderName: leader.player.name, leaderPoints: leader.total };
  } catch {
    return null;
  }
}

// Floating hop between the session logger and the minigame. Rendered on both
// pages; visible only while BOTH flows have a live game, so neither page
// changes otherwise. Docked bottom-right, above the tab bar (clear of the FAB).
export default function QuickSwitchPill({ to }: { to: "log" | "minigames" }) {
  const [session, setSession] = useState<SessionSnapshot | null>(null);
  const [minigame, setMinigame] = useState<MinigameSnapshot | null>(null);

  useEffect(() => {
    const refresh = () => {
      setSession(readSession());
      setMinigame(readMinigame());
    };
    refresh();
    // The logger fires this on every autosave; storage covers other tabs.
    window.addEventListener("session-storage-change", refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("session-storage-change", refresh);
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  if (!session || !minigame) return null;

  return (
    <Link
      href={`/${to}`}
      className="glass fixed bottom-[72px] right-3 z-40 flex items-center gap-2 rounded-full border border-border bg-surface/95 py-1.5 pl-2 pr-3 shadow-lg backdrop-blur-md active:scale-95"
    >
      {to === "minigames" ? (
        <>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-purple/15 text-purple">
            <Dices size={14} />
          </span>
          <span className="leading-tight">
            <span className="block text-[11px] font-bold">2-2-3</span>
            <span className="block text-[9px] text-text-muted">
              {minigame.leaderName} leads &bull; {minigame.leaderPoints} pts
            </span>
          </span>
        </>
      ) : (
        <>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue/15 text-sm">
            🎳
          </span>
          <span className="leading-tight">
            <span className="block text-[11px] font-bold">
              Game {session.gameNumber}
            </span>
            <span className="block text-[9px] text-text-muted">
              {session.score}
              {session.entryMode === "detailed" && (
                <> &bull; F{session.frameNumber}</>
              )}
            </span>
          </span>
        </>
      )}
      <ChevronRight size={13} className="text-text-muted/50" />
    </Link>
  );
}
