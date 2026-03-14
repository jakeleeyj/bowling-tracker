# Log Page Refactor Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Break the 2031-line `log/page.tsx` into focused components and a state hook, enabling auto-save and easier maintenance.

**Architecture:** Extract a `useSessionState` hook that owns all bowling state + logic. Split the UI into 5 screen components that consume the hook. Keep the page file as a thin router between screens. No behavior changes — pure refactor.

**Tech Stack:** React hooks, TypeScript, Next.js app router

---

## File Structure

### New files to create:

| File                                    | Responsibility                                                                                                                                                             | ~Lines |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `src/hooks/useSessionState.ts`          | All bowling state (15 useState + refs), all game logic functions (strike, spare, gutter, pin toggle, frame 10, undo, advance, complete), edit mode loading, venue fetching | ~500   |
| `src/components/log/SessionSetup.tsx`   | Venue combobox, event picker, game count, "Start Bowling" button                                                                                                           | ~100   |
| `src/components/log/GameEntry.tsx`      | Frame-by-frame + quick entry UI, pin diagram, action buttons, mode toggle, scorecard, game tabs                                                                            | ~250   |
| `src/components/log/SessionReview.tsx`  | All-games-complete screen with scores, save button                                                                                                                         | ~80    |
| `src/components/log/SessionResults.tsx` | Results screen (LP change, achievements, rank up) — move existing `ResultsScreen` + helpers                                                                                | ~200   |

### Files to modify:

| File                         | Change                                                                  |
| ---------------------------- | ----------------------------------------------------------------------- |
| `src/app/(app)/log/page.tsx` | Slim down to ~50 lines: import hook + components, route between screens |

### Files unchanged:

- `src/components/PinDiagram.tsx`
- `src/components/FrameScorecard.tsx`
- `src/components/FramePinDetail.tsx`
- `src/components/VenueCombobox.tsx`
- `src/lib/bowling.ts`
- `src/lib/ranking.ts`

---

## Task 1: Extract `useSessionState` hook

**Files:**

- Create: `src/hooks/useSessionState.ts`
- Modify: `src/app/(app)/log/page.tsx`

This is the biggest task — move all state and logic functions out of `LogPage`.

- [ ] **Step 1: Create the hook file with types and state**

Move from `page.tsx` to `useSessionState.ts`:

- Types: `EntryMode`, `Step`, `GameData`, `GameEditorState`
- Utility: `upsertFrame()`
- All `useState` declarations (lines 483-534)
- All `useRef` declarations (lines 536-537)
- The `useEffect` for edit game loading (lines 540-600)
- The `useEffect` for venue loading (lines 602-626)

The hook signature:

```ts
export function useSessionState() {
  // ... all state ...
  // ... all logic ...
  return {
    // State
    step,
    venue,
    eventLabel,
    pastVenues,
    gameCount,
    currentGameIndex,
    games,
    entryMode,
    quickScore,
    frames,
    currentFrame,
    currentRoll,
    standingPins,
    saving,
    reviewMode,
    editMode,
    editLoading,
    editOriginalScore,
    editOriginalFrames,
    resultsData,
    history,
    // Setters needed by UI
    setVenue,
    setEventLabel,
    setGameCount,
    setEntryMode,
    setQuickScore,
    setReviewMode,
    setStep,
    // Actions
    startSession,
    handleStrike,
    handleSpare,
    handleGutter,
    handlePinToggle,
    confirmPinSelection,
    handleUndo,
    handleFrameTap,
    switchToGame,
    editCurrentGame,
    deleteCurrentGame,
    completeQuickGame,
    saveSession,
    updateExistingGame,
    // Derived
    sortedFrames,
    currentScore,
    maxPossible,
    availablePins,
    isFreshRack,
    showStrikeButton,
    currentGameComplete,
    allGamesComplete,
  };
}
```

- [ ] **Step 2: Move all logic functions into the hook**

Move these functions (in order):

- `saveHistory`, `handleUndo`, `handleFrameTap`
- `startSession`, `resetGameState`
- `saveEditorState`, `loadEditorState`
- `editCurrentGame`, `deleteCurrentGame`, `switchToGame`
- `haptic`
- `handleStrike`, `handleSpare`, `handleGutter`
- `handlePinToggle`, `confirmPinSelection`
- `handle10thFrameRoll`, `advanceFrame`
- `completeCurrentGame`, `completeQuickGame`
- `saveSession`, `updateExistingGame`
- `getAvailablePins` and derived values

- [ ] **Step 3: Move derived state into the hook**

Move these computed values (currently lines 1422-1472):

```ts
const sortedFrames = [...frames].sort((a, b) => a.frameNumber - b.frameNumber);
const frameScores = calculateFrameScores(sortedFrames);
const currentScore = frameScores[frameScores.length - 1] ?? 0;
const maxPossible = calculateMaxPossible(sortedFrames);
const currentGameComplete = games[currentGameIndex] !== undefined;
const allGamesComplete =
  games.filter(Boolean).length === gameCount && gameCount > 0 && !editMode;
const availablePins = getAvailablePins();
const isFreshRack = availablePins.length === 10;
const showStrikeButton =
  isFreshRack && (currentRoll === 1 || currentFrame === 10);
```

- [ ] **Step 4: Update `page.tsx` to use the hook**

Replace all state/logic with:

```tsx
const session = useSessionState();
```

Pass individual values to screen components. Page becomes a screen router only.

- [ ] **Step 5: Build and verify no behavior changes**

Run: `npm run build`
Expected: clean build, no errors

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useSessionState.ts src/app/\(app\)/log/page.tsx
git commit -m "Extract useSessionState hook from log page"
```

---

## Task 2: Extract `SessionResults` component

**Files:**

- Create: `src/components/log/SessionResults.tsx`
- Modify: `src/app/(app)/log/page.tsx`

- [ ] **Step 1: Create SessionResults.tsx**

Move from `page.tsx`:

- `AnimatedCounter` component (lines 82-105)
- `RankEmblem` component (lines 107-139)
- `RESULTS_ICON_MAP` constant (lines 141-149)
- `ResultsScreen` component (lines 151-474)

- [ ] **Step 2: Update page.tsx imports**

Replace inline `ResultsScreen` usage with import from new file.

- [ ] **Step 3: Build and verify**

Run: `npm run build`

- [ ] **Step 4: Commit**

```bash
git add src/components/log/SessionResults.tsx src/app/\(app\)/log/page.tsx
git commit -m "Extract SessionResults component"
```

---

## Task 3: Extract `SessionSetup` component

**Files:**

- Create: `src/components/log/SessionSetup.tsx`
- Modify: `src/app/(app)/log/page.tsx`

- [ ] **Step 1: Create SessionSetup.tsx**

Move the setup screen JSX (lines 1489-1560). Props:

```ts
interface SessionSetupProps {
  venue: string;
  onVenueChange: (v: string) => void;
  pastVenues: string[];
  eventLabel: string;
  onEventLabelChange: (v: string) => void;
  gameCount: number;
  onGameCountChange: (n: number) => void;
  onStart: () => void;
}
```

- [ ] **Step 2: Update page.tsx**

Replace inline setup JSX with `<SessionSetup ... />`.

- [ ] **Step 3: Build and verify**

- [ ] **Step 4: Commit**

```bash
git add src/components/log/SessionSetup.tsx src/app/\(app\)/log/page.tsx
git commit -m "Extract SessionSetup component"
```

---

## Task 4: Extract `SessionReview` component

**Files:**

- Create: `src/components/log/SessionReview.tsx`
- Modify: `src/app/(app)/log/page.tsx`

- [ ] **Step 1: Create SessionReview.tsx**

Move the all-games-complete screen (lines 1564-1633). Props:

```ts
interface SessionReviewProps {
  games: GameData[];
  venue: string;
  eventLabel: string;
  saving: boolean;
  onBack: () => void;
  onSave: () => void;
}
```

- [ ] **Step 2: Update page.tsx**

- [ ] **Step 3: Build and verify**

- [ ] **Step 4: Commit**

```bash
git add src/components/log/SessionReview.tsx src/app/\(app\)/log/page.tsx
git commit -m "Extract SessionReview component"
```

---

## Task 5: Extract `GameEntry` component

**Files:**

- Create: `src/components/log/GameEntry.tsx`
- Modify: `src/app/(app)/log/page.tsx`

- [ ] **Step 1: Create GameEntry.tsx**

Move the game entry JSX (lines 1637-2031). This is the largest UI chunk — game tabs, completed game view, mode toggle, quick entry, detailed entry with pin diagram, edit mode diff, action buttons.

Props: pass through the needed values from `useSessionState`.

- [ ] **Step 2: Update page.tsx to ~50 lines**

Final page.tsx should look roughly like:

```tsx
"use client";
import { Suspense } from "react";
import { useSessionState } from "@/hooks/useSessionState";
import SessionSetup from "@/components/log/SessionSetup";
import GameEntry from "@/components/log/GameEntry";
import SessionReview from "@/components/log/SessionReview";
import SessionResults from "@/components/log/SessionResults";

function LogPage() {
  const session = useSessionState();

  if (session.editLoading) return <Loading />;
  if (session.step === "results" && session.resultsData)
    return <SessionResults data={session.resultsData} />;
  if (session.step === "setup") return <SessionSetup {...setupProps} />;
  if (session.allGamesComplete) return <SessionReview {...reviewProps} />;
  return <GameEntry {...session} />;
}

export default function LogPageWrapper() {
  return (
    <Suspense>
      <LogPage />
    </Suspense>
  );
}
```

- [ ] **Step 3: Build and verify**

Run: `npm run build`

- [ ] **Step 4: Manual test**

Test the full flow: setup → detailed game → quick game → review → save. Test edit mode. Test frame 10. Test undo.

- [ ] **Step 5: Commit**

```bash
git add src/components/log/GameEntry.tsx src/app/\(app\)/log/page.tsx
git commit -m "Extract GameEntry component, complete log page refactor"
```

---

## Summary

| Before                      | After                             |
| --------------------------- | --------------------------------- |
| `log/page.tsx` — 2031 lines | `log/page.tsx` — ~50 lines        |
|                             | `useSessionState.ts` — ~500 lines |
|                             | `SessionSetup.tsx` — ~100 lines   |
|                             | `GameEntry.tsx` — ~250 lines      |
|                             | `SessionReview.tsx` — ~80 lines   |
|                             | `SessionResults.tsx` — ~200 lines |

**Total: ~1180 lines** (down from 2031) because removing duplication and cleaning up inline logic.

After this refactor, auto-save becomes adding `useEffect` + `localStorage` calls in `useSessionState.ts` — one file, one place.
