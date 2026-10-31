"use client";

import { useState } from "react";
import { Check, Undo2, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  type FrameData,
  isCleanGame,
  calculateFrameScores,
  getFrame10ShotPins,
} from "@/lib/bowling";
import RollingNumber from "@/components/RollingNumber";
import { useConfirm } from "@/components/ConfirmSheet";
import PinDiagram from "@/components/PinDiagram";
import FrameScorecard from "@/components/FrameScorecard";
import FramePinDetail from "@/components/FramePinDetail";
import LiveRibbon from "@/components/log/LiveRibbon";
import { frameKind } from "@/lib/ribbon";
import type { GameData, EntryMode } from "@/hooks/useSessionState";

interface GameEntryProps {
  // State
  editMode: boolean;
  editOriginalScore: number;
  editOriginalFrames: FrameData[];
  currentGameIndex: number;
  gameCount: number;
  games: GameData[];
  entryMode: EntryMode;
  quickScore: string;
  frames: FrameData[];
  currentFrame: number;
  currentRoll: 1 | 2 | 3;
  standingPins: number[];
  lastMark: { type: "strike" | "spare"; id: number } | null;
  saving: boolean;
  history: Array<{
    frames: FrameData[];
    currentFrame: number;
    currentRoll: 1 | 2 | 3;
    standingPins: number[];
  }>;
  // Derived
  sortedFrames: FrameData[];
  currentScore: number;
  maxPossible: number;
  availablePins: number[];
  isFreshRack: boolean;
  showStrikeButton: boolean;
  currentGameComplete: boolean;
  // Setters
  setEntryMode: (m: EntryMode) => void;
  setQuickScore: (s: string) => void;
  setGameCount: (n: number | ((prev: number) => number)) => void;
  setStep: (s: "setup" | "game" | "results") => void;
  // Actions
  handleStrike: () => void;
  handleSpare: () => void;
  handleGutter: () => void;
  handlePinToggle: (pin: number) => void;
  confirmPinSelection: () => void;
  handleUndo: () => void;
  handleFrameTap: (frame: number) => void;
  switchToGame: (index: number) => void;
  editCurrentGame: () => void;
  deleteCurrentGame: () => void;
  completeQuickGame: () => void;
  saveSession: () => void;
  updateExistingGame: () => void;
  saveHistory: () => void;
  setHasUnsaved: (v: boolean) => void;
  setGames?: (games: GameData[]) => void;
  discardSession: () => void;
  getGameTabScore: (index: number) => { score: number; inProgress: boolean };
}

export default function GameEntry(props: GameEntryProps) {
  const router = useRouter();
  const confirm = useConfirm();
  // Only flash marks made after this screen mounted, not one left over from before
  const [mountMarkId] = useState(() => props.lastMark?.id ?? 0);
  // The user's pick is tied to the (game, frame, roll) it was made in so any
  // advance or game switch implicitly returns the view to the live shot.
  const [viewOverride, setViewOverride] = useState<{
    key: string;
    shot: 1 | 2 | 3;
  } | null>(null);
  const liveKey = `${props.currentGameIndex}-${props.currentFrame}-${props.currentRoll}`;
  const frame10ViewShot: 1 | 2 | 3 | null =
    viewOverride && viewOverride.key === liveKey ? viewOverride.shot : null;

  const {
    editMode,
    editOriginalScore,
    editOriginalFrames,
    currentGameIndex,
    gameCount,
    games,
    entryMode,
    quickScore,
    currentFrame,
    currentRoll,
    standingPins,
    saving,
    history,
    sortedFrames,
    currentScore,
    maxPossible,
    availablePins,
    showStrikeButton,
    currentGameComplete,
    setEntryMode,
    setQuickScore,
    setGameCount,
    setStep,
    handleStrike,
    handleSpare,
    handleGutter,
    handlePinToggle,
    confirmPinSelection,
    handleUndo,
    handleFrameTap,
    switchToGame,
    editCurrentGame,
    deleteCurrentGame,
    completeQuickGame,
    saveSession,
    updateExistingGame,
    saveHistory,
    setHasUnsaved,
    lastMark,
  } = props;

  const fillScreen =
    entryMode === "detailed" &&
    !(currentGameComplete && games[currentGameIndex]);

  return (
    <div
      className={
        fillScreen
          ? "grid min-h-[calc(100dvh-1.5rem-max(8rem,7rem+env(safe-area-inset-bottom)))] grid-rows-[auto_auto_1fr] lg:block lg:min-h-0"
          : undefined
      }
    >
      {/* Header */}
      <div className="mb-2 flex items-center gap-2">
        <button
          onClick={async () => {
            if (editMode) {
              const ok = await confirm({
                title: "Discard changes?",
                confirmLabel: "Discard",
                cancelLabel: "Keep editing",
                destructive: true,
              });
              if (!ok) return;
              setHasUnsaved(false);
              router.back();
              return;
            }
            const ok = await confirm({
              title: "Discard this session?",
              message: "Games you've entered will be lost.",
              confirmLabel: "Discard session",
              cancelLabel: "Keep bowling",
              destructive: true,
            });
            if (!ok) return;
            props.discardSession();
            router.push("/dashboard");
          }}
          aria-label={editMode ? "Discard changes" : "Discard session"}
          className="-ml-3 flex h-11 w-11 items-center justify-center rounded-full text-text-muted transition-[color,background-color,transform] duration-150 active:scale-90 active:bg-red/10 active:text-red"
        >
          <Trash2 size={18} />
        </button>
        <h1 className="mr-auto text-base font-semibold text-text-primary">
          {editMode
            ? "Edit game"
            : `Game ${currentGameIndex + 1} of ${gameCount}`}
        </h1>
        {!(currentGameComplete && games[currentGameIndex]) && (
          <div className="relative flex h-11 w-[168px] rounded-lg bg-surface-light p-[3px]">
            <span
              aria-hidden
              className={`absolute inset-y-[3px] left-[3px] w-[calc(50%-3px)] rounded-md bg-blue shadow-sm transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] ${
                entryMode === "detailed" ? "translate-x-full" : ""
              }`}
            />
            <button
              onClick={() => setEntryMode("quick")}
              aria-pressed={entryMode === "quick"}
              className={`relative flex-1 rounded-md text-sm font-semibold transition-colors duration-200 ${
                entryMode === "quick" ? "text-white" : "text-text-muted"
              }`}
            >
              Quick
            </button>
            <button
              onClick={() => setEntryMode("detailed")}
              aria-pressed={entryMode === "detailed"}
              className={`relative flex-1 rounded-md text-sm font-semibold transition-colors duration-200 ${
                entryMode === "detailed" ? "text-white" : "text-text-muted"
              }`}
            >
              Detailed
            </button>
          </div>
        )}
      </div>

      {/* Game tabs — always visible so user can add more games */}
      {!editMode && (
        <div className="mb-2 flex gap-1">
          {Array.from({ length: gameCount }, (_, i) => {
            const isActive = i === currentGameIndex;
            const isDone = games[i] !== undefined;
            const tab = props.getGameTabScore(i);
            return (
              <button
                key={i}
                onClick={() => switchToGame(i)}
                className={`h-10 flex-1 rounded-lg text-xs font-semibold tabular-nums transition-[color,background-color,transform] duration-150 active:scale-[0.96] ${
                  isActive
                    ? "bg-blue text-white"
                    : isDone
                      ? "bg-green/15 text-green"
                      : tab.inProgress
                        ? "bg-blue/15 text-blue"
                        : "bg-surface-light text-text-muted"
                }`}
              >
                G{i + 1}
                {!isActive && tab.score > 0 && (
                  <span className="ml-1 text-[11px]">
                    {tab.score}
                    {tab.inProgress && "*"}
                  </span>
                )}
              </button>
            );
          })}
          {gameCount > 1 && !games[gameCount - 1] && (
            <button
              onClick={() => {
                setGameCount((c: number) => Math.max(1, c - 1));
                if (currentGameIndex >= gameCount - 1) {
                  switchToGame(gameCount - 2);
                }
              }}
              aria-label="Remove game"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-light text-sm font-semibold text-text-muted transition-transform duration-150 active:scale-90"
            >
              &minus;
            </button>
          )}
          {gameCount < 8 && (
            <button
              onClick={() => setGameCount((c: number) => c + 1)}
              aria-label="Add game"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-light text-sm font-semibold text-text-muted transition-transform duration-150 active:scale-90"
            >
              +
            </button>
          )}
        </div>
      )}

      {/* Completed game view */}
      {currentGameComplete && games[currentGameIndex] ? (
        (() => {
          const completedGame = games[currentGameIndex];
          return (
            <div className="flex flex-col gap-3">
              {completedGame.entryType === "detailed" &&
              completedGame.frames.length > 0 ? (
                <>
                  <FrameScorecard
                    frames={completedGame.frames}
                    currentFrame={0}
                    currentRoll={1}
                  />
                  <FramePinDetail
                    frames={completedGame.frames.map((f) => ({
                      frame_number: f.frameNumber,
                      roll_1: f.roll1,
                      roll_2: f.roll2,
                      roll_3: f.roll3,
                      is_strike: f.isStrike,
                      is_spare: f.isSpare,
                      pins_remaining: f.pinsRemaining,
                      pins_remaining_roll2: f.pinsRemainingRoll2,
                      pins_remaining_roll3: f.pinsRemainingRoll3,
                      spare_converted: f.spareConverted,
                    }))}
                  />
                </>
              ) : null}

              <div className="glass p-4 text-center">
                <div className="text-xs text-text-muted">Final score</div>
                <div className="animate-scale-in text-[28px] font-extrabold tabular-nums text-text-primary">
                  {completedGame.totalScore}
                </div>
                {completedGame.entryType === "detailed" &&
                  isCleanGame(completedGame.frames) && (
                    <div className="mt-1 text-[11px] font-semibold text-green">
                      Clean
                    </div>
                  )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={editCurrentGame}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-surface-light py-3.5 text-sm font-semibold text-text-secondary transition-transform duration-150 active:scale-[0.97]"
                >
                  <Pencil size={16} />
                  Edit
                </button>
                <button
                  onClick={async () => {
                    const ok = await confirm({
                      title: "Delete this game?",
                      message: "You'll need to re-enter it.",
                      confirmLabel: "Delete game",
                      destructive: true,
                    });
                    if (ok) deleteCurrentGame();
                  }}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red/10 py-3.5 text-sm font-semibold text-red transition-[background-color,transform] duration-150 active:scale-[0.97] active:bg-red/20"
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </div>

              {editMode ? (
                <button
                  onClick={updateExistingGame}
                  disabled={saving}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-green py-4 text-base font-semibold text-white transition-transform duration-150 active:scale-[0.97] disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      Saving
                    </>
                  ) : (
                    "Save changes"
                  )}
                </button>
              ) : (
                (() => {
                  const nextIncomplete = Array.from(
                    { length: gameCount },
                    (_, i) => i,
                  ).find((i) => i !== currentGameIndex && !games[i]);
                  if (nextIncomplete !== undefined) {
                    return (
                      <button
                        onClick={() => switchToGame(nextIncomplete)}
                        className="w-full rounded-xl bg-blue py-4 text-base font-semibold text-white transition-transform duration-150 active:scale-[0.97]"
                      >
                        Next Game (G{nextIncomplete + 1})
                      </button>
                    );
                  }
                  if (games.filter(Boolean).length === gameCount) {
                    return (
                      <button
                        onClick={saveSession}
                        disabled={saving}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-green py-4 text-base font-semibold text-white transition-transform duration-150 active:scale-[0.97] disabled:opacity-60"
                      >
                        {saving ? (
                          <>
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                            Saving, keep the app open
                          </>
                        ) : (
                          "Save session"
                        )}
                      </button>
                    );
                  }
                  return null;
                })()
              )}
            </div>
          );
        })()
      ) : (
        <>
          {entryMode === "quick" ? (
            <div className="flex flex-col gap-4">
              <div className="glass p-6 text-center">
                <label className="mb-2 block text-sm text-text-muted">
                  Total score
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={quickScore}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^0-9]/g, "");
                    if (v === "" || (parseInt(v) >= 0 && parseInt(v) <= 300))
                      setQuickScore(v);
                  }}
                  placeholder="0"
                  className="w-full bg-transparent text-center text-5xl font-extrabold tabular-nums text-text-primary outline-none placeholder:text-surface-light"
                />
              </div>
              <button
                onClick={completeQuickGame}
                disabled={
                  !quickScore ||
                  parseInt(quickScore) < 0 ||
                  parseInt(quickScore) > 300
                }
                className="flex items-center justify-center gap-2 rounded-xl bg-blue py-4 text-base font-semibold text-white transition-[transform,opacity] duration-150 active:scale-[0.97] disabled:opacity-40 disabled:shadow-none disabled:active:scale-100"
              >
                <Check size={18} />
                Done
              </button>
            </div>
          ) : (
            <div className="grid grid-rows-[auto_auto_1fr_auto] gap-2 lg:flex lg:flex-col">
              {/* Scorecard */}
              <FrameScorecard
                frames={sortedFrames}
                currentFrame={currentFrame}
                currentRoll={currentRoll}
                onFrameTap={handleFrameTap}
              />

              {/* Live ribbon + frame, max */}
              <div className="flex items-center gap-4 px-0.5">
                <LiveRibbon
                  done={sortedFrames
                    .filter(
                      (f) =>
                        currentGameComplete || f.frameNumber < currentFrame,
                    )
                    .map((f) => frameKind(f.roll1, f.roll2))}
                >
                  <span className="text-[10px] font-semibold text-text-secondary">
                    Score
                  </span>
                  <RollingNumber
                    value={currentScore}
                    className="text-[28px] leading-none font-bold"
                  />
                </LiveRibbon>
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-semibold">
                    Frame {currentFrame} &middot; Roll {currentRoll}
                  </p>
                  {availablePins.length < 10 && (
                    <p className="text-xs text-text-muted">
                      {availablePins.length} in play
                    </p>
                  )}
                  <p className="mt-1 text-xs text-text-secondary">
                    Max{" "}
                    <RollingNumber
                      value={maxPossible}
                      className="text-lg leading-none font-semibold text-text-primary"
                    />
                  </p>
                </div>
              </div>

              {(() => {
                const isFrame10 = currentFrame === 10;
                const frame10 = isFrame10
                  ? sortedFrames.find((f) => f.frameNumber === 10)
                  : null;
                const hasPastShot = (s: 1 | 2 | 3) => {
                  if (!frame10) return false;
                  if (s === 1) return false; // R1 is always "live" or already covered by R2/R3 buttons
                  if (s === 2) return frame10.roll2 !== null;
                  return frame10.roll3 !== null;
                };
                const showToggle =
                  isFrame10 &&
                  (currentRoll > 1 || hasPastShot(2) || hasPastShot(3));
                const activeShot: 1 | 2 | 3 =
                  frame10ViewShot ?? (currentRoll as 1 | 2 | 3);
                const viewingPast =
                  frame10ViewShot !== null && frame10ViewShot !== currentRoll;

                const pastShotData =
                  viewingPast && frame10
                    ? getFrame10ShotPins(
                        activeShot,
                        frame10.pinsRemaining,
                        frame10.pinsRemainingRoll2,
                        frame10.roll1,
                        frame10.roll2,
                        frame10.roll3,
                        frame10.pinsRemainingRoll3,
                      )
                    : null;

                return (
                  <>
                    {/* Pin diagram */}
                    <PinDiagram
                      standingPins={
                        pastShotData ? pastShotData.pins : standingPins
                      }
                      availablePins={pastShotData ? undefined : availablePins}
                      onPinToggle={handlePinToggle}
                      disabled={!!pastShotData}
                      fill
                      overlay={
                        lastMark && lastMark.id > mountMarkId ? (
                          <div
                            key={lastMark.id}
                            aria-hidden
                            className="animate-mark-flash pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-base/60"
                          >
                            <span
                              className={`text-8xl leading-none font-black telemetry:font-mono telemetry:font-medium ${lastMark.type === "strike" ? "text-strike" : "text-spare"}`}
                            >
                              {lastMark.type === "strike" ? "X" : "/"}
                            </span>
                            <span
                              className={`mt-1 text-xs font-semibold tracking-[0.2em] ${lastMark.type === "strike" ? "text-strike" : "text-spare"}`}
                            >
                              {lastMark.type === "strike" ? "STRIKE" : "SPARE"}
                            </span>
                          </div>
                        ) : undefined
                      }
                      toolbar={
                        showToggle ? (
                          <div className="relative flex w-[156px] shrink-0 rounded-lg bg-surface-light p-[3px]">
                            {(() => {
                              const shots = ([1, 2, 3] as const).filter(
                                (s) =>
                                  s === currentRoll ||
                                  s <= currentRoll ||
                                  hasPastShot(s),
                              );
                              const index = Math.max(
                                0,
                                shots.indexOf(activeShot),
                              );
                              return (
                                <span
                                  aria-hidden
                                  className="absolute inset-y-[3px] left-[3px] rounded-md bg-blue shadow-sm transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]"
                                  style={{
                                    width: `calc((100% - 6px) / ${shots.length})`,
                                    transform: `translateX(${index * 100}%)`,
                                  }}
                                />
                              );
                            })()}
                            {([1, 2, 3] as const).map((shot) => {
                              const isLive = shot === currentRoll;
                              const visible =
                                isLive ||
                                shot <= currentRoll ||
                                hasPastShot(shot);
                              if (!visible) return null;
                              const active = activeShot === shot;
                              return (
                                <button
                                  key={shot}
                                  onClick={() =>
                                    setViewOverride(
                                      isLive ? null : { key: liveKey, shot },
                                    )
                                  }
                                  aria-pressed={active}
                                  className={`relative h-8 flex-1 rounded-md text-xs font-semibold transition-colors duration-200 ${
                                    active ? "text-white" : "text-text-muted"
                                  }`}
                                >
                                  R{shot}
                                  {isLive && (
                                    <span
                                      aria-label="live"
                                      className={`ml-1 inline-block h-1.5 w-1.5 rounded-full align-middle ${active ? "bg-white" : "bg-blue"}`}
                                    />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        ) : undefined
                      }
                      label={
                        pastShotData
                          ? pastShotData.precise
                            ? `Standing after R${activeShot}`
                            : `Going into R${activeShot}, knocked ${pastShotData.knocked ?? "-"}`
                          : "Tap pins left standing"
                      }
                    />
                  </>
                );
              })()}

              {/* Action buttons: bottom of the screen, pinned above the nav when the page scrolls */}
              <div className="sticky bottom-[calc(7rem+max(0.75rem,env(safe-area-inset-bottom)))] z-20 -mx-4 flex gap-2 bg-base px-4 py-1.5 lg:static lg:mx-0 lg:bg-transparent lg:p-0">
                <button
                  onClick={handleUndo}
                  disabled={history.length === 0}
                  aria-label="Undo"
                  className="flex w-12 items-center justify-center rounded-xl bg-surface-light text-text-muted transition-[transform,opacity] duration-150 active:scale-[0.94] disabled:opacity-30 disabled:active:scale-100"
                >
                  <Undo2 size={18} />
                </button>
                <button
                  onClick={handleGutter}
                  className="rounded-xl bg-surface-light px-3 py-3 text-xs font-semibold text-text-muted transition-transform duration-150 active:scale-[0.94]"
                >
                  Gutter
                </button>
                {showStrikeButton ? (
                  <button
                    onClick={() => {
                      saveHistory();
                      handleStrike();
                    }}
                    className="flex-1 rounded-xl bg-strike py-3 text-base font-semibold text-(color:--color-base) transition-transform duration-150 active:scale-[0.97]"
                  >
                    Strike
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      saveHistory();
                      handleSpare();
                    }}
                    className="flex-1 rounded-xl bg-spare py-3 text-base font-semibold text-(color:--color-base) transition-transform duration-150 active:scale-[0.97]"
                  >
                    Spare
                  </button>
                )}
                <button
                  onClick={confirmPinSelection}
                  className="flex-1 rounded-xl bg-blue py-3 text-base font-semibold text-white transition-transform duration-150 active:scale-[0.97]"
                >
                  Next
                </button>
              </div>

              {/* Edit mode: save button + diff */}
              {editMode && sortedFrames.length === 10 && (
                <div className="flex flex-col gap-2">
                  {editOriginalScore !== currentScore && (
                    <div className="glass flex items-center justify-between p-3">
                      <span className="text-xs text-text-muted">
                        Score change
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-text-muted">
                          {editOriginalScore}
                        </span>
                        <span className="text-text-muted">&rarr;</span>
                        <span className="text-sm font-semibold text-text-primary">
                          {currentScore}
                        </span>
                        <span
                          className={`text-xs font-semibold ${
                            currentScore > editOriginalScore
                              ? "text-green"
                              : currentScore < editOriginalScore
                                ? "text-red"
                                : "text-text-muted"
                          }`}
                        >
                          {currentScore > editOriginalScore ? "+" : ""}
                          {currentScore - editOriginalScore}
                        </span>
                      </div>
                    </div>
                  )}

                  {editOriginalFrames.length > 0 &&
                    (() => {
                      const changes = sortedFrames
                        .map((f) => {
                          const orig = editOriginalFrames.find(
                            (o) => o.frameNumber === f.frameNumber,
                          );
                          if (!orig) return { frame: f, orig: null };
                          if (
                            orig.roll1 !== f.roll1 ||
                            orig.roll2 !== f.roll2 ||
                            orig.roll3 !== f.roll3
                          )
                            return { frame: f, orig };
                          return null;
                        })
                        .filter(Boolean) as {
                        frame: FrameData;
                        orig: FrameData | null;
                      }[];
                      if (changes.length === 0) return null;

                      function rollLabel(f: FrameData) {
                        if (f.isStrike) return "X";
                        const parts = [String(f.roll1)];
                        if (f.roll2 !== null)
                          parts.push(f.isSpare ? "/" : String(f.roll2));
                        if (f.roll3 !== null) parts.push(String(f.roll3));
                        return parts.join(" ");
                      }

                      return (
                        <div className="glass p-3">
                          <p className="mb-2 text-[11px] font-semibold text-text-muted">
                            Changed frames
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {changes.map(({ frame, orig }) => (
                              <div
                                key={frame.frameNumber}
                                className="flex items-center gap-1.5 rounded-lg bg-black/20 px-2.5 py-1.5"
                              >
                                <span className="text-[11px] font-semibold text-blue">
                                  F{frame.frameNumber}
                                </span>
                                {orig && (
                                  <span className="text-[11px] text-text-muted">
                                    {rollLabel(orig)}
                                  </span>
                                )}
                                <span className="text-[11px] text-text-muted">
                                  &rarr;
                                </span>
                                <span className="text-[11px] font-semibold text-text-primary">
                                  {rollLabel(frame)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                  <button
                    onClick={() => {
                      const frameScores = calculateFrameScores(sortedFrames);
                      const game: GameData = {
                        entryType: "detailed",
                        totalScore: frameScores[frameScores.length - 1] ?? 0,
                        frames: sortedFrames,
                      };
                      // This is a workaround — ideally the hook would handle this
                      // but we need to set games[0] before calling updateExistingGame
                      props.setGames?.([game]);
                      updateExistingGame();
                    }}
                    disabled={saving}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-green py-4 text-base font-semibold text-white transition-transform duration-150 active:scale-[0.97] disabled:opacity-60"
                  >
                    {saving ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                        Saving
                      </>
                    ) : (
                      "Save changes"
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
