"use client";

import { Crown, RotateCcw, Check } from "lucide-react";
import { type MinigameState, standings, playerSummary } from "@/lib/minigame";

interface Props {
  state: MinigameState;
  onPlayAgain: () => void;
  onDone: () => void;
}

const medal = ["text-gold", "text-text-secondary", "text-[#cd7f32]"];

export default function MinigameResults({ state, onPlayAgain, onDone }: Props) {
  const rows = standings(state);
  const gamesPlayed = state.games.length;
  const champion = rows[0];

  return (
    <div className="flex flex-col gap-4">
      {/* Champion banner */}
      <div className="glass-strong flex items-center gap-3 border border-gold/40 p-4">
        <Crown size={28} className="text-gold" />
        <div>
          <div className="text-[11px] uppercase tracking-wide text-text-muted">
            Winner · {gamesPlayed} game{gamesPlayed !== 1 ? "s" : ""}
          </div>
          <div className="text-lg font-extrabold">
            {champion.player.name}{" "}
            <span className="text-gold">· {champion.total} pts</span>
          </div>
        </div>
      </div>

      {/* Standings */}
      <section>
        <h2 className="mb-2 text-sm font-bold">Final standings</h2>
        <div className="flex flex-col gap-2">
          {rows.map((row) => {
            const s = playerSummary(state, row.player.id);
            return (
              <div
                key={row.player.id}
                className={`glass flex items-center gap-3 p-3 ${
                  row.rank === 1 ? "border border-gold/40" : ""
                }`}
              >
                <span
                  className={`w-5 text-center text-sm font-extrabold ${medal[row.rank - 1] ?? "text-text-muted"}`}
                >
                  {row.rank}
                </span>
                <div className="flex-1">
                  <span className="text-sm font-semibold text-text-primary">
                    {row.player.name}
                  </span>
                  <div className="mt-0.5 text-[11px] text-text-muted">
                    {s.gamesWon} won · {s.strikes} strikes · {s.spares} spares ·{" "}
                    {s.cornerMade} corners
                    {s.cornerMissed > 0 ? ` · ${s.cornerMissed} open` : ""}
                  </div>
                </div>
                <span className="text-2xl font-extrabold tabular-nums">
                  {row.total}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <div className="flex gap-2">
        <button
          onClick={onPlayAgain}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-surface-light py-3.5 text-sm font-bold text-text-primary active:scale-[0.98]"
        >
          <RotateCcw size={16} /> New session
        </button>
        <button
          onClick={onDone}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue to-blue-dark py-3.5 text-sm font-bold text-white shadow-lg shadow-blue/25 active:scale-[0.98]"
        >
          <Check size={16} /> Done
        </button>
      </div>
    </div>
  );
}
