"use client";

import { Undo2, Flag, ChevronRight, Crown } from "lucide-react";
import {
  type MinigameState,
  type MinigameActionType,
  TOTAL_FRAMES,
  standings,
  computeTotals,
  currentGameIndex,
  playerFrame,
  tenthFrameClosed,
} from "@/lib/minigame";
import MinigameScorecard from "@/components/minigame/MinigameScorecard";

interface Props {
  state: MinigameState;
  onEvent: (playerId: string, type: MinigameActionType) => void;
  onUndo: (playerId: string) => void;
  onAdvance: (playerId: string) => void;
  onGoToFrame: (playerId: string, frameIndex: number) => void;
  onEndGame: () => void;
}

function haptic(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && navigator.vibrate)
    navigator.vibrate(pattern);
}

export default function MinigameBoard({
  state,
  onEvent,
  onUndo,
  onAdvance,
  onGoToFrame,
  onEndGame,
}: Props) {
  const { rules } = state;
  const gameIndex = currentGameIndex(state);
  const totals = computeTotals(state);
  const ranked = standings(state);

  function tap(playerId: string, type: MinigameActionType) {
    haptic(type === "cornerMissed" ? 30 : [15, 40, 15]);
    onEvent(playerId, type);
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Game + running standings strip */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold">Game {gameIndex + 1}</span>
        <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-xs">
          {ranked.map((r) => {
            const wins = state.games.filter(
              (g) => g.winnerId === r.player.id,
            ).length;
            return (
              <span
                key={r.player.id}
                className="inline-flex items-center gap-1 text-text-secondary"
              >
                {r.player.name}
                <span className="font-bold tabular-nums text-text-primary">
                  {r.total}
                </span>
                {Array.from({ length: wins }, (_, i) => (
                  <Crown key={i} size={11} className="text-gold" />
                ))}
              </span>
            );
          })}
        </div>
      </div>

      {/* Per-player scorecards + controls */}
      <div className="flex flex-col gap-2">
        {state.players.map((p) => {
          const frame = playerFrame(state, p.id);
          const isTenth = frame === TOTAL_FRAMES - 1;
          const locked = isTenth && tenthFrameClosed(state, p.id, gameIndex);
          const hasEventsThisGame = state.events.some(
            (e) => e.playerId === p.id && e.gameIndex === gameIndex,
          );
          return (
            <div key={p.id} className="glass p-3">
              <div className="mb-2 flex items-center gap-2">
                <span className="flex-1 truncate text-sm font-semibold text-text-primary">
                  {p.name}
                </span>
                <span className="text-[11px] font-semibold text-text-muted">
                  Frame {frame + 1}/{TOTAL_FRAMES}
                </span>
                <span className="text-xl font-extrabold tabular-nums">
                  {totals[p.id]}
                </span>
              </div>

              <div className="mb-3">
                <MinigameScorecard
                  state={state}
                  playerId={p.id}
                  gameIndex={gameIndex}
                  currentFrame={frame}
                  onFrameTap={(f) => onGoToFrame(p.id, f)}
                />
              </div>

              {locked ? (
                <div className="rounded-lg bg-surface-light py-2.5 text-center text-xs font-semibold text-text-muted">
                  Frame 10 complete
                </div>
              ) : (
                <div className="flex items-stretch gap-1.5">
                  <ActionButton
                    name="Strike"
                    pts={rules.strikePoints}
                    color="blue"
                    onClick={() => tap(p.id, "strike")}
                  />
                  <ActionButton
                    name="Spare"
                    pts={rules.sparePoints}
                    color="purple"
                    onClick={() => tap(p.id, "spare")}
                  />
                  <ActionButton
                    name="Corner"
                    pts={rules.cornerPoints}
                    color="green"
                    onClick={() => tap(p.id, "cornerMade")}
                  />
                  <ActionButton
                    name="Open"
                    pts={rules.penaltyEnabled ? -rules.cornerMissPenalty : 0}
                    color="red"
                    onClick={() => tap(p.id, "cornerMissed")}
                  />
                  {!isTenth && (
                    <button
                      onClick={() => onAdvance(p.id)}
                      aria-label={`Next frame for ${p.name}`}
                      className="flex w-10 shrink-0 items-center justify-center rounded-lg bg-surface-light text-text-secondary active:scale-95"
                    >
                      <ChevronRight size={18} />
                    </button>
                  )}
                </div>
              )}

              <button
                onClick={() => onUndo(p.id)}
                disabled={!hasEventsThisGame}
                className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-text-muted active:scale-95 disabled:opacity-30"
              >
                <Undo2 size={12} /> Undo last
              </button>
            </div>
          );
        })}
      </div>

      <button
        onClick={onEndGame}
        className="mt-1 flex items-center justify-center gap-2 rounded-xl border border-border bg-surface-light py-3.5 text-sm font-bold text-text-primary active:scale-[0.98]"
      >
        <Flag size={16} /> End game {gameIndex + 1}
      </button>
    </div>
  );
}

const colorClasses: Record<string, string> = {
  blue: "bg-blue/15 text-blue active:bg-blue/25",
  purple: "bg-purple/15 text-purple active:bg-purple/25",
  green: "bg-green/15 text-green active:bg-green/25",
  red: "bg-red/15 text-red active:bg-red/25",
};

function formatPts(pts: number): string {
  if (pts === 0) return "0";
  return pts > 0 ? `+${pts}` : `−${Math.abs(pts)}`;
}

function ActionButton({
  name,
  pts,
  color,
  onClick,
}: {
  name: string;
  pts: number;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg py-2 transition-all active:scale-95 ${colorClasses[color]}`}
    >
      <span className="text-[12px] font-bold leading-none">{name}</span>
      <span className="text-[10px] font-bold leading-none opacity-70 tabular-nums">
        {formatPts(pts)}
      </span>
    </button>
  );
}
