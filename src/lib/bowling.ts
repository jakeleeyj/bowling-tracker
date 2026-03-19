// Bowling score calculation engine

export interface FrameData {
  frameNumber: number;
  roll1: number;
  roll2: number | null;
  roll3: number | null; // 10th frame only
  isStrike: boolean;
  isSpare: boolean;
  pinsRemaining: number[] | null;
  pinsRemainingRoll2: number[] | null;
  spareConverted: boolean;
}

export interface GameState {
  frames: FrameData[];
  currentFrame: number;
  currentRoll: 1 | 2 | 3;
  isComplete: boolean;
}

export function createEmptyGame(): GameState {
  return {
    frames: [],
    currentFrame: 1,
    currentRoll: 1,
    isComplete: false,
  };
}

export function calculateFrameScores(frames: FrameData[]): number[] {
  const scores: number[] = [];
  let runningTotal = 0;

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    let frameScore = frame.roll1 + (frame.roll2 ?? 0);

    if (i < 9) {
      // Frames 1-9
      if (frame.isStrike) {
        // Strike bonus: next 2 rolls
        const bonus = getNextRolls(frames, i, 2);
        frameScore = 10 + bonus;
      } else if (frame.isSpare) {
        // Spare bonus: next 1 roll
        const bonus = getNextRolls(frames, i, 1);
        frameScore = 10 + bonus;
      }
    } else {
      // Frame 10: no bonus, just sum all rolls
      frameScore = frame.roll1 + (frame.roll2 ?? 0) + (frame.roll3 ?? 0);
    }

    runningTotal += frameScore;
    scores.push(runningTotal);
  }

  return scores;
}

function getNextRolls(
  frames: FrameData[],
  frameIndex: number,
  count: number,
): number {
  let total = 0;
  let remaining = count;
  let fi = frameIndex + 1;

  while (remaining > 0 && fi < frames.length) {
    const f = frames[fi];
    total += f.roll1;
    remaining--;

    if (remaining > 0 && f.roll2 !== null) {
      total += f.roll2;
      remaining--;
    }

    if (remaining > 0 && fi === 9 && f.roll3 !== null) {
      total += f.roll3;
      remaining--;
    }

    fi++;
  }

  return total;
}

export function calculateMaxPossible(frames: FrameData[]): number {
  if (frames.length === 0) return 300;

  const scores = calculateFrameScores(frames);
  const completedFrames = frames.length;
  const currentScore = scores[scores.length - 1] ?? 0;

  if (completedFrames >= 10) {
    // Frame 10: simulate remaining rolls as strikes/spares and recalculate
    // This correctly accounts for pending bonuses on frames 8 and 9
    const f10 = frames[9];
    const simulated: FrameData = { ...f10 };

    if (simulated.roll2 === null) {
      if (simulated.isStrike) {
        simulated.roll2 = 10;
        simulated.roll3 = 10;
      } else {
        simulated.roll2 = 10 - simulated.roll1;
        simulated.isSpare = true;
        simulated.roll3 = 10;
      }
    } else if (
      simulated.roll3 === null &&
      (simulated.isStrike || simulated.isSpare || simulated.roll2 === 10)
    ) {
      simulated.roll3 = 10;
    }

    const simFrames = [...frames.slice(0, 9), simulated];
    const simScores = calculateFrameScores(simFrames);
    return simScores[simScores.length - 1] ?? currentScore;
  }

  // Max possible = current score + max remaining
  // Each remaining frame can score at most 30 (strike + two more strikes)
  const remainingFrames = 10 - completedFrames;

  // For the last completed frame, if it was a strike or spare,
  // the bonus rolls could be maximized too
  let maxBonus = 0;
  const lastFrame = frames[completedFrames - 1];

  if (lastFrame.isStrike) {
    // Need to check if we already accounted for bonus rolls
    const bonusRolls = getNextRollsCount(frames, completedFrames - 1);
    if (bonusRolls < 2) {
      maxBonus += (2 - bonusRolls) * 10;
    }
  } else if (lastFrame.isSpare) {
    const bonusRolls = getNextRollsCount(frames, completedFrames - 1);
    if (bonusRolls < 1) {
      maxBonus += 10;
    }
  }

  // Check second-to-last frame too if it was a strike
  if (completedFrames >= 2) {
    const prevFrame = frames[completedFrames - 2];
    if (prevFrame.isStrike) {
      const bonusRolls = getNextRollsCount(frames, completedFrames - 2);
      if (bonusRolls < 2) {
        maxBonus += (2 - bonusRolls) * 10;
      }
    }
  }

  return currentScore + maxBonus + remainingFrames * 30;
}

function getNextRollsCount(frames: FrameData[], frameIndex: number): number {
  let count = 0;
  for (let i = frameIndex + 1; i < frames.length; i++) {
    count++; // roll 1
    if (frames[i].roll2 !== null) count++;
    if (i === 9 && frames[i].roll3 !== null) count++;
  }
  return count;
}

export function isCleanGame(frames: FrameData[]): boolean {
  if (frames.length < 10) return false;
  return frames.every(
    (f, i) => f.isStrike || f.isSpare || (i === 9 && f.roll1 === 10),
  );
}

export function countStrikes(frames: FrameData[]): number {
  let count = 0;
  for (const f of frames) {
    if (f.isStrike) count++;
    // 10th frame can have multiple strikes
    if (f.frameNumber === 10) {
      if (f.roll2 === 10) count++;
      if (f.roll3 === 10) count++;
    }
  }
  return count;
}

export function countSpares(frames: FrameData[]): number {
  let count = 0;
  for (const f of frames) {
    if (f.isSpare) count++;
    // 10th frame: check if roll2+remaining or roll3 makes a spare
    if (
      f.frameNumber === 10 &&
      f.roll1 === 10 &&
      f.roll2 !== null &&
      f.roll2 !== 10
    ) {
      if (f.roll3 !== null && f.roll2 + f.roll3 === 10) count++;
    }
  }
  return count;
}

// Get which pins are still standing based on standard 10-pin layout
// Returns all 10 pin positions initially
export function getAllPins(): number[] {
  return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
}

// Pin layout (viewed from bowler's perspective):
//  7  8  9  10
//    4  5  6
//      2  3
//        1
export const PIN_LAYOUT = [[7, 8, 9, 10], [4, 5, 6], [2, 3], [1]] as const;

// Pin adjacency graph — pins that physically touch each other
// Includes same-row neighbors, diagonal neighbors, and sleeper pairs (2-8, 3-9)
const PIN_ADJACENCY: Record<number, number[]> = {
  1: [2, 3],
  2: [1, 3, 4, 5, 8],
  3: [1, 2, 5, 6, 9],
  4: [2, 5, 7, 8],
  5: [2, 3, 4, 6, 8, 9],
  6: [3, 5, 9, 10],
  7: [4, 8],
  8: [2, 4, 5, 7, 9],
  9: [3, 5, 6, 8, 10],
  10: [6, 9],
};

// A split is when headpin is down, 2+ pins remain, and remaining pins
// form disconnected groups (can't trace a path between all of them)
export function isSplit(pins: number[]): boolean {
  if (pins.length < 2 || pins.includes(1)) return false;

  const pinSet = new Set(pins);
  const visited = new Set<number>();
  const queue = [pins[0]];
  visited.add(pins[0]);

  while (queue.length > 0) {
    const current = queue.pop()!;
    for (const neighbor of PIN_ADJACENCY[current]) {
      if (pinSet.has(neighbor) && !visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  return visited.size < pins.length;
}
