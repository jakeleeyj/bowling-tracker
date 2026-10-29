"use client";

import { Suspense } from "react";
import { Loader } from "lucide-react";
import { useSessionState } from "@/hooks/useSessionState";
import { LoadingScreen } from "@/components/Skeleton";
import { useConfirm } from "@/components/ConfirmSheet";
import SessionSetup from "@/components/log/SessionSetup";
import GameEntry from "@/components/log/GameEntry";
import SessionResults from "@/components/log/SessionResults";

function LogPage() {
  const session = useSessionState();

  // Loading edit data
  if (session.editLoading) {
    return <LoadingScreen message="Loading game" />;
  }

  return (
    <div key={session.step} className="animate-slide-up">
      <LogStep session={session} />
    </div>
  );
}

function LogStep({ session }: { session: ReturnType<typeof useSessionState> }) {
  const confirm = useConfirm();
  // Results screen
  if (session.step === "results" && session.resultsData) {
    return <SessionResults data={session.resultsData} />;
  }

  // Pending sync screen (saved offline)
  if (session.step === "pendingSync") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gold/10">
          <Loader size={32} className="text-gold" />
        </div>
        <h2 className="mb-2 text-lg font-extrabold">Pending sync to server</h2>
        <p className="mb-1 text-sm text-text-muted">
          {session.pendingSyncCount} session
          {session.pendingSyncCount !== 1 ? "s" : ""} saved to device
        </p>
        <p className="mb-6 text-[11px] text-text-muted">
          Results will appear once synced
        </p>
        {session.saving ? (
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue border-t-transparent" />
            Syncing
          </div>
        ) : (
          <button
            onClick={() => session.startNewWhilePending()}
            className="rounded-xl bg-gradient-to-r from-blue to-blue-dark px-8 py-3 text-sm font-bold text-white shadow-lg shadow-blue/25 transition-transform duration-150 active:scale-[0.97]"
          >
            Log another session
          </button>
        )}
      </div>
    );
  }

  // Resume prompt
  if (session.step === "resume") {
    return (
      <div>
        <h1 className="mb-2 text-xl font-extrabold text-text-primary">
          Resume session?
        </h1>
        <p className="mb-6 text-sm text-text-muted">
          You have an unfinished session. Pick up where you left off?
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={session.resumeSession}
            className="rounded-xl bg-gradient-to-r from-blue to-blue-dark py-4 text-base font-bold text-white shadow-lg shadow-blue/25 transition-transform duration-150 active:scale-[0.97]"
          >
            Resume session
          </button>
          <button
            onClick={async () => {
              const ok = await confirm({
                title: "Discard your unfinished session?",
                confirmLabel: "Discard and start new",
                destructive: true,
              });
              if (ok) session.discardSession();
            }}
            className="rounded-xl border border-border-light py-3 text-sm font-semibold text-text-secondary transition-[transform,background-color] duration-150 active:scale-[0.97] active:bg-white/5"
          >
            Start new session
          </button>
        </div>
      </div>
    );
  }

  // Setup screen
  if (session.step === "setup") {
    return (
      <SessionSetup
        venue={session.venue}
        onVenueChange={session.setVenue}
        pastVenues={session.pastVenues}
        eventLabel={session.eventLabel}
        onEventLabelChange={session.setEventLabel}
        gameCount={session.gameCount}
        onGameCountChange={session.setGameCount}
        onStart={session.startSession}
      />
    );
  }

  // Game entry
  return (
    <GameEntry
      editMode={session.editMode}
      editOriginalScore={session.editOriginalScore}
      editOriginalFrames={session.editOriginalFrames}
      currentGameIndex={session.currentGameIndex}
      gameCount={session.gameCount}
      games={session.games}
      entryMode={session.entryMode}
      quickScore={session.quickScore}
      frames={session.frames}
      currentFrame={session.currentFrame}
      currentRoll={session.currentRoll}
      lastMark={session.lastMark}
      standingPins={session.standingPins}
      saving={session.saving}
      history={session.history}
      sortedFrames={session.sortedFrames}
      currentScore={session.currentScore}
      maxPossible={session.maxPossible}
      availablePins={session.availablePins}
      isFreshRack={session.isFreshRack}
      showStrikeButton={session.showStrikeButton}
      currentGameComplete={session.currentGameComplete}
      setEntryMode={session.setEntryMode}
      setQuickScore={session.setQuickScore}
      setGameCount={session.setGameCount}
      setStep={session.setStep}
      handleStrike={session.handleStrike}
      handleSpare={session.handleSpare}
      handleGutter={session.handleGutter}
      handlePinToggle={session.handlePinToggle}
      confirmPinSelection={session.confirmPinSelection}
      handleUndo={session.handleUndo}
      handleFrameTap={session.handleFrameTap}
      switchToGame={session.switchToGame}
      editCurrentGame={session.editCurrentGame}
      deleteCurrentGame={session.deleteCurrentGame}
      completeQuickGame={session.completeQuickGame}
      saveSession={session.saveSession}
      updateExistingGame={session.updateExistingGame}
      saveHistory={session.saveHistory}
      setHasUnsaved={session.setHasUnsaved}
      setGames={session.setGames}
      discardSession={session.discardSession}
      getGameTabScore={session.getGameTabScore}
    />
  );
}

export default function LogPageWrapper() {
  return (
    <div className="lg:mx-auto lg:max-w-[480px]">
      <Suspense fallback={<LoadingScreen />}>
        <LogPage />
      </Suspense>
    </div>
  );
}
