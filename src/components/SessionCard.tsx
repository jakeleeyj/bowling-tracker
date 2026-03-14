"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { Star, Check, ChevronDown, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/components/Toast";
import Avatar from "@/components/Avatar";

interface FrameInfo {
  frame_number: number;
  roll_1: number;
  roll_2: number | null;
  roll_3: number | null;
  is_strike: boolean;
  is_spare: boolean;
  frame_score: number;
  pins_remaining: number[] | null;
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
  avatarGradient?: string;
  avatarUrl?: string | null;
  isOwn?: boolean;
  mmrChange?: number;
  rankLabel?: string;
  rankColor?: string;
}

const EVENT_COLORS: Record<string, string> = {
  League: "bg-blue/12 text-blue",
  Tournament: "bg-gold/12 text-gold",
  Casual: "bg-green/12 text-green",
  Funbowl: "bg-pink/12 text-pink",
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

// Micro pin layout rows: [7,8,9,10], [4,5,6], [2,3], [1]
const MICRO_PINS = [[7, 8, 9, 10], [4, 5, 6], [2, 3], [1]] as const;

function MicroPinDiagram({
  pinsRemaining,
  isStrike,
  isSpare,
}: {
  pinsRemaining: number[] | null;
  isStrike: boolean;
  isSpare: boolean;
}) {
  if (isStrike) {
    return (
      <div className="flex h-[22px] items-center justify-center">
        <span className="text-[10px] font-extrabold text-green">X</span>
      </div>
    );
  }

  const pins = pinsRemaining ?? [];

  return (
    <div className="flex flex-col items-center gap-[1px] py-[2px]">
      {MICRO_PINS.map((row, ri) => (
        <div key={ri} className="flex gap-[1px]">
          {row.map((pin) => {
            const isLeft = pins.includes(pin);
            return (
              <div
                key={pin}
                className={`h-[4px] w-[4px] rounded-full ${
                  isLeft ? (isSpare ? "bg-gold" : "bg-blue") : "bg-white/10"
                }`}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

function MiniScorecard({ frames }: { frames: FrameInfo[] }) {
  const sorted = [...frames].sort((a, b) => a.frame_number - b.frame_number);

  return (
    <div className="overflow-hidden rounded border border-border/50">
      {/* Pin diagrams row */}
      <div className="flex">
        {Array.from({ length: 10 }, (_, i) => {
          const frame = sorted.find((f) => f.frame_number === i + 1);
          return (
            <div
              key={i}
              className="flex flex-1 items-center justify-center border-r border-border/30 last:border-r-0"
            >
              {frame ? (
                <MicroPinDiagram
                  pinsRemaining={frame.pins_remaining}
                  isStrike={frame.is_strike}
                  isSpare={frame.is_spare}
                />
              ) : (
                <span className="py-[2px] text-[8px] text-text-muted/30">
                  &mdash;
                </span>
              )}
            </div>
          );
        })}
      </div>
      {/* Roll notation row */}
      <div className="flex border-t border-border/30">
        {Array.from({ length: 10 }, (_, i) => {
          const frame = sorted.find((f) => f.frame_number === i + 1);
          const isTenth = i === 9;

          return (
            <div
              key={i}
              className={`flex flex-1 items-center justify-center gap-[1px] border-r border-border/30 py-[2px] last:border-r-0 ${isTenth ? "min-w-0" : ""}`}
            >
              {frame ? (
                isTenth ? (
                  <>
                    <span
                      className={`text-[8px] font-bold ${frame.roll_1 === 10 ? "text-green" : "text-text-secondary"}`}
                    >
                      {formatFrameRoll(frame, 1)}
                    </span>
                    <span
                      className={`text-[8px] font-bold ${formatFrameRoll(frame, 2) === "X" ? "text-green" : formatFrameRoll(frame, 2) === "/" ? "text-gold" : "text-text-secondary"}`}
                    >
                      {formatFrameRoll(frame, 2)}
                    </span>
                    {frame.roll_3 !== null && (
                      <span
                        className={`text-[8px] font-bold ${formatFrameRoll(frame, 3) === "X" ? "text-green" : formatFrameRoll(frame, 3) === "/" ? "text-gold" : "text-text-secondary"}`}
                      >
                        {formatFrameRoll(frame, 3)}
                      </span>
                    )}
                  </>
                ) : frame.is_strike ? (
                  <span className="text-[8px] font-bold text-green">X</span>
                ) : (
                  <>
                    <span className="text-[8px] text-text-secondary">
                      {formatFrameRoll(frame, 1)}
                    </span>
                    <span
                      className={`text-[8px] font-bold ${frame.is_spare ? "text-gold" : "text-text-secondary"}`}
                    >
                      {formatFrameRoll(frame, 2)}
                    </span>
                  </>
                )
              ) : (
                <span className="text-[8px] text-text-muted/30">&mdash;</span>
              )}
            </div>
          );
        })}
      </div>
      {/* Running scores row */}
      <div className="flex border-t border-border/30">
        {Array.from({ length: 10 }, (_, i) => {
          const frame = sorted.find((f) => f.frame_number === i + 1);
          return (
            <div
              key={i}
              className="flex-1 border-r border-border/30 py-[1px] text-center text-[8px] font-bold last:border-r-0"
            >
              {frame ? (
                <span
                  className={
                    frame.is_strike
                      ? "text-green"
                      : frame.is_spare
                        ? "text-gold"
                        : "text-text-secondary"
                  }
                >
                  {frame.frame_score}
                </span>
              ) : (
                <span className="text-text-muted/30">&mdash;</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SessionCard({
  sessionId,
  name,
  realName,
  dateLabel,
  avg,
  totalPins,
  venue,
  eventLabel,
  games,
  avatarGradient,
  avatarUrl,
  isOwn = false,
  mmrChange,
  rankLabel,
  rankColor,
}: SessionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingMeta, setEditingMeta] = useState(false);
  const [editVenue, setEditVenue] = useState(venue ?? "");
  const [editEvent, setEditEvent] = useState(eventLabel ?? "");
  const [savingMeta, setSavingMeta] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const highGame =
    games.length > 0 ? Math.max(...games.map((g) => g.total_score)) : 0;

  async function handleSaveMeta() {
    setSavingMeta(true);
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("sessions")
      .update({
        venue: editVenue || null,
        event_label: editEvent || null,
      })
      .eq("id", sessionId);
    setSavingMeta(false);
    setEditingMeta(false);
    toast("Session updated");
    router.refresh();
  }

  async function handleDeleteSession() {
    if (!confirm("Delete this entire session and all its games?")) return;
    setDeleting(true);
    const supabase = createClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: gameRows } = await (supabase as any)
      .from("games")
      .select("id")
      .eq("session_id", sessionId);

    const gameIds = gameRows?.map((g: { id: string }) => g.id) ?? [];
    if (gameIds.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from("frames").delete().in("game_id", gameIds);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("games")
        .delete()
        .eq("session_id", sessionId);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("sessions").delete().eq("id", sessionId);

    toast("Session deleted");
    router.refresh();
  }

  return (
    <div className="glass overflow-hidden">
      {/* Clickable header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-3 text-left transition-colors duration-150 active:bg-white/[0.03]"
      >
        <div className="flex items-center gap-2.5">
          <Avatar name={realName} avatarUrl={avatarUrl} size="sm" />
          <div>
            <p className="text-[13px] font-semibold">
              {name}
              {rankLabel && (
                <span
                  className={`ml-1.5 text-[10px] font-semibold ${rankColor ?? "text-text-muted"}`}
                >
                  {rankLabel}
                </span>
              )}
            </p>
            <p className="text-[10px] text-text-muted">
              {dateLabel} &bull; avg {avg}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className="text-lg font-extrabold leading-tight">
              {totalPins}
            </div>
            {mmrChange !== undefined && (
              <div
                className={`text-[10px] font-semibold leading-tight ${mmrChange > 0 ? "text-green" : mmrChange < 0 ? "text-red" : "text-text-muted"}`}
              >
                {mmrChange > 0 ? "+" : ""}
                {mmrChange} MMR
              </div>
            )}
          </div>
          <ChevronDown
            size={14}
            className={`text-text-muted transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
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
      <div className="flex gap-1 px-3 pb-3 pl-[52px]">
        {games.map((game) => {
          const isHigh = game.total_score === highGame;
          const isClean = game.is_clean;

          return (
            <div
              key={game.id}
              className={`w-14 rounded-md bg-black/30 py-[5px] text-center ${isHigh ? "border border-gold/35" : isClean ? "border border-green/35" : "border border-transparent"}`}
            >
              <div className="flex items-center justify-center gap-1">
                <span
                  className={`text-sm font-bold ${isHigh ? "text-gold" : isClean ? "text-green" : ""}`}
                >
                  {game.total_score}
                </span>
                {isHigh && (
                  <Star size={9} className="shrink-0 fill-gold text-gold" />
                )}
                {isClean && !isHigh && (
                  <Check
                    size={9}
                    className="shrink-0 text-green"
                    strokeWidth={3}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Expanded: per-game frame breakdown */}
      {expanded && (
        <div className="animate-slide-down border-t border-border/50 px-3 py-2">
          <div className="flex flex-col gap-2">
            {games.map((game) => {
              const isHigh = game.total_score === highGame;
              const isClean = game.is_clean;
              const hasFrames = game.frames && game.frames.length > 0;

              return (
                <div key={game.id} className="rounded-md bg-black/20 px-3 py-2">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-xs font-semibold">
                      Game {game.game_number}
                    </span>
                    <div className="flex items-center gap-2">
                      {isClean && (
                        <span className="text-[9px] font-semibold text-green">
                          CLEAN
                        </span>
                      )}
                      <span
                        className={`text-sm font-bold ${isHigh ? "text-gold" : isClean ? "text-green" : "text-text-primary"}`}
                      >
                        {game.total_score}
                      </span>
                      {isOwn && (
                        <button
                          onClick={() =>
                            router.push(`/log?editGame=${game.id}`)
                          }
                          className="text-text-muted active:scale-90"
                        >
                          <Pencil size={10} />
                        </button>
                      )}
                    </div>
                  </div>
                  {hasFrames && <MiniScorecard frames={game.frames!} />}
                </div>
              );
            })}
          </div>
          {isOwn && (
            <div className="mt-2 flex flex-col gap-2">
              {editingMeta ? (
                <div className="rounded-lg bg-black/20 p-3">
                  <input
                    type="text"
                    placeholder="Venue"
                    value={editVenue}
                    onChange={(e) => setEditVenue(e.target.value)}
                    className="mb-2 w-full rounded-lg border border-border bg-surface-light px-3 py-2 text-xs text-text-primary outline-none focus:border-blue"
                  />
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {["League", "Tournament", "Casual", "Funbowl"].map(
                      (label) => (
                        <button
                          key={label}
                          onClick={() =>
                            setEditEvent(editEvent === label ? "" : label)
                          }
                          className={`rounded-md px-2.5 py-1 text-[10px] font-semibold transition-colors ${
                            editEvent === label
                              ? "bg-blue text-white"
                              : "bg-surface-light text-text-muted"
                          }`}
                        >
                          {label}
                        </button>
                      ),
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveMeta}
                      disabled={savingMeta}
                      className="flex-1 rounded-lg bg-blue/20 py-1.5 text-[11px] font-semibold text-blue active:bg-blue/30 disabled:opacity-50"
                    >
                      {savingMeta ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => {
                        setEditingMeta(false);
                        setEditVenue(venue ?? "");
                        setEditEvent(eventLabel ?? "");
                      }}
                      className="flex-1 rounded-lg bg-surface-light py-1.5 text-[11px] font-semibold text-text-muted"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setEditingMeta(true)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-surface-light/50 py-2 text-[11px] font-semibold text-text-muted active:bg-surface-light"
                >
                  <Pencil size={10} />
                  Edit Venue / Event
                </button>
              )}
              <button
                onClick={handleDeleteSession}
                disabled={deleting}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-red/10 py-2 text-[11px] font-semibold text-red active:bg-red/20 disabled:opacity-50"
              >
                <Trash2 size={12} />
                {deleting ? "Deleting..." : "Delete Session"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
