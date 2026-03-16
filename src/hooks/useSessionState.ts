"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { useToast } from "@/components/Toast";
import { useUnsavedGuard } from "@/components/UnsavedGuard";
import {
  calculateLP,
  getRank,
  getDivisionProgress,
  getEventWeight,
  CALIBRATION_GAMES,
  EVENT_LABELS,
  type RankTier,
} from "@/lib/ranking";
import {
  ACHIEVEMENTS,
  computeAchievementStats,
  detectNewAchievements,
  type AchievementDef,
} from "@/lib/achievements";

export type EntryMode = "quick" | "detailed";
export type Step = "setup" | "resume" | "game" | "results";

export interface GameData {
  entryType: EntryMode;
  totalScore: number;
  frames: FrameData[];
}

export interface GameEditorState {
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

export interface ResultsData {
  oldLp: number;
  newLp: number;
  oldRank: RankTier;
  newRank: RankTier;
  sessionAvg: number;
  sessionHigh: number;
  totalPins: number;
  gameScores: number[];
  rankChanged: boolean;
  isRankUp: boolean;
  isRankDown: boolean;
  unlockedAchievements: AchievementDef[];
  totalGamesAfter: number;
  gamesBefore: number;
  isNewPB: boolean;
}

export function upsertFrame(
  frames: FrameData[],
  frame: FrameData,
): FrameData[] {
  const without = frames.filter((f) => f.frameNumber !== frame.frameNumber);
  return [...without, frame].sort((a, b) => a.frameNumber - b.frameNumber);
}

export function useSessionState() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const { toast } = useToast();
  const { setHasUnsaved } = useUnsavedGuard();

  const [step, setStep] = useState<Step>("setup");
  const [venue, setVenue] = useState("");
  const [eventLabel, setEventLabel] = useState("");
  const [pastVenues, setPastVenues] = useState<string[]>([]);
  const [gameCount, setGameCount] = useState(4);

  const [currentGameIndex, setCurrentGameIndex] = useState(0);
  const [games, setGames] = useState<GameData[]>([]);
  const [entryMode, setEntryMode] = useState<EntryMode>("detailed");
  const [quickScore, setQuickScore] = useState("");

  const [frames, setFrames] = useState<FrameData[]>([]);
  const [currentFrame, setCurrentFrame] = useState(1);
  const [currentRoll, setCurrentRoll] = useState<1 | 2 | 3>(1);
  const [standingPins, setStandingPins] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);

  // Edit mode state
  const [editMode, setEditMode] = useState(false);
  const [editGameId, setEditGameId] = useState<string | null>(null);
  const [editSessionId, setEditSessionId] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editOriginalScore, setEditOriginalScore] = useState(0);
  const [editOriginalFrames, setEditOriginalFrames] = useState<FrameData[]>([]);

  // Results screen state
  const [resultsData, setResultsData] = useState<ResultsData | null>(null);

  const [history, setHistory] = useState<
    Array<{
      frames: FrameData[];
      currentFrame: number;
      currentRoll: 1 | 2 | 3;
      standingPins: number[];
    }>
  >([]);

  const editorStatesRef = useRef<Map<number, GameEditorState>>(new Map());
  const editInitialized = useRef(false);
  const restoredRef = useRef(false);

  const STORAGE_KEY = "spare-me-session";

  // Restore session from localStorage on mount
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;

    // Don't restore if editing an existing game
    const editGameParam = searchParams.get("editGame");
    if (editGameParam) return;

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const data = JSON.parse(saved);
      if (data.step !== "game") return; // Only restore active sessions

      // Show resume prompt — actual state restore happens in resumeSession()
      setStep("resume");
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [searchParams]);

  function resumeSession() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const data = JSON.parse(saved);

      setStep("game");
      setVenue(data.venue ?? "");
      setEventLabel(data.eventLabel ?? "");
      setGameCount(data.gameCount ?? 4);
      setCurrentGameIndex(data.currentGameIndex ?? 0);
      // JSON.stringify turns undefined array slots to null — restore properly
      const rawGames = data.games ?? [];
      const restoredGames: GameData[] = [];
      for (let i = 0; i < rawGames.length; i++) {
        if (rawGames[i]) {
          restoredGames[i] = rawGames[i];
        }
      }
      setGames(restoredGames);
      setEntryMode(data.entryMode ?? "detailed");
      setQuickScore(data.quickScore ?? "");
      setFrames(data.frames ?? []);
      setCurrentFrame(data.currentFrame ?? 1);
      setCurrentRoll(data.currentRoll ?? 1);
      setStandingPins(data.standingPins ?? []);
      if (data.editorStates) {
        const map = new Map<number, GameEditorState>(
          Object.entries(data.editorStates).map(([k, v]) => [
            Number(k),
            v as GameEditorState,
          ]),
        );
        editorStatesRef.current = map;
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      setStep("setup");
    }
  }

  // Auto-save session state to localStorage
  useEffect(() => {
    // Only save when actively in a game
    if (step !== "game" || editMode) return;

    const data = {
      step,
      venue,
      eventLabel,
      gameCount,
      currentGameIndex,
      games,
      entryMode,
      quickScore,
      frames,
      currentFrame,
      currentRoll,
      standingPins,
      editorStates: Object.fromEntries(editorStatesRef.current),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // localStorage full — silently fail, session still in memory
    }
  }, [
    step,
    venue,
    eventLabel,
    gameCount,
    currentGameIndex,
    games,
    entryMode,
    quickScore,
    frames,
    currentFrame,
    currentRoll,
    standingPins,
    editMode,
  ]);

  function clearSavedSession() {
    localStorage.removeItem(STORAGE_KEY);
  }

  function discardSession() {
    clearSavedSession();
    setStep("setup");
    setGames([]);
    setCurrentGameIndex(0);
    editorStatesRef.current.clear();
    setFrames([]);
    setCurrentFrame(1);
    setCurrentRoll(1);
    setStandingPins([]);
    setQuickScore("");
    setEntryMode("detailed");
    setHistory([]);
    setReviewMode(false);
  }

  // Load game for editing when ?editGame= param is present
  useEffect(() => {
    const editGameParam = searchParams.get("editGame");
    if (!editGameParam || editInitialized.current) return;
    editInitialized.current = true;

    setEditLoading(true);
    async function loadGameForEdit() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: game } = await (supabase as any)
        .from("games")
        .select("id, session_id, total_score, entry_type")
        .eq("id", editGameParam)
        .single();

      if (!game) {
        setEditLoading(false);
        return;
      }

      setEditMode(true);
      setEditGameId(game.id);
      setEditSessionId(game.session_id);
      setEditOriginalScore(game.total_score);

      if (game.entry_type === "detailed") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: dbFrames } = await (supabase as any)
          .from("frames")
          .select("*")
          .eq("game_id", game.id)
          .order("frame_number", { ascending: true });

        if (dbFrames && dbFrames.length > 0) {
          const loadedFrames: FrameData[] = dbFrames.map(
            (f: Record<string, unknown>) => ({
              frameNumber: f.frame_number as number,
              roll1: f.roll_1 as number,
              roll2: f.roll_2 as number | null,
              roll3: f.roll_3 as number | null,
              isStrike: f.is_strike as boolean,
              isSpare: f.is_spare as boolean,
              pinsRemaining: f.pins_remaining as number[] | null,
              pinsRemainingRoll2:
                (f.pins_remaining_roll2 as number[] | null) ?? null,
              spareConverted: f.spare_converted as boolean,
            }),
          );
          setFrames(loadedFrames);
          setEditOriginalFrames(loadedFrames.map((f) => ({ ...f })));
          setEntryMode("detailed");
        }
      } else {
        setQuickScore(game.total_score.toString());
        setEntryMode("quick");
      }

      setStep("game");
      setGameCount(1);
      setCurrentGameIndex(0);
      setEditLoading(false);
    }
    loadGameForEdit();
  }, [searchParams, supabase]);

  // Fetch past venues for quick selection
  useEffect(() => {
    async function loadVenues() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("sessions")
        .select("venue")
        .eq("user_id", user.id)
        .not("venue", "is", null)
        .order("created_at", { ascending: false });
      if (data) {
        const venues = (data as { venue: string }[])
          .map((d) => d.venue)
          .filter(Boolean);
        const unique = [...new Set(venues)];
        setPastVenues(unique);
        if (unique.length > 0 && !venue) {
          setVenue(unique[0]);
        }
      }
    }
    loadVenues();
  }, [supabase]);

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
    // Clear frame 10 when re-editing — it has multi-roll state that
    // handle10thFrameRoll checks incrementally (roll2 === null, etc.)
    if (frameNumber === 10) {
      newFrames = newFrames.filter((f) => f.frameNumber !== 10);
    }
    setFrames(newFrames);
    setCurrentFrame(frameNumber);

    // For frames 1-9 with existing data, show roll 1 with previous
    // pin state so the user can see/adjust what was entered before
    const targetData = newFrames.find((f) => f.frameNumber === frameNumber);
    setCurrentRoll(1);
    if (
      frameNumber <= 9 &&
      targetData &&
      !targetData.isStrike &&
      targetData.pinsRemaining
    ) {
      setStandingPins([...targetData.pinsRemaining]);
    } else {
      setStandingPins([]);
    }
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

  function haptic(pattern: number | number[]) {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }

  function handleStrike() {
    haptic([15, 50, 15]);
    if (currentFrame <= 9) {
      const frame: FrameData = {
        frameNumber: currentFrame,
        roll1: 10,
        roll2: null,
        roll3: null,
        isStrike: true,
        isSpare: false,
        pinsRemaining: null,
        pinsRemainingRoll2: null,
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
    haptic(10);
    if (currentFrame <= 9) {
      const existingFrame = frames.find((f) => f.frameNumber === currentFrame);
      if (!existingFrame) return;

      const remaining =
        existingFrame.pinsRemaining?.length ?? 10 - existingFrame.roll1;
      const updatedFrame: FrameData = {
        ...existingFrame,
        roll2: remaining,
        isSpare: true,
        pinsRemainingRoll2: [],
        spareConverted: true,
      };
      const newFrames = frames.map((f) =>
        f.frameNumber === currentFrame ? updatedFrame : f,
      );
      setFrames(newFrames);
      advanceFrame(newFrames);
    } else {
      const avail = getAvailablePins();
      handle10thFrameRoll(avail.length);
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
          pinsRemainingRoll2: null,
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
          pinsRemainingRoll2: existingFrame.pinsRemaining
            ? [...existingFrame.pinsRemaining]
            : null,
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
    haptic(5);
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
          pinsRemainingRoll2: null,
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
          pinsRemainingRoll2: isSpare ? [] : [...standingPins],
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
      // Roll 1 of 10th frame
      const isStrike = pins === 10;
      const frame: FrameData = {
        frameNumber: 10,
        roll1: pins,
        roll2: null,
        roll3: null,
        isStrike,
        isSpare: false,
        pinsRemaining: isStrike
          ? null
          : standingPins.length > 0
            ? [...standingPins]
            : getAllPins(),
        pinsRemainingRoll2: null,
        spareConverted: false,
      };
      setFrames(upsertFrame(frames, frame));
      setCurrentRoll(2);
      // After a strike, reset pins for roll 2 (empty = fresh rack to bowl)
      if (isStrike) {
        setStandingPins([]);
      }
    } else if (existing.roll2 === null) {
      // Roll 2 of 10th frame
      const isSpare = !existing.isStrike && existing.roll1 + pins === 10;
      // Store remaining pins after roll 2
      const roll2Pins =
        standingPins.length > 0
          ? [...standingPins]
          : pins === 10
            ? []
            : getAllPins();
      const updatedFrame: FrameData = {
        ...existing,
        roll2: pins,
        isSpare,
        spareConverted: isSpare,
        // For strike+non-strike, update pinsRemaining with roll 2 state for getAvailablePins
        pinsRemaining:
          existing.isStrike && pins < 10 ? roll2Pins : existing.pinsRemaining,
        pinsRemainingRoll2: isSpare ? [] : pins === 10 ? null : roll2Pins,
      };
      const newFrames = frames.map((f) =>
        f.frameNumber === 10 ? updatedFrame : f,
      );

      if (existing.isStrike || isSpare) {
        // Gets a 3rd roll
        setFrames(newFrames);
        setCurrentRoll(3);
        // Fresh rack only if: double strike or spare. Otherwise keep remaining pins.
        if ((existing.isStrike && pins === 10) || isSpare) {
          setStandingPins([]);
        }
        // else: standingPins already has the remaining pins from roll 2
      } else {
        // No 3rd roll — game over
        setFrames(newFrames);
        if (editMode) {
          setCurrentRoll(1);
          setStandingPins(getAllPins());
        } else {
          completeCurrentGame(newFrames);
        }
      }
    } else {
      // Roll 3 of 10th frame
      const updatedFrame: FrameData = {
        ...existing,
        roll3: pins,
      };
      const newFrames = frames.map((f) =>
        f.frameNumber === 10 ? updatedFrame : f,
      );
      setFrames(newFrames);
      if (editMode) {
        setCurrentRoll(1);
        setStandingPins(getAllPins());
      } else {
        completeCurrentGame(newFrames);
      }
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
    if (editMode) {
      // In edit mode, stay in editor — don't auto-complete
      setCurrentRoll(1);
      setStandingPins([]);
      return;
    }
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

    // Stay on completed game view — user taps "Next Game" manually
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

    // Stay on current game so user can review/edit
  }

  const savingRef = useRef(false);

  async function saveSession() {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      savingRef.current = false;
      toast("Not logged in — please sign in again", "error");
      return;
    }

    // Parallel: get profile name + existing games at once
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [profileResult, gamesResult] = await Promise.all([
      (supabase as any)
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .single(),
      (supabase as any)
        .from("games")
        .select(
          "id, total_score, is_clean, strike_count, spare_count, session_id, sessions(event_label)",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
    ]);
    const playerName = profileResult.data?.display_name ?? "Someone";
    const existingGames = gamesResult.data;

    const existingGameIds =
      existingGames?.map((g: { id: string }) => g.id) ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingFrames } = await (supabase as any)
      .from("frames")
      .select("game_id, is_strike, is_spare, spare_converted, pins_remaining")
      .in("game_id", existingGameIds.length > 0 ? existingGameIds : ["none"])
      .order("frame_number", { ascending: true });

    const oldAchievementStats = computeAchievementStats(
      existingGames ?? [],
      existingFrames ?? [],
      existingGameIds,
    );

    const oldScores =
      existingGames?.map((g: { total_score: number }) => g.total_score) ?? [];
    const oldWeights =
      existingGames?.map(
        (g: { sessions: { event_label: string | null } | null }) =>
          getEventWeight(g.sessions?.event_label ?? null),
      ) ?? [];
    const oldLp = calculateLP(oldScores, oldWeights);
    const oldRank = getRank(oldLp);

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
      savingRef.current = false;
      toast("Failed to save session", "error");
      return;
    }

    // Batch insert all games at once
    const gameInserts = games.map((game, i) => ({
      session_id: (session as Record<string, string>).id,
      user_id: user.id,
      game_number: i + 1,
      total_score: game.totalScore,
      entry_type: game.entryType,
      is_clean:
        game.entryType === "detailed" ? isCleanGame(game.frames) : false,
      strike_count:
        game.entryType === "detailed" ? countStrikes(game.frames) : 0,
      spare_count: game.entryType === "detailed" ? countSpares(game.frames) : 0,
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: gameRows, error: gameError } = await (supabase as any)
      .from("games")
      .insert(gameInserts)
      .select();

    if (gameError || !gameRows || gameRows.length === 0) {
      setSaving(false);
      savingRef.current = false;
      toast("Failed to save games — please try again", "error");
      return;
    }

    // Batch insert all frames at once
    const allFrameInserts: Record<string, unknown>[] = [];
    for (let i = 0; i < games.length; i++) {
      const game = games[i];
      const gameRow = (gameRows as Record<string, string>[])[i];
      if (game.entryType === "detailed" && game.frames.length > 0 && gameRow) {
        const frameScores = calculateFrameScores(game.frames);
        for (let fi = 0; fi < game.frames.length; fi++) {
          const f = game.frames[fi];
          allFrameInserts.push({
            game_id: gameRow.id,
            frame_number: f.frameNumber,
            roll_1: f.roll1,
            roll_2: f.roll2,
            roll_3: f.roll3,
            is_strike: f.isStrike,
            is_spare: f.isSpare,
            pins_remaining: f.pinsRemaining,
            pins_remaining_roll2: f.pinsRemainingRoll2,
            spare_converted: f.spareConverted,
            frame_score: frameScores[fi] ?? 0,
          });
        }
      }
    }

    if (allFrameInserts.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from("frames").insert(allFrameInserts);
    }

    // Calculate new LP after save
    const newEventWeight = getEventWeight(eventLabel || null);
    const newScores = [...games.map((g) => g.totalScore), ...oldScores];
    const newWeights = [...games.map(() => newEventWeight), ...oldWeights];
    const newLp = calculateLP(newScores, newWeights);
    const newRank = getRank(newLp);

    const gameScores = games.map((g) => g.totalScore);
    const sessionAvg = Math.round(
      gameScores.reduce((s, v) => s + v, 0) / gameScores.length,
    );
    const sessionHigh = Math.max(...gameScores);
    const previousHigh = oldScores.length > 0 ? Math.max(...oldScores) : 0;
    const isNewPB = sessionHigh > previousHigh && previousHigh > 0;

    const rankChanged =
      newRank.name !== oldRank.name ||
      (newRank.division ?? "") !== (oldRank.division ?? "");
    const isRankUp = rankChanged && newLp > oldLp;
    const isRankDown = rankChanged && newLp < oldLp;

    // Detect newly unlocked achievements
    const sessionId = (session as Record<string, string>).id;
    const newGameRecords = games.map((g, i) => ({
      total_score: g.totalScore,
      is_clean: g.entryType === "detailed" ? isCleanGame(g.frames) : false,
      strike_count: g.entryType === "detailed" ? countStrikes(g.frames) : 0,
      spare_count: g.entryType === "detailed" ? countSpares(g.frames) : 0,
      session_id: sessionId,
    }));
    const newFrameRecords = games.flatMap((g, i) => {
      if (g.entryType !== "detailed") return [];
      const gameId = `new-${i}`;
      return g.frames.map((f) => ({
        game_id: gameId,
        is_strike: f.isStrike,
        is_spare: f.isSpare,
        spare_converted: f.spareConverted,
        pins_remaining: f.pinsRemaining,
      }));
    });
    const allGames = [...newGameRecords, ...(existingGames ?? [])];
    const allFrames = [...newFrameRecords, ...(existingFrames ?? [])];
    const newAchievementStats = computeAchievementStats(allGames, allFrames, [
      ...games.map((_, i) => `new-${i}`),
      ...existingGameIds,
    ]);
    const unlockedAchievements = detectNewAchievements(
      oldAchievementStats,
      newAchievementStats,
    );

    // Send push notification to other users (fire and forget)
    const has149 = gameScores.includes(149);
    const notifTitle = has149 ? "149 Club!" : isNewPB ? "New PB!" : "Spare Me?";
    const notifBody = has149
      ? `${playerName} just bowled a 149. uh oh.`
      : isNewPB
        ? `${playerName} just hit ${sessionHigh} — a new personal best!`
        : `${playerName} just bowled! Avg: ${sessionAvg} across ${games.length} game${games.length !== 1 ? "s" : ""}`;
    fetch("/api/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: notifTitle,
        body: notifBody,
        url: "/dashboard",
      }),
    }).catch(() => {});

    setSaving(false);
    savingRef.current = false;
    setHasUnsaved(false);
    const gamesBefore = oldScores.length;
    const totalGamesAfter = gamesBefore + games.length;
    setResultsData({
      oldLp,
      newLp,
      oldRank,
      newRank,
      sessionAvg,
      sessionHigh,
      totalPins,
      gameScores,
      rankChanged,
      isRankUp,
      isRankDown,
      unlockedAchievements,
      totalGamesAfter,
      gamesBefore,
      isNewPB,
    });
    clearSavedSession();
    setStep("results");
  }

  async function updateExistingGame() {
    if (!editGameId || !editSessionId) return;
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);

    // Build game from current editor state if not already completed
    const currentSorted = [...frames].sort(
      (a, b) => a.frameNumber - b.frameNumber,
    );
    const currentScores = calculateFrameScores(currentSorted);
    const game: GameData = games[0] ?? {
      entryType: entryMode,
      totalScore: currentScores[currentScores.length - 1] ?? 0,
      frames: currentSorted,
    };

    const clean =
      game.entryType === "detailed" ? isCleanGame(game.frames) : false;
    const strikes =
      game.entryType === "detailed" ? countStrikes(game.frames) : 0;
    const spares = game.entryType === "detailed" ? countSpares(game.frames) : 0;

    // Get old score for session total diff
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: oldGame } = await (supabase as any)
      .from("games")
      .select("total_score")
      .eq("id", editGameId)
      .single();

    const oldScore = oldGame?.total_score ?? 0;
    const diff = game.totalScore - oldScore;

    // Update game record
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("games")
      .update({
        total_score: game.totalScore,
        entry_type: game.entryType,
        is_clean: clean,
        strike_count: strikes,
        spare_count: spares,
      })
      .eq("id", editGameId);

    // Update session total_pins
    if (diff !== 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: session } = await (supabase as any)
        .from("sessions")
        .select("total_pins")
        .eq("id", editSessionId)
        .single();

      if (session) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from("sessions")
          .update({ total_pins: session.total_pins + diff })
          .eq("id", editSessionId);
      }
    }

    // Replace frames
    if (game.entryType === "detailed" && game.frames.length > 0) {
      // Delete old frames
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from("frames").delete().eq("game_id", editGameId);

      // Insert new frames
      const frameScores = calculateFrameScores(game.frames);
      const frameInserts = game.frames.map((f, fi) => ({
        game_id: editGameId,
        frame_number: f.frameNumber,
        roll_1: f.roll1,
        roll_2: f.roll2,
        roll_3: f.roll3,
        is_strike: f.isStrike,
        is_spare: f.isSpare,
        pins_remaining: f.pinsRemaining,
        pins_remaining_roll2: f.pinsRemainingRoll2,
        spare_converted: f.spareConverted,
        frame_score: frameScores[fi] ?? 0,
      }));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from("frames").insert(frameInserts);
    }

    setSaving(false);
    savingRef.current = false;
    setHasUnsaved(false);
    toast("Game updated");
    router.back();
    router.refresh();
  }

  // Keep beforeunload for browser tab close (auto-save handles in-app nav)
  const hasProgress =
    step === "game" && !saving && (frames.length > 0 || games.length > 0);
  useEffect(() => {
    if (!hasProgress) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasProgress]);

  const allGamesComplete =
    games.filter(Boolean).length === gameCount && !reviewMode;
  const currentGameComplete = games[currentGameIndex] !== undefined;
  const sortedFrames = [...frames].sort(
    (a, b) => a.frameNumber - b.frameNumber,
  );
  const frameScores = calculateFrameScores(sortedFrames);
  const currentScore = frameScores[frameScores.length - 1] ?? 0;
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
    // Strike on roll 1 + non-strike roll 2: remaining pins from roll 2
    if (f10.isStrike && f10.roll2 !== null && f10.roll2 < 10) {
      // Pins remaining = 10 - roll2 pins knocked
      return f10.pinsRemaining ?? getAllPins();
    }
    return getAllPins();
  }

  const availablePins = getAvailablePins();
  const isFreshRack = availablePins.length === 10;
  const showStrikeButton =
    isFreshRack && (currentRoll === 1 || currentFrame === 10);

  // Tab info: score or in-progress indicator for each game
  function getGameTabScore(index: number): {
    score: number;
    inProgress: boolean;
  } {
    if (games[index] !== undefined) {
      return { score: games[index].totalScore, inProgress: false };
    }
    if (index === currentGameIndex && frames.length > 0) {
      return { score: currentScore, inProgress: true };
    }
    const saved = editorStatesRef.current.get(index);
    if (saved && saved.frames.length > 0) {
      const savedScores = calculateFrameScores(
        [...saved.frames].sort((a, b) => a.frameNumber - b.frameNumber),
      );
      return {
        score: savedScores[savedScores.length - 1] ?? 0,
        inProgress: true,
      };
    }
    return { score: 0, inProgress: false };
  }

  return {
    // Navigation
    router,

    // Step state
    step,
    setStep,

    // Setup state
    venue,
    setVenue,
    eventLabel,
    setEventLabel,
    pastVenues,
    gameCount,
    setGameCount,

    // Game state
    currentGameIndex,
    games,
    setGames,
    entryMode,
    setEntryMode,
    quickScore,
    setQuickScore,

    // Frame state
    frames,
    currentFrame,
    currentRoll,
    standingPins,
    saving,
    reviewMode,
    setReviewMode,

    // Edit mode state
    editMode,
    editGameId,
    editSessionId,
    editLoading,
    editOriginalScore,
    editOriginalFrames,

    // Results
    resultsData,

    // History
    history,

    // Session persistence
    resumeSession,
    discardSession,
    clearSavedSession,

    // Actions
    saveHistory,
    handleUndo,
    handleFrameTap,
    startSession,
    resetGameState,
    saveEditorState,
    loadEditorState,
    editCurrentGame,
    deleteCurrentGame,
    switchToGame,
    haptic,
    handleStrike,
    handleSpare,
    handleGutter,
    handlePinToggle,
    confirmPinSelection,
    handle10thFrameRoll,
    advanceFrame,
    completeCurrentGame,
    completeQuickGame,
    saveSession,
    updateExistingGame,
    getAvailablePins,

    // Derived state
    sortedFrames,
    frameScores,
    currentScore,
    maxPossible,
    currentGameComplete,
    allGamesComplete,
    availablePins,
    isFreshRack,
    showStrikeButton,

    // Tab info
    getGameTabScore,

    // Unsaved guard
    setHasUnsaved,
  };
}
