"use client";

import { Dices } from "lucide-react";
import { useMinigameState } from "@/hooks/useMinigameState";
import MinigameSetup from "@/components/minigame/MinigameSetup";
import MinigameBoard from "@/components/minigame/MinigameBoard";
import MinigameWinnerPicker from "@/components/minigame/MinigameWinnerPicker";
import MinigameResults from "@/components/minigame/MinigameResults";

export default function MinigamesPage() {
  const mg = useMinigameState();
  const { state } = mg;

  const subtitle =
    state.step === "setup"
      ? "Casual side-game scoring"
      : state.step === "playing"
        ? "Tap each player as you bowl"
        : "Session complete";

  return (
    <div>
      <header className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple/15 text-purple">
          <Dices size={22} />
        </div>
        <div>
          <h1 className="text-xl font-extrabold leading-tight">Minigames</h1>
          <p className="text-[13px] text-text-muted">{subtitle}</p>
        </div>
      </header>

      {!mg.hydrated ? (
        <div className="glass h-40 animate-pulse" />
      ) : state.step === "setup" ? (
        <MinigameSetup onStart={mg.startGame} />
      ) : state.step === "playing" ? (
        <>
          <MinigameBoard
            state={state}
            onEvent={mg.addEvent}
            onUndo={mg.undoPlayer}
            onAdvance={mg.advancePlayer}
            onGoToFrame={mg.goToFrame}
            onEndGame={mg.requestEndGame}
          />
          {state.pickingWinner && (
            <MinigameWinnerPicker
              state={state}
              onConfirm={mg.finishGame}
              onCancel={mg.cancelEndGame}
            />
          )}
        </>
      ) : (
        <MinigameResults
          state={state}
          onPlayAgain={mg.playAgain}
          onDone={mg.reset}
        />
      )}
    </div>
  );
}
