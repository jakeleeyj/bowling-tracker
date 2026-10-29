"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { calculateFrameScores, type FrameData } from "@/lib/bowling";

interface Progress {
  game: number;
  games: number;
  frame: number | null;
  score: number | null;
}

function readProgress(): Progress | null {
  try {
    const raw = localStorage.getItem("spare-me-session");
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.step !== "game") return null;
    const detailed = data.entryMode === "detailed";
    const frames = [...((data.frames ?? []) as FrameData[])].sort(
      (a, b) => a.frameNumber - b.frameNumber,
    );
    const scores = calculateFrameScores(frames);
    return {
      game: (data.currentGameIndex ?? 0) + 1,
      games: data.gameCount ?? 1,
      frame: detailed ? (data.currentFrame ?? 1) : null,
      score: detailed && scores.length > 0 ? scores[scores.length - 1] : null,
    };
  } catch {
    return null;
  }
}

/** Floating "session in progress" pill shown everywhere except /log */
export default function SessionPill() {
  const pathname = usePathname();
  const [progress, setProgress] = useState<Progress | null>(null);

  useEffect(() => {
    const check = () => setProgress(readProgress());
    check();
    window.addEventListener("session-storage-change", check);
    window.addEventListener("storage", check);
    return () => {
      window.removeEventListener("session-storage-change", check);
      window.removeEventListener("storage", check);
    };
  }, [pathname]);

  if (!progress || pathname.startsWith("/log")) return null;

  return (
    <Link
      href="/log?resume=1"
      data-session-pill
      className="animate-pill-in fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-1/2 z-40 flex h-10 -translate-x-1/2 items-center gap-2.5 rounded-full border border-border-light bg-surface/95 pl-3 pr-4 text-[13px] font-semibold shadow-[0_8px_24px_-8px_rgba(0,0,0,0.7)] backdrop-blur-md transition-transform duration-150 active:scale-[0.96] lg:bottom-6"
    >
      <span className="relative flex size-2">
        <span className="absolute inset-0 animate-ping rounded-full bg-green opacity-60 motion-reduce:hidden" />
        <span className="relative size-2 rounded-full bg-green" />
      </span>
      <span className="text-text-primary">
        Game {progress.game} of {progress.games}
      </span>
      {progress.frame !== null && (
        <span className="text-text-muted">Frame {progress.frame}</span>
      )}
      {progress.score !== null && (
        <span className="tabular-nums text-text-primary">{progress.score}</span>
      )}
    </Link>
  );
}
