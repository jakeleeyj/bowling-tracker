"use client";

import { useState } from "react";
import { Crown, ArrowRight, Check, X } from "lucide-react";
import { type MinigameState, currentGameIndex } from "@/lib/minigame";

interface Props {
  state: MinigameState;
  onConfirm: (winnerId: string | null, endSession: boolean) => void;
  onCancel: () => void;
}

export default function MinigameWinnerPicker({
  state,
  onConfirm,
  onCancel,
}: Props) {
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const gameNumber = currentGameIndex(state) + 1;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-4 pb-[calc(76px+env(safe-area-inset-bottom))] backdrop-blur-sm sm:items-center sm:pb-4">
      <div className="w-full max-w-[440px] animate-slide-up rounded-2xl border border-border-light bg-surface p-5 shadow-2xl shadow-black/50">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5">
              <Crown size={18} className="text-gold" />
              <h2 className="text-base font-extrabold text-white">
                Who won Game {gameNumber}?
              </h2>
            </div>
            <p className="mt-1 text-xs text-text-secondary">
              Awards +{state.rules.winnerPoints}. Leave unselected for a tie.
            </p>
          </div>
          <button
            onClick={onCancel}
            aria-label="Back to game"
            className="shrink-0 text-text-muted active:scale-95"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          {state.players.map((p) => (
            <button
              key={p.id}
              onClick={() => setWinnerId((cur) => (cur === p.id ? null : p.id))}
              className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition-all active:scale-95 ${
                winnerId === p.id
                  ? "border-gold bg-gold/20 text-gold"
                  : "border-border-light bg-surface-light text-white"
              }`}
            >
              {winnerId === p.id && <Crown size={14} className="text-gold" />}
              {p.name}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onConfirm(winnerId, false)}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue to-blue-dark py-3.5 text-sm font-bold text-white shadow-lg shadow-blue/25 active:scale-[0.98]"
          >
            Next game <ArrowRight size={16} />
          </button>
          <button
            onClick={() => onConfirm(winnerId, true)}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border-light bg-surface-light py-3.5 text-sm font-bold text-white active:scale-[0.98]"
          >
            <Check size={16} /> Finish session
          </button>
        </div>
      </div>
    </div>
  );
}
