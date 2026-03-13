"use client";

import { useState } from "react";
import Link from "next/link";
import { Star, Check, ChevronDown } from "lucide-react";

interface FrameInfo {
  frame_number: number;
  roll_1: number;
  roll_2: number | null;
  roll_3: number | null;
  is_strike: boolean;
  is_spare: boolean;
  frame_score: number;
}

interface SessionGame {
  id: string;
  game_number: number;
  total_score: number;
  is_clean: boolean;
  entry_type: string;
  strike_count: number;
  spare_count: number;
  frames?: FrameInfo[];
}

interface SessionCardProps {
  sessionId: string;
  name: string;
  realName: string;
  dateLabel: string;
  avg: number;
  totalPins: number;
  venue: string | null;
  eventLabel: string | null;
  games: SessionGame[];
  avatarGradient: string;
}

const EVENT_COLORS: Record<string, string> = {
  League: "bg-blue/12 text-blue",
  Practice: "bg-purple/12 text-purple",
  Tournament: "bg-gold/12 text-gold",
  Casual: "bg-green/12 text-green",
};

function PinIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="11"
      height="11"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    >
      <circle cx="8" cy="4" r="3" />
      <line x1="8" y1="7" x2="8" y2="15" />
    </svg>
  );
}

function formatFrameRoll(frame: FrameInfo, rollNum: 1 | 2 | 3): string {
  if (frame.frame_number < 10) {
    if (rollNum === 1) {
      if (frame.is_strike) return "X";
      return frame.roll_1 === 0 ? "-" : frame.roll_1.toString();
    }
    if (rollNum === 2) {
      if (frame.roll_2 === null) return "";
      if (frame.is_spare) return "/";
      return frame.roll_2 === 0 ? "-" : frame.roll_2.toString();
    }
    return "";
  }
  // 10th frame
  if (rollNum === 1) {
    return frame.roll_1 === 10
      ? "X"
      : frame.roll_1 === 0
        ? "-"
        : frame.roll_1.toString();
  }
  if (rollNum === 2) {
    if (frame.roll_2 === null) return "";
    if (frame.roll_1 === 10 && frame.roll_2 === 10) return "X";
    if (frame.roll_1 !== 10 && frame.roll_1 + frame.roll_2 === 10) return "/";
    return frame.roll_2 === 0 ? "-" : frame.roll_2.toString();
  }
  if (rollNum === 3) {
    if (frame.roll_3 === null) return "";
    if (frame.roll_3 === 10) return "X";
    if (
      frame.roll_2 !== null &&
      frame.roll_2 !== 10 &&
      frame.roll_2 + frame.roll_3 === 10
    )
      return "/";
    return frame.roll_3 === 0 ? "-" : frame.roll_3.toString();
  }
  return "";
}

function MiniScorecard({ frames }: { frames: FrameInfo[] }) {
  const sorted = [...frames].sort((a, b) => a.frame_number - b.frame_number);

  return (
    <div className="overflow-hidden rounded border border-border/50">
      <div className="flex">
        {Array.from({ length: 10 }, (_, i) => {
          const frame = sorted.find((f) => f.frame_number === i + 1);
          if (!frame) {
            return (
              <div
                key={i}
                className="flex-1 border-r border-border/30 px-0 py-[2px] text-center text-[9px] text-text-muted last:border-r-0"
              >
                &mdash;
              </div>
            );
          }

          const r1 = formatFrameRoll(frame, 1);
          const r2 = formatFrameRoll(frame, 2);
          const r3 = i === 9 ? formatFrameRoll(frame, 3) : "";

          return (
            <div
              key={i}
              className="flex-1 border-r border-border/30 px-0 py-[2px] text-center text-[9px] last:border-r-0"
            >
              {i < 9 ? (
                frame.is_strike ? (
                  <span className="font-bold text-green">X</span>
                ) : (
                  <span>
                    <span className="text-text-secondary">{r1}</span>
                    <span
                      className={
                        frame.is_spare
                          ? "font-bold text-gold"
                          : "text-text-secondary"
                      }
                    >
                      {r2}
                    </span>
                  </span>
                )
              ) : (
                <span className="text-[8px]">
                  <span
                    className={
                      r1 === "X"
                        ? "font-bold text-green"
                        : "text-text-secondary"
                    }
                  >
                    {r1}
                  </span>
                  <span
                    className={
                      r2 === "X"
                        ? "font-bold text-green"
                        : frame.is_spare
                          ? "font-bold text-gold"
                          : "text-text-secondary"
                    }
                  >
                    {r2}
                  </span>
                  <span
                    className={
                      r3 === "X"
                        ? "font-bold text-green"
                        : "text-text-secondary"
                    }
                  >
                    {r3}
                  </span>
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SessionCard({
  name,
  realName,
  dateLabel,
  avg,
  totalPins,
  venue,
  eventLabel,
  games,
  avatarGradient,
}: SessionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const highGame = Math.max(...games.map((g) => g.total_score), 0);

  return (
    <div className="glass overflow-hidden">
      {/* Clickable header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-3 text-left"
      >
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br ${avatarGradient} text-[11px] font-bold`}
          >
            {realName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-[13px] font-semibold">{name}</p>
            <p className="text-[10px] text-text-muted">
              {dateLabel} &bull; avg {avg}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-lg font-extrabold">{totalPins}</div>
          <ChevronDown
            size={14}
            className={`text-text-muted transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {/* Venue + Event */}
      {(venue || eventLabel) && (
        <div className="flex items-center gap-1.5 px-3 pb-1 pl-[52px]">
          {venue && (
            <span className="flex items-center gap-1 text-[10px] text-text-secondary">
              <PinIcon />
              {venue}
            </span>
          )}
          {eventLabel && (
            <span
              className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ${EVENT_COLORS[eventLabel] ?? "bg-surface-light text-text-muted"}`}
            >
              {eventLabel}
            </span>
          )}
        </div>
      )}

      {/* Game score boxes (always visible) */}
      <div className="flex gap-1 px-3 pb-3">
        {games.map((game) => {
          const isHigh = game.total_score === highGame;
          const isClean = game.is_clean;

          return (
            <Link
              key={game.id}
              href={`/game/${game.id}`}
              className={`flex-1 rounded-md bg-black/30 py-[5px] text-center transition-colors hover:bg-black/50 ${isHigh ? "border border-gold/35" : isClean ? "border border-green/35" : "border border-transparent"}`}
            >
              <div className="relative inline-block">
                {isHigh && (
                  <Star
                    size={8}
                    className="absolute -right-2.5 -top-1 fill-gold text-gold"
                  />
                )}
                {isClean && !isHigh && (
                  <Check
                    size={8}
                    className="absolute -right-2.5 -top-1 text-green"
                    strokeWidth={3}
                  />
                )}
                <span
                  className={`text-sm font-bold ${isHigh ? "text-gold" : isClean ? "text-green" : ""}`}
                >
                  {game.total_score}
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Expanded: per-game frame breakdown */}
      {expanded && (
        <div className="border-t border-border/50 px-3 py-2">
          <div className="flex flex-col gap-2">
            {games.map((game) => {
              const isHigh = game.total_score === highGame;
              const isClean = game.is_clean;
              const hasFrames = game.frames && game.frames.length > 0;

              return (
                <Link
                  key={game.id}
                  href={`/game/${game.id}`}
                  className="rounded-md bg-black/20 px-3 py-2 transition-colors hover:bg-black/30"
                >
                  <div className="mb-1.5 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold">
                        Game {game.game_number}
                      </span>
                      {game.entry_type === "detailed" && (
                        <span className="ml-2 text-[10px] text-text-muted">
                          {game.strike_count}X {game.spare_count}/
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {isClean && (
                        <span className="text-[9px] font-semibold text-green">
                          CLEAN
                        </span>
                      )}
                      <span
                        className={`text-sm font-bold ${isHigh ? "text-gold" : isClean ? "text-green" : ""}`}
                      >
                        {game.total_score}
                      </span>
                    </div>
                  </div>
                  {hasFrames && <MiniScorecard frames={game.frames!} />}
                </Link>
              );
            })}
          </div>
          <p className="mt-1.5 text-center text-[9px] text-text-muted">
            Tap a game to see full breakdown
          </p>
        </div>
      )}
    </div>
  );
}
