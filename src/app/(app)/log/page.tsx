"use client";

import { Suspense } from "react";
import { useSessionState } from "@/hooks/useSessionState";
import SessionSetup from "@/components/log/SessionSetup";
import GameEntry from "@/components/log/GameEntry";
import SessionResults from "@/components/log/SessionResults";

function LogPage() {
  const session = useSessionState();

  // Loading edit data
  if (session.editLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="text-sm text-text-muted">Loading game...</div>
      </div>
    );
  }

  // Results screen
  if (session.step === "results" && session.resultsData) {
    return <SessionResults data={session.resultsData} />;
  }

  // Pending sync screen (saved offline)
  if (session.step === "pendingSync") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gold/10">
          <svg
            width={32}
            height={32}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="text-gold"
          >
            <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
          </svg>
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
            Syncing...
          </div>
        ) : (
          <button
            onClick={() => session.startNewWhilePending()}
            className="rounded-xl bg-gradient-to-r from-blue to-blue-dark px-8 py-3 text-sm font-bold text-white shadow-lg shadow-blue/25 active:scale-[0.97]"
          >
            Log Another Session
          </button>
        )}
      </div>
    );
  }

  // Resume prompt
  if (session.step === "resume") {
    return (
      <div>
        <h1 className="mb-6 text-xl font-extrabold text-text-primary">
          Resume Session?
        </h1>
        <p className="mb-6 text-sm text-text-muted">
          You have an unfinished session. Pick up where you left off?
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={session.resumeSession}
            className="rounded-xl bg-gradient-to-r from-blue to-blue-dark py-4 text-base font-bold text-white shadow-lg shadow-blue/25 active:scale-[0.97]"
          >
            Resume Session
          </button>
          <button
            onClick={() => {
              if (!confirm("Discard your current session and start fresh?"))
                return;
              session.discardSession();
            }}
            className="rounded-xl border border-border py-3 text-sm font-semibold text-text-secondary active:scale-[0.97]"
          >
            Start New Session
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
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin">
            <svg viewBox="0 0 32 32" fill="none">
              <circle
                cx="16"
                cy="16"
                r="14"
                stroke="currentColor"
                strokeWidth="2"
                strokeOpacity="0.15"
              />
              <circle
                cx="16"
                cy="16"
                r="14"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="60 28"
                strokeLinecap="round"
                className="text-blue"
              />
              <circle
                cx="13"
                cy="11"
                r="1.5"
                fill="currentColor"
                fillOpacity="0.3"
              />
              <circle
                cx="18"
                cy="11"
                r="1.5"
                fill="currentColor"
                fillOpacity="0.3"
              />
              <circle
                cx="15.5"
                cy="15"
                r="1.5"
                fill="currentColor"
                fillOpacity="0.3"
              />
            </svg>
          </div>
          <p className="mt-3 text-sm text-text-muted">Loading...</p>
        </div>
      }
    >
      <LogPage />
    </Suspense>
  );
}
