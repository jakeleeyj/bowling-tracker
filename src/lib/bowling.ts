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

  // Simulate: complete the current frame optimally, then fill remaining frames with strikes
  const simFrames: FrameData[] = frames.map((f) => ({ ...f }));

  // Complete the last frame if it has pending rolls
  const last = simFrames[simFrames.length - 1];
  if (last.frameNumber < 10) {
    // Frames 1-9: if roll 2 is pending, simulate a spare
    if (last.roll2 === null && !last.isStrike) {
      last.roll2 = 10 - last.roll1;
      last.isSpare = true;
    }
  } else {
    // Frame 10: fill remaining rolls
    if (last.roll2 === null) {
      if (last.isStrike) {
        last.roll2 = 10;
        last.roll3 = 10;
      } else {
        last.roll2 = 10 - last.roll1;
        last.isSpare = true;
        last.roll3 = 10;
      }
    } else if (
      last.roll3 === null &&
      (last.isStrike || last.isSpare || last.roll2 === 10)
    ) {
      last.roll3 = 10;
    }
  }

  // Fill remaining frames with strikes
  for (let i = simFrames.length; i < 10; i++) {
    const isFrame10 = i === 9;
    simFrames.push({
      frameNumber: i + 1,
      roll1: 10,
      roll2: isFrame10 ? 10 : null,
      roll3: isFrame10 ? 10 : null,
      isStrike: true,
      isSpare: false,
      pinsRemaining: null,
      pinsRemainingRoll2: null,
      spareConverted: false,
    });
  }

  const simScores = calculateFrameScores(simFrames);
  return simScores[simScores.length - 1] ?? 300;
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
