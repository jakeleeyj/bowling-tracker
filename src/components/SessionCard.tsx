"use client";

import { useState, useRef } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import {
  Check,
  ChevronDown,
  Pencil,
  Trash2,
  BarChart3,
  Share2,
} from "lucide-react";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmSheet";
import Avatar from "@/components/Avatar";
import MiniOrb from "@/components/MiniOrb";
import { type FrameKind, frameKinds } from "@/lib/ribbon";
import RankEmblem from "@/components/RankEmblem";
import { isSplit } from "@/lib/bowling";
import { EVENT_LABELS, formatLP, formatLPDelta } from "@/lib/ranking";
import ShareCard from "@/components/ShareCard";
import { shareSession } from "@/lib/shareSession";
import { getFrame10ShotPins } from "@/lib/bowling";
import { PRESET_VENUES as DEFAULT_VENUES } from "@/lib/venues";

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
  pins_remaining_roll3: number[] | null;
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
  lpAfter?: number;
  isCalibrationSession?: boolean;
  rankLabel?: string;
  rankColor?: string;
  rankTierName?: string;
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
    // After a strike then a non-strike, knocking the rest is a spare, even if all ten were left
    if (
      frame.roll_2 !== null &&
      frame.roll_1 === 10 &&
      frame.roll_2 !== 10 &&
      frame.roll_2 + frame.roll_3 === 10
    )
      return "/";
    if (frame.roll_3 === 10) return "X";
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
        <span className="text-[11px] font-semibold text-strike">X</span>
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
                color = stillStanding ? "bg-blue" : "bg-blue/30";
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

function Frame10MicroPin({ frame }: { frame: FrameInfo }) {
  const hasR2 = frame.roll_2 !== null;
  const hasR3 = frame.roll_3 !== null;
  const availableShots: (1 | 2 | 3)[] = [
    1,
    ...(hasR2 ? [2 as const] : []),
    ...(hasR3 ? [3 as const] : []),
  ];
  const [shot, setShot] = useState<1 | 2 | 3>(1);

  const data = getFrame10ShotPins(
    shot,
    frame.pins_remaining,
    frame.pins_remaining_roll2,
    frame.roll_1,
    frame.roll_2,
    frame.roll_3,
    frame.pins_remaining_roll3,
  );
  const cycle = () => {
    const idx = availableShots.indexOf(shot);
    setShot(availableShots[(idx + 1) % availableShots.length]);
  };
  const canCycle = availableShots.length > 1;

  // Rack the bowler faced going into this shot. R1: always all 10. R2: fresh
  // rack if R1 was a strike, else R1's leave. R3: fresh rack if R2 cleared
  // everything (strike or spare), else R2's leave.
  const allPins = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const preShotRack: number[] =
    shot === 1
      ? allPins
      : shot === 2
        ? frame.roll_1 === 10
          ? allPins
          : (frame.pins_remaining ?? allPins)
        : (frame.pins_remaining_roll2 ?? []).length === 0
          ? allPins
          : frame.pins_remaining_roll2!;

  const standing = data.pins;
  const knockedThisShot = preShotRack.filter((p) => !standing.includes(p));

  // A strike on this shot: cleared a full 10-pin rack on this throw.
  const isStrikeShot =
    data.precise &&
    data.knocked === 10 &&
    preShotRack.length === 10 &&
    standing.length === 0;
  // A spare on this shot: cleared the pins that were left from a previous
  // shot (not the full rack). Highlights those cleared pins in gold.
  const isSpareShot =
    data.precise &&
    standing.length === 0 &&
    (data.knocked ?? 0) > 0 &&
    !isStrikeShot;
  // Split context — matches MicroPinDiagram convention: red when the leave
  // the bowler faced on this shot is a split. R1 always faces a full rack;
  // for R2/R3, "faced" means whatever was standing going into the shot.
  const splitContext =
    shot === 1
      ? isSplit(data.pins)
      : shot === 2
        ? frame.roll_1 === 10
          ? false
          : isSplit(frame.pins_remaining ?? [])
        : (frame.pins_remaining_roll2 ?? []).length === 0
          ? false
          : isSplit(frame.pins_remaining_roll2!);

  return (
    <button
      onClick={canCycle ? cycle : undefined}
      disabled={!canCycle}
      className="flex flex-col items-center gap-[2px] py-[2px]"
    >
      <span
        className={`rounded-md border px-[2px] py-[0.5px] text-[11px] font-semibold leading-none tracking-tight ${
          canCycle
            ? "border-blue/40 bg-blue/20 text-blue"
            : "border-text-muted/30 bg-surface-light/50 text-text-muted"
        }`}
      >
        R{shot}
        {canCycle && (
          <span className="opacity-70">/{availableShots.length}</span>
        )}
      </span>
      <div className="flex h-[19px] flex-col items-center justify-center gap-[1px]">
        {isStrikeShot ? (
          <span className="text-[11px] font-semibold leading-none text-strike">
            X
          </span>
        ) : (
          MICRO_PINS.map((row, ri) => (
            <div key={ri} className="flex gap-[1px]">
              {row.map((pin) => {
                const isStanding = standing.includes(pin);
                const isKnockedThisShot = knockedThisShot.includes(pin);
                // Non-precise R3: we know the count but not which pins fell.
                // Show the rack as a neutral "uncertain" state instead of
                // pretending they're all still standing.
                // The faded-this-shot tint only makes sense when there are
                // earlier knocked pins to contrast with — otherwise (R1, or
                // any shot starting from a fresh rack) treat all knocks as
                // history-level "bg-white/10" so the diagram doesn't look
                // like the R2 spare-attempt highlight.
                const hasEarlierKnocks = preShotRack.length < 10;
                const color = !data.precise
                  ? "bg-blue/40"
                  : isStanding
                    ? splitContext
                      ? "bg-red"
                      : "bg-blue"
                    : isSpareShot && isKnockedThisShot
                      ? splitContext
                        ? "bg-red"
                        : "bg-gold"
                      : isKnockedThisShot && hasEarlierKnocks
                        ? splitContext
                          ? "bg-red/30"
                          : "bg-blue/30"
                        : "bg-white/10";
                return (
                  <div
                    key={pin}
                    className={`h-[4px] w-[4px] rounded-full ${color}`}
                  />
                );
              })}
            </div>
          ))
        )}
      </div>
    </button>
  );
}

function MiniScorecard({ frames }: { frames: FrameInfo[] }) {
  const sorted = [...frames].sort((a, b) => a.frame_number - b.frame_number);

  return (
    <div className="overflow-hidden rounded-md border border-border/50 tabular-nums">
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
                frame.frame_number === 10 ? (
                  <Frame10MicroPin frame={frame} />
                ) : (
                  <MicroPinDiagram
                    pinsRemaining={frame.pins_remaining}
                    pinsRemainingRoll2={frame.pins_remaining_roll2}
                    isStrike={frame.is_strike}
                    isSpare={frame.is_spare}
                  />
                )
              ) : (
                <span className="py-[2px] text-[11px] text-text-muted/30">
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
                      className={`text-[11px] font-semibold ${frame.roll_1 === 10 ? "text-strike" : "text-text-secondary"}`}
                    >
                      {formatFrameRoll(frame, 1)}
                    </span>
                    <span
                      className={`text-[11px] font-semibold ${formatFrameRoll(frame, 2) === "X" ? "text-strike" : formatFrameRoll(frame, 2) === "/" ? "text-spare" : "text-text-secondary"}`}
                    >
                      {formatFrameRoll(frame, 2)}
                    </span>
                    {frame.roll_3 !== null && (
                      <span
                        className={`text-[11px] font-semibold ${formatFrameRoll(frame, 3) === "X" ? "text-strike" : formatFrameRoll(frame, 3) === "/" ? "text-spare" : "text-text-secondary"}`}
                      >
                        {formatFrameRoll(frame, 3)}
                      </span>
                    )}
                  </>
                ) : frame.is_strike ? (
                  <span className="text-[11px] font-semibold text-strike">X</span>
                ) : (
                  <>
                    <span className="text-[11px] text-text-secondary">
                      {formatFrameRoll(frame, 1)}
                    </span>
                    <span
                      className={`text-[11px] font-semibold ${frame.is_spare ? "text-spare" : "text-text-secondary"}`}
                    >
                      {formatFrameRoll(frame, 2)}
                    </span>
                  </>
                )
              ) : (
                <span className="text-[11px] text-text-muted/30">&mdash;</span>
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
              className="flex-1 border-r border-border/30 py-[1px] text-center text-[11px] font-semibold last:border-r-0"
            >
              {frame ? (
                <span
                  className={
                    frame.is_strike
                      ? "text-strike"
                      : frame.is_spare
                        ? "text-spare"
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
          <p className="text-[11px] text-text-muted">
            Log with detailed entry to see stats
          </p>
        </div>
      </div>
    );
  }

  // Lazy compute: skip heavy stats until panel is opened
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

  // Only compute leave breakdown when panel is open
  let singlePinLeaves: { pins: number[]; total: number; converted: number }[] =
    [];
  let splitLeaves: { pins: number[]; total: number; converted: number }[] = [];
  let sortedLeaves: { pins: number[]; total: number; converted: number }[] = [];

  if (show) {
    const leaves = allFrames
      .filter(
        (f) => !f.is_strike && f.pins_remaining && f.pins_remaining.length > 0,
      )
      .map((f) => ({
        pins: f.pins_remaining!.sort((a, b) => a - b),
        converted: f.is_spare,
      }));

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
    sortedLeaves = [...leaveMap.values()].sort((a, b) => b.total - a.total);
    singlePinLeaves = sortedLeaves.filter((l) => l.pins.length === 1);
    splitLeaves = sortedLeaves.filter(
      (l) => l.pins.length >= 2 && isSplit(l.pins),
    );
  }
  const multiPinLeaves = sortedLeaves.filter(
    (l) => l.pins.length >= 2 && !isSplit(l.pins),
  );

  return (
    <div className="mt-2">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-surface-light/50 py-2.5 text-[11px] font-semibold text-text-muted transition-colors duration-150 active:bg-surface-light"
      >
        <BarChart3 size={12} />
        {show ? "Hide stats" : "View stats"}
      </button>

      {show && (
        <div className="animate-slide-down mt-2">
          {/* Rate cards */}
          <div className="mb-2 grid grid-cols-4 gap-1.5">
            <div className="rounded-lg bg-black/20 p-2 text-center">
              <div className="text-sm font-semibold text-strike">
                {strikeRate}%
              </div>
              <div className="text-[11px] text-text-muted">Strike</div>
            </div>
            <div className="rounded-lg bg-black/20 p-2 text-center">
              <div className="text-sm font-semibold text-spare">
                {spareRate}%
              </div>
              <div className="text-[11px] text-text-muted">Spare</div>
            </div>
            <div className="rounded-lg bg-black/20 p-2 text-center">
              <div className="text-sm font-semibold text-blue">
                {spareConversionRate}%
              </div>
              <div className="text-[11px] text-text-muted">Conv.</div>
            </div>
            <div className="rounded-lg bg-black/20 p-2 text-center">
              <div className="text-sm font-semibold text-red">{openRate}%</div>
              <div className="text-[11px] text-text-muted">Open</div>
            </div>
          </div>

          {/* Leaves */}
          {sortedLeaves.length > 0 && (
            <div className="rounded-lg bg-black/20 p-2">
              <p className="mb-1.5 text-[11px] font-semibold text-text-muted">
                Leaves
              </p>
              {singlePinLeaves.length > 0 && (
                <LeaveGroup
                  label="Single pin"
                  color="text-green"
                  dotColor="bg-green"
                  leaves={singlePinLeaves}
                />
              )}
              {multiPinLeaves.length > 0 && (
                <LeaveGroup
                  label="Multi pin"
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
      <p className={`mb-0.5 text-[11px] font-semibold ${color}`}>{label}</p>
      <div className="flex flex-wrap gap-1">
        {leaves.map((l) => {
          const rate = Math.round((l.converted / l.total) * 100);
          return (
            <div
              key={l.pins.join("-")}
              className="flex items-center gap-1 rounded-md bg-white/[0.04] px-1.5 py-0.5"
            >
              <MiniLeavePin pins={l.pins} color={dotColor} />
              <span className="text-[11px] font-semibold">
                {l.pins.join("-")}
              </span>
              <span
                className={`text-[11px] font-semibold ${rate >= 50 ? "text-green" : "text-red"}`}
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
  lpAfter,
  isCalibrationSession = false,
  rankLabel,
  rankColor,
  rankTierName,
}: SessionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const expandRef = useRef<HTMLDivElement>(null);
  const [showStats, setShowStats] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const shareCardRef = useRef<HTMLDivElement>(null);
  const [editingMeta, setEditingMeta] = useState(false);
  const [editVenue, setEditVenue] = useState(venue ?? "");
  const [editEvent, setEditEvent] = useState(eventLabel ?? "");
  const [savingMeta, setSavingMeta] = useState(false);
  const router = useRouter();
  const confirm = useConfirm();
  const { toast } = useToast();
  const highGame =
    games.length > 0 ? Math.max(...games.map((g) => g.total_score)) : 0;

  const [showShareOverlay, setShowShareOverlay] = useState(false);

  async function handleShare() {
    setShowShareOverlay(true);
  }

  async function handleCaptureAndShare() {
    if (!shareCardRef.current || sharing) return;
    setSharing(true);
    try {
      // Small delay to ensure the overlay is fully rendered
      await new Promise((r) => setTimeout(r, 100));
      await shareSession(shareCardRef.current);
    } catch {
      toast("Failed to share", "error");
    }
    setSharing(false);
    setShowShareOverlay(false);
  }

  async function handleSaveMeta() {
    setSavingMeta(true);
    const supabase = createClient();
    await supabase
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
    const ok = await confirm({
      title: "Delete this session?",
      message: "All its games will be deleted.",
      confirmLabel: "Delete session",
      destructive: true,
    });
    if (!ok) return;
    setDeleting(true);
    const supabase = createClient();

    const { data: gameRows } = await supabase
      .from("games")
      .select("id")
      .eq("session_id", sessionId);

    const gameIds = gameRows?.map((g: { id: string }) => g.id) ?? [];
    if (gameIds.length > 0) {
      await supabase.from("frames").delete().in("game_id", gameIds);
      await supabase.from("games").delete().eq("session_id", sessionId);
    }
    await supabase.from("sessions").delete().eq("id", sessionId);

    toast("Session deleted");
    router.refresh();
  }

  function toggleExpanded() {
    if (!mounted) {
      // Mount collapsed and force a layout so the open transition has a start state
      flushSync(() => setMounted(true));
      void expandRef.current?.offsetHeight;
    }
    setExpanded(!expanded);
  }


  const ribbons = [...games]
    .sort((a, b) => a.game_number - b.game_number)
    .map((g) => frameKinds(g.frames ?? []))
    .filter((k): k is FrameKind[] => k !== null);

  return (
    <div className="glass overflow-hidden">
      {/* Clickable header */}
      <button
        onClick={toggleExpanded}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between p-3 text-left transition-colors duration-150 active:bg-white/[0.03]"
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar name={realName} avatarUrl={avatarUrl} size="sm" />
          <div className="min-w-0">
            <span className="flex items-center text-sm font-semibold">
              {name}
              {rankTierName && (
                <span className="ml-1.5 inline-flex items-center gap-1">
                  <RankEmblem tierName={rankTierName} size={14} />
                  <span
                    className={`text-[11px] font-semibold ${rankColor ?? "text-text-muted"}`}
                  >
                    {rankLabel}
                  </span>
                </span>
              )}
            </span>
            <p className="text-[11px] text-text-muted">
              {dateLabel} &bull;{" "}
              {isCalibrationSession ? (
                <span className="font-semibold text-blue">Calibration</span>
              ) : lpChange !== undefined ? (
                <>
                  <span
                    className={`font-semibold ${lpChange > 0 ? "text-green" : lpChange < 0 ? "text-red" : ""}`}
                  >
                    {formatLPDelta(lpChange)}
                  </span>
                  {lpAfter !== undefined && (
                    <span> &rarr; {formatLP(lpAfter)}</span>
                  )}
                </>
              ) : (
                <>avg {avg}</>
              )}
            </p>
            {(venue || eventLabel) && (
              <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                {venue && (
                  <span className="flex items-center gap-1 text-[11px] text-text-secondary">
                    <PinIcon />
                    {venue}
                  </span>
                )}
                {eventLabel && (
                  <span
                    className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${EVENT_COLORS[eventLabel] ?? "bg-surface-light text-text-muted"}`}
                  >
                    {eventLabel}
                  </span>
                )}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="text-right">
            <div className="text-lg font-semibold leading-tight">
              {totalPins}
            </div>
            <div className="text-[11px] leading-tight text-text-muted">
              avg {avg}
            </div>
          </div>
          <ChevronDown
            size={14}
            className={`text-text-muted transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {/* Game score boxes (always visible) */}
      <div className="flex items-center gap-1 px-3 pb-3">
        <div className="flex w-9 shrink-0 justify-center">
          {ribbons.length > 0 && <MiniOrb games={ribbons} />}
        </div>
        {games.map((game) => {
          const isHigh = game.total_score === highGame;
          const isClean = game.is_clean;

          return (
            <div
              key={game.id}
              className={`w-14 rounded-md bg-black/30 py-[5px] text-center tabular-nums ${isHigh ? "border border-gold/35" : isClean ? "border border-green/35" : "border border-transparent"}`}
            >
              <span
                className={`text-sm font-semibold ${isHigh ? "text-gold" : isClean ? "text-green" : ""}`}
              >
                {game.total_score}
              </span>
            </div>
          );
        })}
      </div>

      {/* Expanded: per-game frame breakdown */}
      {mounted && (
        <div
          ref={expandRef}
          inert={!expanded}
          className={`grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] ${expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
        >
          <div className="min-h-0 overflow-hidden">
            <div
              className={`border-t border-border/50 px-3 py-2 transition-opacity duration-200 ${expanded ? "opacity-100" : "opacity-0"}`}
            >
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
                            <span className="text-[11px] font-semibold text-green">
                              Clean
                            </span>
                          )}
                          <span
                            className={`text-sm font-semibold ${isHigh ? "text-gold" : isClean ? "text-green" : "text-text-primary"}`}
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
                            className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
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
                        placeholder="Or type a venue"
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
                            className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
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
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue/20 py-2.5 text-[11px] font-semibold text-blue transition-colors duration-150 active:bg-blue/30 disabled:opacity-60"
                        >
                          {savingMeta && <span className="h-3 w-3 animate-spin rounded-full border-2 border-blue/30 border-t-blue" />}
                          {savingMeta ? "Saving" : "Save"}
                        </button>
                        <button
                          onClick={() => {
                            setEditingMeta(false);
                            setEditVenue(venue ?? "");
                            setEditEvent(eventLabel ?? "");
                          }}
                          className="flex-1 rounded-lg bg-surface-light py-2.5 text-[11px] font-semibold text-text-muted transition-colors duration-150 active:bg-white/10"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditingMeta(true)}
                      className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-surface-light/50 py-2.5 text-[11px] font-semibold text-text-muted transition-colors duration-150 active:bg-surface-light"
                    >
                      <Pencil size={10} />
                      Edit venue / event
                    </button>
                  )}
                  <button
                    onClick={handleShare}
                    disabled={sharing}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue/10 py-2.5 text-[11px] font-semibold text-blue transition-colors duration-150 active:bg-blue/20 disabled:opacity-60"
                  >
                    {sharing ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-blue/30 border-t-blue" /> : <Share2 size={12} />}
                    {sharing ? "Generating" : "Share scorecard"}
                  </button>
                  <button
                    onClick={handleDeleteSession}
                    disabled={deleting}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-red/10 py-2.5 text-[11px] font-semibold text-red transition-colors duration-150 active:bg-red/20 disabled:opacity-60"
                  >
                    {deleting ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-red/30 border-t-red" /> : <Trash2 size={12} />}
                    {deleting ? "Deleting" : "Delete session"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Share overlay */}
      {showShareOverlay && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setShowShareOverlay(false)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9998,
              background: "rgba(0,0,0,0.8)",
            }}
          />
          {/* Modal */}
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 9999,
              width: "calc(100vw - 48px)",
              maxWidth: "340px",
              maxHeight: "calc(100dvh - 100px)",
              display: "flex",
              flexDirection: "column",
              borderRadius: "20px",
              overflow: "hidden",
              background: "#0a0e1a",
            }}
          >
            {/* Card preview — scaled to fit, no scroll */}
            <div
              style={{
                flex: 1,
                overflow: "hidden",
                position: "relative",
              }}
            >
              <div
                style={{
                  transform: "scale(0.3)",
                  transformOrigin: "top left",
                  width: "1080px",
                  position: "absolute",
                  top: 0,
                  left: "50%",
                  marginLeft: "-162px",
                }}
              >
                <ShareCard
                  ref={shareCardRef}
                  playerName={realName}
                  venue={venue}
                  dateLabel={dateLabel}
                  totalPins={totalPins}
                  games={games.map((g) => ({
                    game_number: g.game_number,
                    total_score: g.total_score,
                    is_clean: g.is_clean,
                    strike_count: g.strike_count,
                    spare_count: g.spare_count,
                    frames: g.frames,
                  }))}
                />
              </div>
            </div>
            {/* Buttons */}
            <div
              style={{
                display: "flex",
                gap: "8px",
                padding: "12px",
                background: "#0a0e1a",
                borderTop: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <button
                onClick={handleCaptureAndShare}
                disabled={sharing}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue py-3 text-sm font-semibold text-white transition-transform duration-150 ease-out active:scale-[0.97] disabled:opacity-60"
              >
                {sharing && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
                {sharing ? "Generating" : "Share"}
              </button>
              <button
                onClick={() => setShowShareOverlay(false)}
                className="rounded-lg border border-border px-6 py-3 text-sm font-semibold text-text-secondary transition-[transform,background-color] duration-150 ease-out active:scale-[0.97] active:bg-white/5"
              >
                Close
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
