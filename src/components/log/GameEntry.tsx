"use client";

import { Check, Undo2, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  type FrameData,
  isCleanGame,
  calculateFrameScores,
} from "@/lib/bowling";
import PinDiagram from "@/components/PinDiagram";
import FrameScorecard from "@/components/FrameScorecard";
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
  } = props;

  return (
    <div>
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={() => {
            if (editMode) {
              if (!confirm("Discard changes?")) return;
              setHasUnsaved(false);
              router.back();
              return;
            }
            if (!confirm("Discard this session?")) return;
            props.discardSession();
            router.push("/dashboard");
          }}
          className="text-red"
        >
          <Trash2 size={18} />
        </button>
        <h1 className="text-base font-bold text-text-primary">
          {editMode
            ? "Edit Game"
            : `Game ${currentGameIndex + 1} of ${gameCount}`}
        </h1>
        <div className="w-5" />
      </div>

      {/* Game tabs — always visible so user can add more games */}
      {!editMode && (
        <div className="mb-3 flex gap-1">
          {Array.from({ length: gameCount }, (_, i) => {
            const isActive = i === currentGameIndex;
            const isDone = games[i] !== undefined;
            const tab = props.getGameTabScore(i);
            return (
              <button
                key={i}
                onClick={() => switchToGame(i)}
                className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-colors ${
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
                  <span className="ml-1 text-[10px]">
                    {tab.score}
                    {tab.inProgress && "*"}
                  </span>
                )}
              </button>
            );
          })}
          <button
            onClick={() => setGameCount((c: number) => c + 1)}
            className="flex h-auto w-8 shrink-0 items-center justify-center rounded-lg bg-surface-light text-sm font-bold text-text-muted active:scale-95"
          >
            +
          </button>
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
                <FrameScorecard
                  frames={completedGame.frames}
                  currentFrame={0}
                  currentRoll={1}
                />
              ) : null}

              <div className="glass p-4 text-center">
                <div className="text-xs text-text-muted">Final Score</div>
                <div className="text-3xl font-extrabold text-text-primary">
                  {completedGame.totalScore}
                </div>
                {completedGame.entryType === "detailed" &&
                  isCleanGame(completedGame.frames) && (
                    <div className="mt-1 text-[11px] font-semibold text-green">
                      CLEAN
                    </div>
                  )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={editCurrentGame}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-surface-light py-3.5 text-sm font-bold text-text-secondary active:bg-surface-light/80"
                >
                  <Pencil size={16} />
                  Edit
                </button>
                <button
                  onClick={() => {
                    if (
                      !confirm("Delete this game? You'll need to re-enter it.")
                    )
                      return;
                    deleteCurrentGame();
                  }}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red/10 py-3.5 text-sm font-bold text-red active:bg-red/20"
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </div>

              {editMode ? (
                <button
                  onClick={updateExistingGame}
                  disabled={saving}
                  className="w-full rounded-xl bg-gradient-to-r from-green to-emerald-600 py-4 text-base font-bold text-white shadow-lg shadow-green/25 transition-transform duration-150 active:scale-[0.97] disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Changes"}
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
                        className="w-full rounded-xl bg-gradient-to-r from-blue to-blue-dark py-4 text-base font-bold text-white shadow-lg shadow-blue/25 transition-transform duration-150 active:scale-[0.97]"
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
                        className="w-full rounded-xl bg-gradient-to-r from-green to-emerald-600 py-4 text-base font-bold text-white shadow-lg shadow-green/25 transition-transform duration-150 active:scale-[0.97] disabled:opacity-50"
                      >
                        {saving ? "Saving — don't close..." : "Save Session"}
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
          {/* Mode toggle */}
          <div className="mb-4 flex rounded-lg bg-surface-light p-[3px]">
            <button
              onClick={() => setEntryMode("quick")}
              className={`flex-1 rounded-md py-[6px] text-[13px] transition-colors ${
                entryMode === "quick"
                  ? "bg-blue font-semibold text-white"
                  : "text-text-muted"
              }`}
            >
              Quick
            </button>
            <button
              onClick={() => setEntryMode("detailed")}
              className={`flex-1 rounded-md py-[6px] text-[13px] transition-colors ${
                entryMode === "detailed"
                  ? "bg-blue font-semibold text-white"
                  : "text-text-muted"
              }`}
            >
              Detailed
            </button>
          </div>

          {entryMode === "quick" ? (
            <div className="flex flex-col gap-4">
              <div className="glass p-6 text-center">
                <label className="mb-2 block text-sm text-text-muted">
                  Total Score
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
                  className="w-full bg-transparent text-center text-5xl font-extrabold text-text-primary outline-none placeholder:text-surface-light"
                />
              </div>
              <button
                onClick={completeQuickGame}
                disabled={
                  !quickScore ||
                  parseInt(quickScore) < 0 ||
                  parseInt(quickScore) > 300
                }
                className="rounded-xl bg-gradient-to-r from-blue to-blue-dark py-4 text-base font-bold text-white shadow-lg shadow-blue/25 disabled:opacity-50"
              >
                <Check size={18} className="mr-2 inline" />
                Done
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {/* Scorecard */}
              <FrameScorecard
                frames={sortedFrames}
                currentFrame={currentFrame}
                currentRoll={currentRoll}
                onFrameTap={handleFrameTap}
              />

              {/* Score + Max */}
              <div className="flex gap-2">
                <div className="glass flex-1 p-2 text-center">
                  <div className="text-[10px] text-text-muted">Score</div>
                  <div className="text-xl font-extrabold text-text-primary">
                    {currentScore}
                  </div>
                </div>
                <div className="glass flex-1 p-2 text-center">
                  <div className="text-[10px] text-text-muted">
                    Max Possible
                  </div>
                  <div className="text-xl font-extrabold text-green">
                    {maxPossible}
                  </div>
                </div>
              </div>

              {/* Frame label */}
              <p className="text-xs text-text-secondary">
                Frame {currentFrame} &mdash; Roll {currentRoll}
                {availablePins.length < 10 &&
                  ` | ${availablePins.length} pins in play`}
              </p>

              {/* Pin diagram */}
              <PinDiagram
                standingPins={standingPins}
                availablePins={availablePins}
                onPinToggle={handlePinToggle}
                label="Tap pins left standing"
              />

              {/* Action buttons */}
              <div className="flex gap-2">
                {history.length > 0 && (
                  <button
                    onClick={handleUndo}
                    className="flex w-12 items-center justify-center rounded-xl bg-surface-light text-text-muted active:bg-surface-light/80"
                  >
                    <Undo2 size={18} />
                  </button>
                )}
                <button
                  onClick={handleGutter}
                  className="rounded-xl bg-surface-light px-3 py-3.5 text-xs font-bold text-text-muted active:bg-surface-light/80"
                >
                  GUTTER
                </button>
                {showStrikeButton ? (
                  <button
                    onClick={() => {
                      saveHistory();
                      handleStrike();
                    }}
                    className="flex-1 rounded-xl bg-gradient-to-r from-green to-emerald-600 py-3.5 text-base font-extrabold tracking-wider text-white shadow-lg shadow-green/25 transition-transform duration-150 active:scale-[0.97]"
                  >
                    STRIKE
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      saveHistory();
                      handleSpare();
                    }}
                    className="flex-1 rounded-xl bg-gradient-to-r from-gold to-amber-600 py-3.5 text-base font-extrabold tracking-wider text-white shadow-lg shadow-gold/25 transition-transform duration-150 active:scale-[0.97]"
                  >
                    SPARE
                  </button>
                )}
                <button
                  onClick={confirmPinSelection}
                  className="flex-1 rounded-xl bg-gradient-to-r from-blue to-blue-dark py-3.5 text-base font-extrabold tracking-wider text-white shadow-lg shadow-blue/25 transition-transform duration-150 active:scale-[0.97]"
                >
                  NEXT
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
                        <span className="text-sm font-bold text-text-primary">
                          {currentScore}
                        </span>
                        <span
                          className={`text-xs font-bold ${
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
                          <p className="mb-2 text-[10px] font-semibold text-text-muted">
                            Changed frames
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {changes.map(({ frame, orig }) => (
                              <div
                                key={frame.frameNumber}
                                className="flex items-center gap-1.5 rounded-lg bg-black/20 px-2.5 py-1.5"
                              >
                                <span className="text-[10px] font-bold text-blue">
                                  F{frame.frameNumber}
                                </span>
                                {orig && (
                                  <span className="text-[10px] text-text-muted">
                                    {rollLabel(orig)}
                                  </span>
                                )}
                                <span className="text-[10px] text-text-muted">
                                  &rarr;
                                </span>
                                <span className="text-[10px] font-bold text-text-primary">
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
                    className="w-full rounded-xl bg-gradient-to-r from-green to-emerald-600 py-4 text-base font-bold text-white shadow-lg shadow-green/25 transition-transform duration-150 active:scale-[0.97] disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Changes"}
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
