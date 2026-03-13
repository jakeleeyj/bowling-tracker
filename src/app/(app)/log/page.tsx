"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import {
  type FrameData,
  getAllPins,
  calculateFrameScores,
  calculateMaxPossible,
  isCleanGame,
  countStrikes,
  countSpares,
} from "@/lib/bowling";
import PinDiagram from "@/components/PinDiagram";
import FrameScorecard from "@/components/FrameScorecard";
import FramePinDetail from "@/components/FramePinDetail";
import { ArrowLeft, Check, Undo2, Pencil, Trash2 } from "lucide-react";

type EntryMode = "quick" | "detailed";
type Step = "setup" | "game";

interface GameData {
  entryType: EntryMode;
  totalScore: number;
  frames: FrameData[];
}

interface GameEditorState {
  entryMode: EntryMode;
  quickScore: string;
  frames: FrameData[];
  currentFrame: number;
  currentRoll: 1 | 2 | 3;
  standingPins: number[];
  history: Array<{
    frames: FrameData[];
    currentFrame: number;
    currentRoll: 1 | 2 | 3;
    standingPins: number[];
  }>;
  isComplete: boolean;
  totalScore: number;
}

function upsertFrame(frames: FrameData[], frame: FrameData): FrameData[] {
  const without = frames.filter((f) => f.frameNumber !== frame.frameNumber);
  return [...without, frame].sort((a, b) => a.frameNumber - b.frameNumber);
}

export default function LogPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<Step>("setup");
  const [venue, setVenue] = useState("");
  const [eventLabel, setEventLabel] = useState("");
  const [gameCount, setGameCount] = useState(3);

  const [currentGameIndex, setCurrentGameIndex] = useState(0);
  const [games, setGames] = useState<GameData[]>([]);
  const [entryMode, setEntryMode] = useState<EntryMode>("detailed");
  const [quickScore, setQuickScore] = useState("");

  const [frames, setFrames] = useState<FrameData[]>([]);
  const [currentFrame, setCurrentFrame] = useState(1);
  const [currentRoll, setCurrentRoll] = useState<1 | 2 | 3>(1);
  const [standingPins, setStandingPins] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  const [history, setHistory] = useState<
    Array<{
      frames: FrameData[];
      currentFrame: number;
      currentRoll: 1 | 2 | 3;
      standingPins: number[];
    }>
  >([]);

  const editorStatesRef = useRef<Map<number, GameEditorState>>(new Map());

  function saveHistory() {
    setHistory((prev) => [
      ...prev,
      {
        frames: frames.map((f) => ({ ...f })),
        currentFrame,
        currentRoll,
        standingPins: [...standingPins],
      },
    ]);
  }

  function handleUndo() {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setFrames(prev.frames);
    setCurrentFrame(prev.currentFrame);
    setCurrentRoll(prev.currentRoll);
    setStandingPins(prev.standingPins);
    setHistory(history.slice(0, -1));
  }

  function handleFrameTap(frameNumber: number) {
    saveHistory();
    let newFrames = [...frames];
    // Remove partial current frame (roll 1 entered but not roll 2, and not a strike)
    const currentData = newFrames.find((f) => f.frameNumber === currentFrame);
    if (currentData && !currentData.isStrike && currentData.roll2 === null) {
      newFrames = newFrames.filter((f) => f.frameNumber !== currentFrame);
    }
    // Remove tapped frame (will be re-entered)
    newFrames = newFrames.filter((f) => f.frameNumber !== frameNumber);
    setFrames(newFrames);
    setCurrentFrame(frameNumber);
    setCurrentRoll(1);
    setStandingPins([]);
  }

  function startSession() {
    setStep("game");
    setGames([]);
    setCurrentGameIndex(0);
    editorStatesRef.current.clear();
    resetGameState();
  }

  function resetGameState() {
    setFrames([]);
    setCurrentFrame(1);
    setCurrentRoll(1);
    setStandingPins([]);
    setQuickScore("");
    setEntryMode("detailed");
    setHistory([]);
  }

  function saveEditorState(gameIndex: number) {
    editorStatesRef.current.set(gameIndex, {
      entryMode,
      quickScore,
      frames: frames.map((f) => ({ ...f })),
      currentFrame,
      currentRoll,
      standingPins: [...standingPins],
      history: history.map((h) => ({
        ...h,
        frames: h.frames.map((f) => ({ ...f })),
        standingPins: [...h.standingPins],
      })),
      isComplete: games[gameIndex] !== undefined,
      totalScore: games[gameIndex]?.totalScore ?? 0,
    });
  }

  function loadEditorState(gameIndex: number) {
    const saved = editorStatesRef.current.get(gameIndex);
    if (saved) {
      setEntryMode(saved.entryMode);
      setQuickScore(saved.quickScore);
      setFrames(saved.frames);
      setCurrentFrame(saved.currentFrame);
      setCurrentRoll(saved.currentRoll);
      setStandingPins(saved.standingPins);
      setHistory(saved.history);
    } else {
      resetGameState();
    }
  }

  function editCurrentGame() {
    const game = games[currentGameIndex];
    if (!game) return;

    // Remove from completed games
    const newGames = [...games];
    delete newGames[currentGameIndex];
    setGames(newGames);

    // Load frames back into editor
    if (game.entryType === "detailed" && game.frames.length > 0) {
      setFrames(game.frames.map((f) => ({ ...f })));
      setCurrentFrame(1);
      setCurrentRoll(1);
      setStandingPins([]);
      setEntryMode("detailed");
    } else {
      setQuickScore(game.totalScore.toString());
      setEntryMode("quick");
    }
    setHistory([]);

    // Clear saved editor state
    editorStatesRef.current.delete(currentGameIndex);
  }

  function deleteCurrentGame() {
    const newGames = [...games];
    delete newGames[currentGameIndex];
    setGames(newGames);
    editorStatesRef.current.delete(currentGameIndex);
    resetGameState();
  }

  function switchToGame(gameIndex: number) {
    if (gameIndex === currentGameIndex) return;
    saveEditorState(currentGameIndex);
    setCurrentGameIndex(gameIndex);
    loadEditorState(gameIndex);
  }

  function handleStrike() {
    if (currentFrame <= 9) {
      const frame: FrameData = {
        frameNumber: currentFrame,
        roll1: 10,
        roll2: null,
        roll3: null,
        isStrike: true,
        isSpare: false,
        pinsRemaining: null,
        spareConverted: false,
      };
      const newFrames = upsertFrame(frames, frame);
      setFrames(newFrames);
      advanceFrame(newFrames);
    } else {
      handle10thFrameRoll(10);
    }
  }

  function handleSpare() {
    if (currentFrame <= 9) {
      const existingFrame = frames.find((f) => f.frameNumber === currentFrame);
      if (!existingFrame) return;

      const remaining =
        existingFrame.pinsRemaining?.length ?? 10 - existingFrame.roll1;
      const updatedFrame: FrameData = {
        ...existingFrame,
        roll2: remaining,
        isSpare: true,
        spareConverted: true,
      };
      const newFrames = frames.map((f) =>
        f.frameNumber === currentFrame ? updatedFrame : f,
      );
      setFrames(newFrames);
      advanceFrame(newFrames);
    } else {
      const existing = frames.find((f) => f.frameNumber === 10);
      if (!existing) return;
      const available = existing.isStrike
        ? 10
        : (existing.pinsRemaining?.length ?? 10 - existing.roll1);
      handle10thFrameRoll(available);
    }
  }

  function handleGutter() {
    saveHistory();
    if (currentFrame <= 9) {
      if (currentRoll === 1) {
        const frame: FrameData = {
          frameNumber: currentFrame,
          roll1: 0,
          roll2: null,
          roll3: null,
          isStrike: false,
          isSpare: false,
          pinsRemaining: getAllPins(),
          spareConverted: false,
        };
        setFrames(upsertFrame(frames, frame));
        setCurrentRoll(2);
        setStandingPins(getAllPins());
      } else {
        const existingFrame = frames.find(
          (f) => f.frameNumber === currentFrame,
        );
        if (!existingFrame) return;
        const updatedFrame: FrameData = {
          ...existingFrame,
          roll2: 0,
          isSpare: false,
          spareConverted: false,
        };
        const newFrames = frames.map((f) =>
          f.frameNumber === currentFrame ? updatedFrame : f,
        );
        setFrames(newFrames);
        advanceFrame(newFrames);
      }
    } else {
      handle10thFrameRoll(0);
    }
  }

  function handlePinToggle(pin: number) {
    setStandingPins((prev) =>
      prev.includes(pin) ? prev.filter((p) => p !== pin) : [...prev, pin],
    );
  }

  function confirmPinSelection() {
    saveHistory();
    if (currentFrame <= 9) {
      if (currentRoll === 1) {
        const knocked = 10 - standingPins.length;
        if (knocked === 10) {
          handleStrike();
          return;
        }
        const frame: FrameData = {
          frameNumber: currentFrame,
          roll1: knocked,
          roll2: null,
          roll3: null,
          isStrike: false,
          isSpare: false,
          pinsRemaining: [...standingPins],
          spareConverted: false,
        };
        setFrames(upsertFrame(frames, frame));
        setCurrentRoll(2);
        // standingPins keeps correct value — pins still standing for roll 2
      } else {
        const existingFrame = frames.find(
          (f) => f.frameNumber === currentFrame,
        );
        if (!existingFrame) return;

        const previousRemaining =
          existingFrame.pinsRemaining?.length ?? 10 - existingFrame.roll1;
        const roll2Pins = previousRemaining - standingPins.length;
        const isSpare = standingPins.length === 0;

        const updatedFrame: FrameData = {
          ...existingFrame,
          roll2: roll2Pins,
          isSpare,
          spareConverted: isSpare,
        };
        const newFrames = frames.map((f) =>
          f.frameNumber === currentFrame ? updatedFrame : f,
        );
        setFrames(newFrames);
        advanceFrame(newFrames);
      }
    } else {
      const existingFrame = frames.find((f) => f.frameNumber === 10);
      const avail = getAvailablePins();

      if (currentRoll === 1) {
        const knocked = 10 - standingPins.length;
        handle10thFrameRoll(knocked);
      } else if (currentRoll === 2) {
        if (existingFrame) {
          const knocked = avail.length - standingPins.length;
          handle10thFrameRoll(knocked);
        }
      } else {
        if (existingFrame) {
          const knocked = avail.length - standingPins.length;
          handle10thFrameRoll(knocked);
        }
      }
    }
  }

  function handle10thFrameRoll(pins: number) {
    const existing = frames.find((f) => f.frameNumber === 10);

    if (!existing) {
      const frame: FrameData = {
        frameNumber: 10,
        roll1: pins,
        roll2: null,
        roll3: null,
        isStrike: pins === 10,
        isSpare: false,
        pinsRemaining: pins === 10 ? null : [...standingPins],
        spareConverted: false,
      };
      setFrames(upsertFrame(frames, frame));
      setCurrentRoll(2);
      if (pins === 10) {
        setStandingPins([]);
      }
    } else if (existing.roll2 === null) {
      const isSpare = !existing.isStrike && existing.roll1 + pins === 10;
      const updatedFrame: FrameData = {
        ...existing,
        roll2: pins,
        isSpare,
        spareConverted: isSpare,
      };
      const newFrames = frames.map((f) =>
        f.frameNumber === 10 ? updatedFrame : f,
      );

      if (existing.isStrike || isSpare) {
        setFrames(newFrames);
        setCurrentRoll(3);
        if (pins === 10 || isSpare) {
          setStandingPins([]);
        }
      } else {
        setFrames(newFrames);
        completeCurrentGame(newFrames);
      }
    } else {
      const updatedFrame: FrameData = {
        ...existing,
        roll3: pins,
      };
      const newFrames = frames.map((f) =>
        f.frameNumber === 10 ? updatedFrame : f,
      );
      setFrames(newFrames);
      completeCurrentGame(newFrames);
    }
  }

  function advanceFrame(newFrames: FrameData[]) {
    const filledNumbers = new Set(newFrames.map((f) => f.frameNumber));

    // Find next empty frame after current
    for (let i = currentFrame + 1; i <= 10; i++) {
      if (!filledNumbers.has(i)) {
        setCurrentFrame(i);
        setCurrentRoll(1);
        setStandingPins([]);
        return;
      }
    }
    // Wrap around from start
    for (let i = 1; i < currentFrame; i++) {
      if (!filledNumbers.has(i)) {
        setCurrentFrame(i);
        setCurrentRoll(1);
        setStandingPins([]);
        return;
      }
    }

    // All 10 frames filled
    completeCurrentGame(newFrames);
  }

  function completeCurrentGame(completedFrames: FrameData[]) {
    const sorted = [...completedFrames].sort(
      (a, b) => a.frameNumber - b.frameNumber,
    );
    const scores = calculateFrameScores(sorted);
    const total = scores[scores.length - 1] ?? 0;

    const game: GameData = {
      entryType: "detailed",
      totalScore: total,
      frames: sorted,
    };

    // Update or insert game at current index
    const newGames = [...games];
    newGames[currentGameIndex] = game;
    setGames(newGames);

    // Save completed state
    editorStatesRef.current.set(currentGameIndex, {
      entryMode: "detailed",
      quickScore: "",
      frames: sorted,
      currentFrame: 10,
      currentRoll: 1,
      standingPins: [],
      history: [],
      isComplete: true,
      totalScore: total,
    });

    // Auto-advance to next incomplete game
    for (let i = 0; i < gameCount; i++) {
      if (!newGames[i]) {
        setCurrentGameIndex(i);
        loadEditorState(i);
        return;
      }
    }
  }

  function completeQuickGame() {
    const score = parseInt(quickScore);
    if (isNaN(score) || score < 0 || score > 300) return;

    const game: GameData = {
      entryType: "quick",
      totalScore: score,
      frames: [],
    };

    const newGames = [...games];
    newGames[currentGameIndex] = game;
    setGames(newGames);

    editorStatesRef.current.set(currentGameIndex, {
      entryMode: "quick",
      quickScore,
      frames: [],
      currentFrame: 1,
      currentRoll: 1,
      standingPins: [],
      history: [],
      isComplete: true,
      totalScore: score,
    });

    // Auto-advance to next incomplete game
    for (let i = 0; i < gameCount; i++) {
      if (!newGames[i]) {
        setCurrentGameIndex(i);
        loadEditorState(i);
        return;
      }
    }
  }

  async function saveSession() {
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const totalPins = games.reduce((sum, g) => sum + g.totalScore, 0);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: session, error: sessionError } = await (supabase as any)
      .from("sessions")
      .insert({
        user_id: user.id,
        session_date: new Date().toISOString().split("T")[0],
        venue: venue || null,
        event_label: eventLabel || null,
        game_count: games.length,
        total_pins: totalPins,
      })
      .select()
      .single();

    if (sessionError || !session) {
      setSaving(false);
      return;
    }

    for (let i = 0; i < games.length; i++) {
      const game = games[i];
      const clean =
        game.entryType === "detailed" ? isCleanGame(game.frames) : false;
      const strikes =
        game.entryType === "detailed" ? countStrikes(game.frames) : 0;
      const spares =
        game.entryType === "detailed" ? countSpares(game.frames) : 0;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: gameRow, error: gameError } = await (supabase as any)
        .from("games")
        .insert({
          session_id: (session as Record<string, string>).id,
          user_id: user.id,
          game_number: i + 1,
          total_score: game.totalScore,
          entry_type: game.entryType,
          is_clean: clean,
          strike_count: strikes,
          spare_count: spares,
        })
        .select()
        .single();

      if (gameError || !gameRow) continue;

      if (game.entryType === "detailed" && game.frames.length > 0) {
        const frameScores = calculateFrameScores(game.frames);
        const frameInserts = game.frames.map((f, fi) => ({
          game_id: (gameRow as Record<string, string>).id,
          frame_number: f.frameNumber,
          roll_1: f.roll1,
          roll_2: f.roll2,
          roll_3: f.roll3,
          is_strike: f.isStrike,
          is_spare: f.isSpare,
          pins_remaining: f.pinsRemaining,
          spare_converted: f.spareConverted,
          frame_score: frameScores[fi] ?? 0,
        }));

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from("frames").insert(frameInserts);
      }
    }

    setSaving(false);
    router.push("/dashboard");
    router.refresh();
  }

  // Warn before leaving mid-game
  const hasProgress =
    step === "game" && (frames.length > 0 || games.length > 0);
  useEffect(() => {
    if (!hasProgress) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasProgress]);

  const allGamesComplete = games.filter(Boolean).length === gameCount;
  const currentGameComplete = games[currentGameIndex] !== undefined;
  const sortedFrames = [...frames].sort(
    (a, b) => a.frameNumber - b.frameNumber,
  );
  const scores = calculateFrameScores(sortedFrames);
  const currentScore = scores[scores.length - 1] ?? 0;
  const maxPossible = calculateMaxPossible(sortedFrames);

  function getAvailablePins(): number[] {
    if (currentFrame <= 9) {
      if (currentRoll === 1) return getAllPins();
      const f = frames.find((fr) => fr.frameNumber === currentFrame);
      return f?.pinsRemaining ?? getAllPins();
    }
    const f10 = frames.find((fr) => fr.frameNumber === 10);
    if (!f10) return getAllPins();
    if (f10.roll2 === null) {
      if (f10.isStrike) return getAllPins();
      return f10.pinsRemaining ?? getAllPins();
    }
    if (f10.roll2 === 10 || f10.isSpare) return getAllPins();
    return getAllPins();
  }

  const availablePins = getAvailablePins();
  const isFreshRack = availablePins.length === 10;
  const showStrikeButton =
    isFreshRack && (currentRoll === 1 || currentFrame === 10);

  // SETUP STEP
  if (step === "setup") {
    return (
      <div>
        <h1 className="mb-6 text-xl font-extrabold">Log a Session</h1>

        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-xs text-text-muted">
              Venue (optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Orchid Bowl"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface-light px-4 py-3 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-blue"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-text-muted">
              Event (optional)
            </label>
            <div className="flex flex-wrap gap-2">
              {["League", "Practice", "Tournament", "Casual"].map((label) => (
                <button
                  key={label}
                  onClick={() =>
                    setEventLabel(eventLabel === label ? "" : label)
                  }
                  className={`rounded-lg px-4 py-2 text-sm transition-colors ${
                    eventLabel === label
                      ? "bg-blue text-white"
                      : "bg-surface-light text-text-secondary"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-text-muted">
              Number of games
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setGameCount(n)}
                  className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold transition-colors ${
                    gameCount === n
                      ? "bg-blue text-white"
                      : "bg-surface-light text-text-secondary"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={startSession}
            className="mt-4 rounded-xl bg-gradient-to-r from-blue to-blue-dark py-4 text-base font-bold shadow-lg shadow-blue/25"
          >
            Start Bowling
          </button>
        </div>
      </div>
    );
  }

  // ALL GAMES COMPLETE — REVIEW & SAVE
  if (allGamesComplete) {
    const totalPins = games.reduce((sum, g) => sum + g.totalScore, 0);
    const avg = Math.round(totalPins / games.length);

    return (
      <div>
        <h1 className="mb-2 text-xl font-extrabold">Session Complete</h1>
        <p className="mb-4 text-sm text-text-muted">
          {venue && `${venue} • `}
          {eventLabel && `${eventLabel} • `}
          {games.length} games
        </p>

        <div className="mb-4 flex gap-3">
          <div className="glass flex-1 p-4 text-center">
            <div className="text-xs text-text-muted">Total</div>
            <div className="text-2xl font-extrabold">{totalPins}</div>
          </div>
          <div className="glass flex-1 p-4 text-center">
            <div className="text-xs text-text-muted">Average</div>
            <div className="text-2xl font-extrabold">{avg}</div>
          </div>
        </div>

        <div className="mb-6 flex gap-2">
          {games.map((g, i) => {
            const isHigh =
              g.totalScore === Math.max(...games.map((x) => x.totalScore));
            const clean = g.entryType === "detailed" && isCleanGame(g.frames);

            return (
              <div
                key={i}
                className={`glass flex-1 p-3 text-center ${isHigh ? "border-gold/35" : ""} ${clean ? "border-green/35" : ""}`}
              >
                <div className="text-[9px] text-text-muted">G{i + 1}</div>
                <div
                  className={`text-base font-bold ${isHigh ? "text-gold" : clean ? "text-green" : ""}`}
                >
                  {g.totalScore}
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={saveSession}
          disabled={saving}
          className="w-full rounded-xl bg-gradient-to-r from-green to-emerald-600 py-4 text-base font-bold shadow-lg shadow-green/25 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Session"}
        </button>
      </div>
    );
  }

  // GAME ENTRY
  return (
    <div>
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={() => {
            const hasAnyProgress = frames.length > 0 || games.some(Boolean);
            if (
              hasAnyProgress &&
              !confirm("Leave this session? All progress will be lost.")
            )
              return;
            setStep("setup");
          }}
          className="text-text-muted"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-base font-bold">
          Game {currentGameIndex + 1} of {gameCount}
        </h1>
        <div className="w-5" />
      </div>

      {/* Game tabs */}
      {gameCount > 1 && (
        <div className="mb-3 flex gap-1">
          {Array.from({ length: gameCount }, (_, i) => {
            const isActive = i === currentGameIndex;
            const isDone = games[i] !== undefined;
            return (
              <button
                key={i}
                onClick={() => switchToGame(i)}
                className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-colors ${
                  isActive
                    ? "bg-blue text-white"
                    : isDone
                      ? "bg-green/15 text-green"
                      : "bg-surface-light text-text-muted"
                }`}
              >
                G{i + 1}
                {isDone && !isActive && (
                  <span className="ml-1 text-[10px]">
                    {games[i].totalScore}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Completed game view */}
      {currentGameComplete ? (
        <div className="flex flex-col gap-3">
          {games[currentGameIndex].entryType === "detailed" &&
          games[currentGameIndex].frames.length > 0 ? (
            <>
              <FrameScorecard
                frames={games[currentGameIndex].frames}
                currentFrame={0}
                currentRoll={1}
              />
              <FramePinDetail
                frames={games[currentGameIndex].frames.map((f) => ({
                  frame_number: f.frameNumber,
                  roll_1: f.roll1,
                  roll_2: f.roll2,
                  roll_3: f.roll3,
                  is_strike: f.isStrike,
                  is_spare: f.isSpare,
                  pins_remaining: f.pinsRemaining,
                  spare_converted: f.spareConverted,
                }))}
              />
            </>
          ) : null}

          <div className="glass p-4 text-center">
            <div className="text-xs text-text-muted">Final Score</div>
            <div className="text-3xl font-extrabold">
              {games[currentGameIndex].totalScore}
            </div>
            {games[currentGameIndex].entryType === "detailed" && (
              <div className="mt-1 text-[11px] text-text-muted">
                {countStrikes(games[currentGameIndex].frames)}X{" "}
                {countSpares(games[currentGameIndex].frames)}/{" "}
                {isCleanGame(games[currentGameIndex].frames) && (
                  <span className="font-semibold text-green">CLEAN</span>
                )}
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
                if (!confirm("Delete this game? You'll need to re-enter it."))
                  return;
                deleteCurrentGame();
              }}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red/10 py-3.5 text-sm font-bold text-red active:bg-red/20"
            >
              <Trash2 size={16} />
              Delete
            </button>
          </div>
        </div>
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
                  type="number"
                  min="0"
                  max="300"
                  value={quickScore}
                  onChange={(e) => setQuickScore(e.target.value)}
                  placeholder="0"
                  className="w-full bg-transparent text-center text-5xl font-extrabold outline-none placeholder:text-surface-light"
                />
              </div>
              <button
                onClick={completeQuickGame}
                disabled={
                  !quickScore ||
                  parseInt(quickScore) < 0 ||
                  parseInt(quickScore) > 300
                }
                className="rounded-xl bg-gradient-to-r from-blue to-blue-dark py-4 text-base font-bold shadow-lg shadow-blue/25 disabled:opacity-50"
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
                  <div className="text-xl font-extrabold">{currentScore}</div>
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
                    className="flex-1 rounded-xl bg-gradient-to-r from-green to-emerald-600 py-3.5 text-base font-extrabold tracking-wider text-white shadow-lg shadow-green/25"
                  >
                    STRIKE
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      saveHistory();
                      handleSpare();
                    }}
                    className="flex-1 rounded-xl bg-gradient-to-r from-gold to-amber-600 py-3.5 text-base font-extrabold tracking-wider text-white shadow-lg shadow-gold/25"
                  >
                    SPARE
                  </button>
                )}
                <button
                  onClick={confirmPinSelection}
                  className="flex-1 rounded-xl bg-gradient-to-r from-blue to-blue-dark py-3.5 text-base font-extrabold tracking-wider text-white shadow-lg shadow-blue/25"
                >
                  NEXT
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
