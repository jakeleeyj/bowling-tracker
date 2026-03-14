"use client";

import { Suspense, useState, useEffect, useRef } from "react";
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
import PinDiagram from "@/components/PinDiagram";
import FrameScorecard from "@/components/FrameScorecard";
import FramePinDetail from "@/components/FramePinDetail";
import {
  ArrowLeft,
  Check,
  Undo2,
  Pencil,
  Trash2,
  Trophy,
  Zap,
  Sparkles,
  Flame,
  Target,
  Crown,
  Award,
} from "lucide-react";
import { useToast } from "@/components/Toast";
import { useUnsavedGuard } from "@/components/UnsavedGuard";
import {
  calculateMMR,
  getRank,
  getDivisionProgress,
  getEventWeight,
  CALIBRATION_GAMES,
  type RankTier,
} from "@/lib/ranking";
import {
  ACHIEVEMENTS,
  computeAchievementStats,
  detectNewAchievements,
  type AchievementDef,
} from "@/lib/achievements";

type EntryMode = "quick" | "detailed";
type Step = "setup" | "game" | "results";

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

function AnimatedCounter({
  from,
  to,
  duration = 1200,
}: {
  from: number;
  to: number;
  duration?: number;
}) {
  const [value, setValue] = useState(from);
  useEffect(() => {
    const start = performance.now();
    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(from + (to - from) * eased));
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [from, to, duration]);
  return <>{value}</>;
}

function RankEmblem({
  rank,
  size = 80,
  className = "",
}: {
  rank: RankTier;
  size?: number;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2L3 7v5c0 5.25 3.83 10.15 9 11.25C17.17 22.15 21 17.25 21 12V7L12 2z"
          fill="currentColor"
          fillOpacity={0.15}
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinejoin="round"
          className={rank.color}
        />
        <path
          d="M12 7l3 5-3 5-3-5z"
          fill="currentColor"
          fillOpacity={0.4}
          stroke="currentColor"
          strokeWidth={0.75}
          className={rank.color}
        />
      </svg>
    </div>
  );
}

const RESULTS_ICON_MAP: Record<string, React.ReactNode> = {
  Trophy: <Trophy size={24} />,
  Zap: <Zap size={24} />,
  Sparkles: <Sparkles size={24} />,
  Flame: <Flame size={24} />,
  Target: <Target size={24} />,
  Crown: <Crown size={24} />,
  Award: <Award size={24} />,
};

function ResultsScreen({
  data,
}: {
  data: {
    oldMmr: number;
    newMmr: number;
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
  };
}) {
  const isCalibrating = data.totalGamesAfter < CALIBRATION_GAMES;
  const wasCalibrating = data.gamesBefore < CALIBRATION_GAMES;
  const justCalibrated = !isCalibrating && wasCalibrating;

  const [showRankChange, setShowRankChange] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const mmrDiff = data.newMmr - data.oldMmr;
  const displayRank =
    data.rankChanged && !showRankChange ? data.oldRank : data.newRank;
  const progress = getDivisionProgress(data.newMmr);

  useEffect(() => {
    if (data.rankChanged && !wasCalibrating) {
      const timer = setTimeout(() => setShowRankChange(true), 1400);
      return () => clearTimeout(timer);
    }
  }, [data.rankChanged, wasCalibrating]);

  useEffect(() => {
    if (data.unlockedAchievements.length > 0) {
      const delay = data.rankChanged && !wasCalibrating ? 2400 : 1600;
      const timer = setTimeout(() => setShowAchievements(true), delay);
      return () => clearTimeout(timer);
    }
  }, [data.unlockedAchievements.length, data.rankChanged, wasCalibrating]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
      {/* Rank emblem — scales in */}
      <div className="animate-results-emblem mb-4">
        <RankEmblem
          rank={isCalibrating ? getRank(0) : data.newRank}
          size={96}
        />
      </div>

      {isCalibrating ? (
        <>
          {/* Calibrating state */}
          <div className="animate-results-fade mb-1">
            <span className="text-2xl font-extrabold text-text-muted">
              Calibrating
            </span>
          </div>
          <div className="animate-results-fade mb-6 mt-1">
            <p className="text-sm text-text-muted">
              {CALIBRATION_GAMES - data.totalGamesAfter} more game
              {CALIBRATION_GAMES - data.totalGamesAfter !== 1 ? "s" : ""} to set
              your rank
            </p>
            <div className="mx-auto mt-3 flex w-full max-w-[120px] gap-1.5">
              {Array.from({ length: CALIBRATION_GAMES }, (_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full ${
                    i < data.totalGamesAfter ? "bg-blue" : "bg-surface-light"
                  }`}
                />
              ))}
            </div>
          </div>
        </>
      ) : justCalibrated ? (
        <>
          {/* Just finished calibration — reveal rank */}
          <div className="animate-results-fade mb-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
              Calibration Complete
            </span>
          </div>
          <div className="animate-results-flash mb-1">
            <span className={`text-2xl font-extrabold ${data.newRank.color}`}>
              {data.newRank.name}
              {data.newRank.division ? ` ${data.newRank.division}` : ""}
            </span>
          </div>
          <div className="animate-results-fade mb-1 w-full max-w-[200px]">
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-light">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue to-green"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between text-[9px] text-text-muted">
              <span>{data.newRank.division ?? data.newRank.name}</span>
              <span>{progress}%</span>
            </div>
          </div>
          <div className="animate-results-fade mb-6 mt-3">
            <div className="text-4xl font-extrabold tabular-nums text-text-primary">
              <AnimatedCounter from={0} to={data.newMmr} />
              <span className="text-lg text-text-muted"> MMR</span>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Normal ranked state */}
          <div className="animate-results-fade mb-1">
            <span className={`text-2xl font-extrabold ${displayRank.color}`}>
              {displayRank.name}
              {displayRank.division ? ` ${displayRank.division}` : ""}
            </span>
          </div>

          {/* Rank change flash */}
          {data.rankChanged && showRankChange && (
            <div className="animate-results-flash mb-2">
              <span
                className={`text-sm font-bold ${data.isRankUp ? "text-gold" : "text-red"}`}
              >
                {data.isRankUp
                  ? data.newRank.name !== data.oldRank.name
                    ? "RANK UP!"
                    : "DIVISION UP!"
                  : data.newRank.name !== data.oldRank.name
                    ? "RANK DOWN"
                    : "DIVISION DOWN"}
              </span>
            </div>
          )}

          {/* Progress bar */}
          <div className="animate-results-fade mb-1 w-full max-w-[200px]">
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-light">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  mmrDiff >= 0
                    ? "bg-gradient-to-r from-blue to-green"
                    : "bg-gradient-to-r from-red to-gold"
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between text-[9px] text-text-muted">
              <span>{displayRank.division ?? displayRank.name}</span>
              <span>{progress}%</span>
            </div>
          </div>

          {/* MMR counter */}
          <div className="animate-results-fade mb-6 mt-3">
            <div className="text-4xl font-extrabold tabular-nums text-text-primary">
              <AnimatedCounter from={data.oldMmr} to={data.newMmr} />
              <span className="text-lg text-text-muted"> MMR</span>
            </div>
            <div
              className={`mt-1 text-sm font-semibold ${mmrDiff > 0 ? "text-green" : mmrDiff < 0 ? "text-red" : "text-text-muted"}`}
            >
              {mmrDiff > 0 ? "+" : ""}
              {mmrDiff} MMR
            </div>
          </div>
        </>
      )}

      {/* Achievement unlocks */}
      {showAchievements && data.unlockedAchievements.length > 0 && (
        <div className="animate-results-fade mb-6 w-full max-w-[300px]">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gold">
            Achievement Unlocked!
          </p>
          <div className="flex flex-col gap-2">
            {data.unlockedAchievements.map((a) => (
              <div
                key={a.id}
                className={`animate-results-flash flex items-center gap-3 rounded-xl ${a.bgColor} px-4 py-3`}
              >
                <span className={a.color}>{RESULTS_ICON_MAP[a.iconName]}</span>
                <div className="text-left">
                  <p className="text-sm font-bold">{a.name}</p>
                  <p className="text-[10px] text-text-muted">{a.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Session stats */}
      <div className="mb-6 flex w-full max-w-[300px] gap-2">
        <div className="glass flex-1 p-3 text-center">
          <div className="text-[10px] uppercase text-text-muted">Avg</div>
          <div className="text-lg font-extrabold">{data.sessionAvg}</div>
        </div>
        <div className="glass flex-1 p-3 text-center">
          <div className="text-[10px] uppercase text-text-muted">High</div>
          <div className="text-lg font-extrabold">{data.sessionHigh}</div>
        </div>
        <div className="glass flex-1 p-3 text-center">
          <div className="text-[10px] uppercase text-text-muted">Total</div>
          <div className="text-lg font-extrabold">{data.totalPins}</div>
        </div>
      </div>

      {/* Game scores */}
      <div className="mb-8 flex justify-center gap-2">
        {data.gameScores.map((score, i) => (
          <div key={i} className="glass w-14 p-2 text-center">
            <div className="text-[9px] text-text-muted">G{i + 1}</div>
            <div className="text-sm font-bold text-text-primary">{score}</div>
          </div>
        ))}
      </div>

      {/* Continue button */}
      <button
        onClick={() => {
          window.location.href = "/dashboard";
        }}
        className="w-full max-w-[300px] rounded-xl bg-gradient-to-r from-blue to-blue-dark py-4 text-base font-bold shadow-lg shadow-blue/25 active:scale-[0.97]"
      >
        Continue
      </button>
    </div>
  );
}

export default function LogPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center text-sm text-text-muted">
          Loading...
        </div>
      }
    >
      <LogPage />
    </Suspense>
  );
}

function LogPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const { toast } = useToast();
  const { setHasUnsaved } = useUnsavedGuard();

  const [step, setStep] = useState<Step>("setup");
  const [venue, setVenue] = useState("");
  const [eventLabel, setEventLabel] = useState("");
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
  const [resultsData, setResultsData] = useState<{
    oldMmr: number;
    newMmr: number;
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
  } | null>(null);

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
    const tappedFrame = newFrames.find((f) => f.frameNumber === frameNumber);
    // Remove tapped frame (will be re-entered)
    newFrames = newFrames.filter((f) => f.frameNumber !== frameNumber);
    setFrames(newFrames);
    setCurrentFrame(frameNumber);

    // If the tapped frame had data, load its pin state so user can adjust
    if (tappedFrame && tappedFrame.roll1 !== null) {
      if (tappedFrame.isStrike) {
        // Strike — start fresh on roll 1
        setCurrentRoll(1);
        setStandingPins([]);
      } else {
        // Non-strike — go to roll 2 with the pins that were left after roll 1
        const allPins = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        const knocked = tappedFrame.roll1;
        const remaining =
          tappedFrame.pinsRemaining && tappedFrame.pinsRemaining.length > 0
            ? tappedFrame.pinsRemaining
            : allPins.slice(allPins.length - (10 - knocked));
        setCurrentRoll(2);
        setStandingPins(remaining);
      }
    } else {
      setCurrentRoll(1);
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
    const currentHasProgress = frames.length > 0 && !games[currentGameIndex];
    if (
      currentHasProgress &&
      !confirm("Switch games? Your progress on this game will be saved.")
    )
      return;
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
        if (editMode) {
          setCurrentRoll(1);
          setStandingPins([]);
        } else {
          completeCurrentGame(newFrames);
        }
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
      if (editMode) {
        setCurrentRoll(1);
        setStandingPins([]);
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

    // Stay on current game so user can review/edit
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

  async function saveSession() {
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Snapshot MMR + achievements before save
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingGames } = await (supabase as any)
      .from("games")
      .select(
        "id, total_score, is_clean, strike_count, spare_count, session_id, sessions(event_label)",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    const existingGameIds =
      existingGames?.map((g: { id: string }) => g.id) ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingFrames } = await (supabase as any)
      .from("frames")
      .select("game_id, is_strike, spare_converted")
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
    const oldMmr = calculateMMR(oldScores, oldWeights);
    const oldRank = getRank(oldMmr);

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
      toast("Failed to save session", "error");
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

    // Calculate new MMR after save
    const newEventWeight = getEventWeight(eventLabel || null);
    const newScores = [...games.map((g) => g.totalScore), ...oldScores];
    const newWeights = [...games.map(() => newEventWeight), ...oldWeights];
    const newMmr = calculateMMR(newScores, newWeights);
    const newRank = getRank(newMmr);

    const gameScores = games.map((g) => g.totalScore);
    const sessionAvg = Math.round(
      gameScores.reduce((s, v) => s + v, 0) / gameScores.length,
    );
    const sessionHigh = Math.max(...gameScores);

    const rankChanged =
      newRank.name !== oldRank.name ||
      (newRank.division ?? "") !== (oldRank.division ?? "");
    const isRankUp = rankChanged && newMmr > oldMmr;
    const isRankDown = rankChanged && newMmr < oldMmr;

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
        spare_converted: f.spareConverted,
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
    fetch("/api/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Spare Me?",
        body: `Someone just bowled! Avg: ${sessionAvg} across ${games.length} game${games.length !== 1 ? "s" : ""}`,
        url: "/dashboard",
      }),
    }).catch(() => {});

    setSaving(false);
    setHasUnsaved(false);
    const gamesBefore = oldScores.length;
    const totalGamesAfter = gamesBefore + games.length;
    setResultsData({
      oldMmr,
      newMmr,
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
    });
    setStep("results");
  }

  async function updateExistingGame() {
    if (!editGameId || !editSessionId) return;
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
        spare_converted: f.spareConverted,
        frame_score: frameScores[fi] ?? 0,
      }));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from("frames").insert(frameInserts);
    }

    setSaving(false);
    setHasUnsaved(false);
    toast("Game updated");
    router.back();
    router.refresh();
  }

  // Warn before leaving mid-game
  const hasProgress =
    step === "game" && !saving && (frames.length > 0 || games.length > 0);
  useEffect(() => {
    setHasUnsaved(hasProgress);
    if (!hasProgress) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasProgress, setHasUnsaved]);

  const allGamesComplete =
    games.filter(Boolean).length === gameCount && !reviewMode;
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

  // LOADING EDIT DATA
  if (editLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="text-sm text-text-muted">Loading game...</div>
      </div>
    );
  }

  // RESULTS SCREEN
  if (step === "results" && resultsData) {
    return <ResultsScreen data={resultsData} />;
  }

  // SETUP STEP
  if (step === "setup") {
    return (
      <div>
        <h1 className="mb-6 text-xl font-extrabold text-text-primary">
          Log a Session
        </h1>

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
              className="w-full rounded-lg border border-border bg-surface-light px-4 py-3 text-base text-text-primary outline-none placeholder:text-text-muted focus:border-blue"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-text-muted">
              Event (optional)
            </label>
            <div className="flex flex-wrap gap-2">
              {["League", "Tournament", "Casual", "Funbowl"].map((label) => (
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
              {[1, 2, 3, 4, 5, 6].map((n) => (
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
            className="mt-4 rounded-xl bg-gradient-to-r from-blue to-blue-dark py-4 text-base font-bold shadow-lg shadow-blue/25 transition-transform duration-150 active:scale-[0.97]"
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
        <div className="mb-3 flex items-center justify-between">
          <button
            onClick={() => setReviewMode(true)}
            className="text-text-muted"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-base font-bold text-text-primary">
            Session Complete
          </h1>
          <div className="w-5" />
        </div>
        <p className="mb-4 text-sm text-text-muted">
          {venue && `${venue} • `}
          {eventLabel && `${eventLabel} • `}
          {games.length} games
        </p>

        <div className="mb-4 flex gap-3">
          <div className="glass flex-1 p-4 text-center">
            <div className="text-xs text-text-muted">Total</div>
            <div className="text-2xl font-extrabold text-text-primary">
              {totalPins}
            </div>
          </div>
          <div className="glass flex-1 p-4 text-center">
            <div className="text-xs text-text-muted">Average</div>
            <div className="text-2xl font-extrabold text-text-primary">
              {avg}
            </div>
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
                  className={`text-base font-bold ${isHigh ? "text-gold" : clean ? "text-green" : "text-text-primary"}`}
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
            if (editMode) {
              if (!confirm("Discard changes?")) return;
              setHasUnsaved(false);
              router.back();
              return;
            }
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
        <h1 className="text-base font-bold text-text-primary">
          {editMode
            ? "Edit Game"
            : `Game ${currentGameIndex + 1} of ${gameCount}`}
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
          <button
            onClick={() => setGameCount((c) => c + 1)}
            className="flex h-auto w-8 shrink-0 items-center justify-center rounded-lg bg-surface-light text-sm font-bold text-text-muted active:scale-95"
          >
            +
          </button>
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
            <div className="text-3xl font-extrabold text-text-primary">
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

          {/* Next Game / Save button */}
          {editMode ? (
            <button
              onClick={updateExistingGame}
              disabled={saving}
              className="w-full rounded-xl bg-gradient-to-r from-green to-emerald-600 py-4 text-base font-bold shadow-lg shadow-green/25 transition-transform duration-150 active:scale-[0.97] disabled:opacity-50"
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
                    className="w-full rounded-xl bg-gradient-to-r from-blue to-blue-dark py-4 text-base font-bold shadow-lg shadow-blue/25 transition-transform duration-150 active:scale-[0.97]"
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
                    className="w-full rounded-xl bg-gradient-to-r from-green to-emerald-600 py-4 text-base font-bold shadow-lg shadow-green/25 transition-transform duration-150 active:scale-[0.97] disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Session"}
                  </button>
                );
              }
              return null;
            })()
          )}
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
                  {/* Score diff */}
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

                  {/* Frame changes */}
                  {editOriginalFrames.length > 0 &&
                    (() => {
                      const changes = sortedFrames.filter((f) => {
                        const orig = editOriginalFrames.find(
                          (o) => o.frameNumber === f.frameNumber,
                        );
                        if (!orig) return true;
                        return (
                          orig.roll1 !== f.roll1 ||
                          orig.roll2 !== f.roll2 ||
                          orig.roll3 !== f.roll3
                        );
                      });
                      if (changes.length === 0) return null;
                      return (
                        <div className="glass p-3">
                          <p className="mb-1.5 text-[10px] font-semibold text-text-muted">
                            Changed frames
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {changes.map((f) => (
                              <span
                                key={f.frameNumber}
                                className="rounded bg-blue/15 px-2 py-0.5 text-[11px] font-bold text-blue"
                              >
                                F{f.frameNumber}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                  <button
                    onClick={() => {
                      // Build game from current frames and save
                      const game: GameData = {
                        entryType: "detailed",
                        totalScore: currentScore,
                        frames: sortedFrames,
                      };
                      const newGames = [...games];
                      newGames[0] = game;
                      setGames(newGames);
                      updateExistingGame();
                    }}
                    disabled={saving}
                    className="w-full rounded-xl bg-gradient-to-r from-green to-emerald-600 py-4 text-base font-bold shadow-lg shadow-green/25 transition-transform duration-150 active:scale-[0.97] disabled:opacity-50"
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
