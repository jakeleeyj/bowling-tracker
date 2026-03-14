"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import {
  Star,
  Check,
  ChevronDown,
  Pencil,
  Trash2,
  BarChart3,
} from "lucide-react";
import { useToast } from "@/components/Toast";
import Avatar from "@/components/Avatar";
import { isSplit } from "@/lib/bowling";
import { EVENT_LABELS } from "@/lib/ranking";

interface FrameInfo {
  frame_number: number;
  roll_1: number;
  roll_2: number | null;
  roll_3: number | null;
  is_strike: boolean;
  is_spare: boolean;
  frame_score: number;
  pins_remaining: number[] | null;
  pins_remaining_roll2: number[] | null;
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
  lpChange?: number;
  rankLabel?: string;
  rankColor?: string;
}

const DEFAULT_VENUES = [
  "Planet Bowl",
  "SuperBowl - Toa Payoh",
  "SuperBowl - Mt Faber",
  "Westwood Bowl",
  "Sonic Bowl - Punggol",
];

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
  pinsRemainingRoll2,
  isStrike,
  isSpare,
}: {
  pinsRemaining: number[] | null;
  pinsRemainingRoll2: number[] | null;
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
  const pinsAfterRoll2 = pinsRemainingRoll2 ?? null;

  return (
    <div className="flex flex-col items-center gap-[1px] py-[2px]">
      {MICRO_PINS.map((row, ri) => (
        <div key={ri} className="flex gap-[1px]">
          {row.map((pin) => {
            const wasStanding = pins.includes(pin);
            const stillStanding = pinsAfterRoll2
              ? pinsAfterRoll2.includes(pin)
              : null;

            let color = "bg-white/10"; // knocked on roll 1
            if (wasStanding) {
              if (isSplit(pins)) {
                // Split leave
                color = isSpare
                  ? "bg-red"
                  : stillStanding !== null
                    ? stillStanding
                      ? "bg-red"
                      : "bg-red/30"
                    : "bg-red";
              } else if (isSpare) {
                color = "bg-gold";
              } else if (stillStanding !== null) {
                // Have roll 2 data: still standing vs knocked on roll 2
                color = stillStanding ? "bg-blue" : "bg-white/25";
              } else {
                // No roll 2 data (old games): dim
                color = "bg-white/30";
              }
            }

            return (
              <div
                key={pin}
                className={`h-[4px] w-[4px] rounded-full ${color}`}
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
                  pinsRemainingRoll2={frame.pins_remaining_roll2}
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

function SessionStats({
  games,
  show,
  onToggle,
}: {
  games: SessionGame[];
  show: boolean;
  onToggle: () => void;
}) {
  // Only show if we have detailed frame data
  const allFrames = games.flatMap((g) => g.frames ?? []);
  const hasDetailedData = allFrames.length > 0;

  if (!hasDetailedData) {
    return (
      <div className="mt-2">
        <div className="rounded-lg bg-surface-light/50 py-3 text-center">
          <p className="text-[10px] text-text-muted">
            Log with detailed entry to see stats
          </p>
        </div>
      </div>
    );
  }

  const totalFrames = allFrames.length;
  const strikes = allFrames.filter((f) => f.is_strike).length;
  const spares = allFrames.filter((f) => f.is_spare).length;
  const opens = totalFrames - strikes - spares;

  const strikeRate = Math.round((strikes / totalFrames) * 100);
  const spareRate = Math.round((spares / totalFrames) * 100);
  const openRate = Math.round((opens / totalFrames) * 100);

  // Spare conversion: non-strike frames where spare was converted
  const spareOpportunities = allFrames.filter((f) => !f.is_strike);
  const spareConversionRate =
    spareOpportunities.length > 0
      ? Math.round((spares / spareOpportunities.length) * 100)
      : 0;

  // Leaves breakdown
  const leaves = allFrames
    .filter(
      (f) => !f.is_strike && f.pins_remaining && f.pins_remaining.length > 0,
    )
    .map((f) => ({
      pins: f.pins_remaining!.sort((a, b) => a - b),
      converted: f.is_spare,
    }));

  // Group by pin combo
  const leaveMap = new Map<
    string,
    { pins: number[]; total: number; converted: number }
  >();
  for (const l of leaves) {
    const key = l.pins.join("-");
    const existing = leaveMap.get(key) ?? {
      pins: l.pins,
      total: 0,
      converted: 0,
    };
    existing.total++;
    if (l.converted) existing.converted++;
    leaveMap.set(key, existing);
  }
  const sortedLeaves = [...leaveMap.values()].sort((a, b) => b.total - a.total);

  // Categorize
  const singlePinLeaves = sortedLeaves.filter((l) => l.pins.length === 1);
  const splitLeaves = sortedLeaves.filter(
    (l) => l.pins.length >= 2 && isSplit(l.pins),
  );
  const multiPinLeaves = sortedLeaves.filter(
    (l) => l.pins.length >= 2 && !isSplit(l.pins),
  );

  return (
    <div className="mt-2">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-surface-light/50 py-2 text-[11px] font-semibold text-text-muted active:bg-surface-light"
      >
        <BarChart3 size={12} />
        {show ? "Hide Stats" : "View Stats"}
      </button>

      {show && (
        <div className="animate-slide-down mt-2">
          {/* Rate cards */}
          <div className="mb-2 grid grid-cols-4 gap-1.5">
            <div className="rounded-lg bg-black/20 p-2 text-center">
              <div className="text-sm font-extrabold text-green">
                {strikeRate}%
              </div>
              <div className="text-[9px] text-text-muted">Strike</div>
            </div>
            <div className="rounded-lg bg-black/20 p-2 text-center">
              <div className="text-sm font-extrabold text-gold">
                {spareRate}%
              </div>
              <div className="text-[9px] text-text-muted">Spare</div>
            </div>
            <div className="rounded-lg bg-black/20 p-2 text-center">
              <div className="text-sm font-extrabold text-blue">
                {spareConversionRate}%
              </div>
              <div className="text-[9px] text-text-muted">Conv.</div>
            </div>
            <div className="rounded-lg bg-black/20 p-2 text-center">
              <div className="text-sm font-extrabold text-red">{openRate}%</div>
              <div className="text-[9px] text-text-muted">Open</div>
            </div>
          </div>

          {/* Leaves */}
          {sortedLeaves.length > 0 && (
            <div className="rounded-lg bg-black/20 p-2">
              <p className="mb-1.5 text-[10px] font-semibold text-text-muted">
                Leaves
              </p>
              {singlePinLeaves.length > 0 && (
                <LeaveGroup
                  label="Single Pin"
                  color="text-green"
                  dotColor="bg-green"
                  leaves={singlePinLeaves}
                />
              )}
              {multiPinLeaves.length > 0 && (
                <LeaveGroup
                  label="Multi Pin"
                  color="text-gold"
                  dotColor="bg-gold"
                  leaves={multiPinLeaves}
                />
              )}
              {splitLeaves.length > 0 && (
                <LeaveGroup
                  label="Splits"
                  color="text-red"
                  dotColor="bg-red"
                  leaves={splitLeaves}
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const LEAVE_PINS = [[7, 8, 9, 10], [4, 5, 6], [2, 3], [1]] as const;

function MiniLeavePin({ pins, color }: { pins: number[]; color: string }) {
  return (
    <div className="flex flex-col items-center gap-[1px]">
      {LEAVE_PINS.map((row, ri) => (
        <div key={ri} className="flex gap-[1px]">
          {row.map((pin) => (
            <div
              key={pin}
              className={`h-[3px] w-[3px] rounded-full ${
                pins.includes(pin) ? color : "bg-white/8"
              }`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function LeaveGroup({
  label,
  color,
  dotColor,
  leaves,
}: {
  label: string;
  color: string;
  dotColor: string;
  leaves: { pins: number[]; total: number; converted: number }[];
}) {
  return (
    <div className="mb-1.5 last:mb-0">
      <p className={`mb-0.5 text-[9px] font-semibold ${color}`}>{label}</p>
      <div className="flex flex-wrap gap-1">
        {leaves.map((l) => {
          const rate = Math.round((l.converted / l.total) * 100);
          return (
            <div
              key={l.pins.join("-")}
              className="flex items-center gap-1 rounded bg-white/[0.04] px-1.5 py-0.5"
            >
              <MiniLeavePin pins={l.pins} color={dotColor} />
              <span className="text-[10px] font-semibold">
                {l.pins.join("-")}
              </span>
              <span
                className={`text-[9px] font-semibold ${rate >= 50 ? "text-green" : "text-red"}`}
              >
                {l.converted}/{l.total}
              </span>
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
  lpChange,
  rankLabel,
  rankColor,
}: SessionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showStats, setShowStats] = useState(false);
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
            {lpChange !== undefined && (
              <div
                className={`text-[10px] font-semibold leading-tight ${lpChange > 0 ? "text-green" : lpChange < 0 ? "text-red" : "text-text-muted"}`}
              >
                {lpChange > 0 ? "+" : ""}
                {lpChange} LP
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
          {/* Session Stats */}
          <SessionStats
            games={games}
            show={showStats}
            onToggle={() => setShowStats(!showStats)}
          />

          {isOwn && (
            <div className="mt-2 flex flex-col gap-2">
              {editingMeta ? (
                <div className="rounded-lg bg-black/20 p-3">
                  <div className="mb-2 flex flex-wrap gap-1">
                    {DEFAULT_VENUES.map((v) => (
                      <button
                        key={v}
                        onClick={() => setEditVenue(editVenue === v ? "" : v)}
                        className={`rounded-md px-2 py-1 text-[10px] font-medium transition-colors ${
                          editVenue === v
                            ? "bg-blue text-white"
                            : "bg-surface-light text-text-muted"
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="Or type a venue..."
                    value={DEFAULT_VENUES.includes(editVenue) ? "" : editVenue}
                    onChange={(e) => setEditVenue(e.target.value)}
                    className="mb-2 w-full rounded-lg border border-border bg-surface-light px-3 py-2 text-xs text-text-primary outline-none focus:border-blue"
                  />
                  <div className="mb-2 grid grid-cols-2 gap-1.5">
                    {EVENT_LABELS.map((label) => (
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
                    ))}
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
