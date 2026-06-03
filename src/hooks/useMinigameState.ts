"use client";

import { useState, useEffect, useRef } from "react";
import {
  type MinigameState,
  type MinigameActionType,
  type MinigamePlayer,
  DEFAULT_RULES,
  TOTAL_FRAMES,
  actionPoints,
  currentGameIndex,
  endsFrame,
  tenthFrameClosed,
} from "@/lib/minigame";

// Bump on any state/rules shape change so older saves are ignored instead of
// producing crashes or undefined points. v4 = per-player frames (frameByPlayer).
const STORAGE_KEY = "spare-me-minigame-v4";

function emptyState(): MinigameState {
  return {
    step: "setup",
    rules: { ...DEFAULT_RULES },
    players: [],
    events: [],
    games: [],
    frameByPlayer: {},
    pickingWinner: false,
  };
}

// Guard against malformed or outdated persisted state.
function isValidState(s: unknown): s is MinigameState {
  if (!s || typeof s !== "object") return false;
  const o = s as Record<string, unknown>;
  return (
    Array.isArray(o.players) &&
    Array.isArray(o.events) &&
    Array.isArray(o.games) &&
    typeof o.rules === "object" &&
    o.rules !== null &&
    typeof o.frameByPlayer === "object" &&
    o.frameByPlayer !== null
  );
}

function loadState(): MinigameState {
  if (typeof window === "undefined") return emptyState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw);
    return isValidState(parsed) ? parsed : emptyState();
  } catch {
    return emptyState();
  }
}

function freshFrames(players: MinigamePlayer[]): Record<string, number> {
  return Object.fromEntries(players.map((p) => [p.id, 0]));
}

// Local-only minigame state, auto-persisted so an in-progress session survives a
// reload (mirrors the bowling-session autosave pattern). No DB, no LP.
export function useMinigameState() {
  const [state, setState] = useState<MinigameState>(emptyState);
  const [hydrated, setHydrated] = useState(false);
  const idRef = useRef(0);

  // Hydrate from localStorage after mount to avoid SSR mismatch.
  useEffect(() => {
    setState(loadState());
    setHydrated(true);
  }, []);

  // Persist on every change once hydrated.
  useEffect(() => {
    if (!hydrated) return;
    if (state.step === "setup" && state.players.length === 0) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [state, hydrated]);

  function newEventId() {
    idRef.current += 1;
    return `evt-${idRef.current}`;
  }

  function startGame(next: Pick<MinigameState, "players" | "rules">) {
    setState({
      step: "playing",
      rules: next.rules,
      players: next.players,
      events: [],
      games: [],
      frameByPlayer: freshFrames(next.players),
      pickingWinner: false,
    });
  }

  function addEvent(playerId: string, type: MinigameActionType) {
    setState((s) => {
      const frame = s.frameByPlayer[playerId] ?? 0;
      const gi = currentGameIndex(s);
      // 10th frame: max 3 inputs, and an Open ends it (no further inputs).
      if (frame === TOTAL_FRAMES - 1 && tenthFrameClosed(s, playerId, gi)) {
        return s;
      }
      // Corner and Open can each only be logged once per frame — except the
      // 10th frame, which has bonus balls and behaves like a normal last frame.
      if (
        (type === "cornerMade" || type === "cornerMissed") &&
        frame < TOTAL_FRAMES - 1 &&
        s.events.some(
          (e) =>
            e.playerId === playerId &&
            e.gameIndex === gi &&
            e.frameIndex === frame &&
            e.type === type,
        )
      ) {
        return s;
      }
      const event = {
        id: newEventId(),
        gameIndex: gi,
        frameIndex: frame,
        playerId,
        type,
        points: actionPoints(type, s.rules),
      };
      // Strike / Spare / Miss complete the frame; Corner waits for a possible Miss.
      const nextFrame = endsFrame(type)
        ? Math.min(TOTAL_FRAMES - 1, frame + 1)
        : frame;
      return {
        ...s,
        events: [...s.events, event],
        frameByPlayer: { ...s.frameByPlayer, [playerId]: nextFrame },
      };
    });
  }

  // Manual advance — used to bank a made corner (which doesn't auto-advance).
  function advancePlayer(playerId: string) {
    setState((s) => ({
      ...s,
      frameByPlayer: {
        ...s.frameByPlayer,
        [playerId]: Math.min(
          TOTAL_FRAMES - 1,
          (s.frameByPlayer[playerId] ?? 0) + 1,
        ),
      },
    }));
  }

  function goToFrame(playerId: string, frameIndex: number) {
    setState((s) => ({
      ...s,
      frameByPlayer: {
        ...s.frameByPlayer,
        [playerId]: Math.max(0, Math.min(TOTAL_FRAMES - 1, frameIndex)),
      },
    }));
  }

  // Remove a player's most recent event and return them to that frame.
  function undoPlayer(playerId: string) {
    setState((s) => {
      const gi = currentGameIndex(s);
      for (let i = s.events.length - 1; i >= 0; i--) {
        const e = s.events[i];
        if (e.playerId === playerId && e.gameIndex === gi) {
          return {
            ...s,
            events: s.events.filter((_, idx) => idx !== i),
            frameByPlayer: { ...s.frameByPlayer, [playerId]: e.frameIndex },
          };
        }
      }
      return s;
    });
  }

  function requestEndGame() {
    setState((s) => ({ ...s, pickingWinner: true }));
  }

  function cancelEndGame() {
    setState((s) => ({ ...s, pickingWinner: false }));
  }

  // Record the current game's winner, then either start the next game or end
  // the whole session.
  function finishGame(winnerId: string | null, endSession: boolean) {
    setState((s) => ({
      ...s,
      games: [...s.games, { winnerId }],
      frameByPlayer: freshFrames(s.players),
      pickingWinner: false,
      step: endSession ? "finished" : "playing",
    }));
  }

  // Fresh session, same players + rules.
  function playAgain() {
    setState((s) => ({
      ...s,
      step: "playing",
      events: [],
      games: [],
      frameByPlayer: freshFrames(s.players),
      pickingWinner: false,
    }));
  }

  function reset() {
    setState(emptyState());
  }

  return {
    state,
    hydrated,
    startGame,
    addEvent,
    advancePlayer,
    goToFrame,
    undoPlayer,
    requestEndGame,
    cancelEndGame,
    finishGame,
    playAgain,
    reset,
  };
}
