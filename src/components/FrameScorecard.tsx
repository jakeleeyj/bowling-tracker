"use client";

import type { FrameData } from "@/lib/bowling";
import { calculateFrameScores, isSplit } from "@/lib/bowling";

interface FrameScorecardProps {
  frames: FrameData[];
  currentFrame: number;
  currentRoll: 1 | 2 | 3;
  onFrameTap?: (frameNumber: number) => void;
}

function formatRoll(
  frame: FrameData,
  rollNum: 1 | 2 | 3,
  frameNum: number,
): string {
  if (frameNum < 10) {
    if (rollNum === 1) {
      if (frame.isStrike) return "X";
      return frame.roll1 === 0 ? "-" : frame.roll1.toString();
    }
    if (rollNum === 2) {
      if (frame.roll2 === null) return "";
      if (frame.isSpare) return "/";
      return frame.roll2 === 0 ? "-" : frame.roll2.toString();
    }
    return "";
  }

  // 10th frame
  if (rollNum === 1) {
    if (frame.roll1 === 10) return "X";
    return frame.roll1 === 0 ? "-" : frame.roll1.toString();
  }
  if (rollNum === 2) {
    if (frame.roll2 === null) return "";
    if (frame.roll1 === 10 && frame.roll2 === 10) return "X";
    if (frame.roll1 !== 10 && frame.roll1 + frame.roll2 === 10) return "/";
    return frame.roll2 === 0 ? "-" : frame.roll2.toString();
  }
  if (rollNum === 3) {
    if (frame.roll3 === null) return "";
    if (frame.roll3 === 10) return "X";
    if (
      frame.roll2 !== null &&
      frame.roll2 !== 10 &&
      frame.roll2 + frame.roll3 === 10
    )
      return "/";
    return frame.roll3 === 0 ? "-" : frame.roll3.toString();
  }
  return "";
}

export default function FrameScorecard({
  frames,
  currentFrame,
  currentRoll,
  onFrameTap,
}: FrameScorecardProps) {
  const scores = calculateFrameScores(frames);

  return (
    <div className="glass overflow-hidden rounded-lg">
      <table className="w-full border-collapse text-center text-[10px]">
        {/* Frame numbers */}
        <thead>
          <tr>
            {Array.from({ length: 10 }, (_, i) => (
              <th
                key={i}
                className="border border-border px-0 py-[3px] font-normal text-text-muted"
              >
                {i + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Rolls row */}
          <tr className="h-[22px]">
            {Array.from({ length: 10 }, (_, i) => {
              const frame = frames.find((f) => f.frameNumber === i + 1);
              const isCurrentFrame = i + 1 === currentFrame;
              const isTappable = !isCurrentFrame && !!onFrameTap;

              return (
                <td
                  key={i}
                  onClick={() => isTappable && onFrameTap?.(i + 1)}
                  className={`border border-border text-[11px] ${isCurrentFrame ? "bg-blue/10" : ""} ${isTappable ? "cursor-pointer active:bg-blue/5" : ""}`}
                >
                  {frame ? (
                    <div
                      className={`flex ${i < 9 ? "justify-between" : "justify-around"} px-[2px]`}
                    >
                      {i < 9 ? (
                        <>
                          {frame.isStrike ? (
                            <span className="ml-auto font-bold text-green">
                              X
                            </span>
                          ) : (
                            <>
                              <span
                                className={
                                  frame.pinsRemaining &&
                                  isSplit(frame.pinsRemaining)
                                    ? "font-bold text-red"
                                    : "text-text-secondary"
                                }
                              >
                                {formatRoll(frame, 1, i)}
                              </span>
                              <span
                                className={
                                  frame.isSpare
                                    ? "font-bold text-gold"
                                    : "text-text-secondary"
                                }
                              >
                                {formatRoll(frame, 2, i)}
                              </span>
                            </>
                          )}
                        </>
                      ) : (
                        <>
                          <span
                            className={
                              frame.roll1 === 10
                                ? "font-bold text-green"
                                : "text-text-secondary"
                            }
                          >
                            {formatRoll(frame, 1, 10)}
                          </span>
                          <span
                            className={
                              frame.roll2 === 10
                                ? "font-bold text-green"
                                : frame.isSpare
                                  ? "font-bold text-gold"
                                  : "text-text-secondary"
                            }
                          >
                            {formatRoll(frame, 2, 10)}
                          </span>
                          <span
                            className={
                              frame.roll3 === 10
                                ? "font-bold text-green"
                                : "text-text-secondary"
                            }
                          >
                            {formatRoll(frame, 3, 10)}
                          </span>
                        </>
                      )}
                    </div>
                  ) : isCurrentFrame ? (
                    <span className="animate-pulse text-blue">_</span>
                  ) : null}
                </td>
              );
            })}
          </tr>
          {/* Running totals */}
          <tr className="h-[26px]">
            {Array.from({ length: 10 }, (_, i) => {
              const frameIdx = frames.findIndex((f) => f.frameNumber === i + 1);
              const score = frameIdx >= 0 ? scores[frameIdx] : undefined;
              const canDisplay =
                score !== undefined &&
                frameIdx >= 0 &&
                isScoreResolved(frames, frameIdx);

              return (
                <td
                  key={i}
                  className="border border-border text-[12px] font-bold text-text-primary"
                >
                  {canDisplay ? (
                    score
                  ) : score !== undefined ? (
                    <span className="text-text-muted">...</span>
                  ) : (
                    <span className="text-text-muted">&mdash;</span>
                  )}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// A frame's score can only be shown if all bonus rolls are available
function isScoreResolved(frames: FrameData[], frameIndex: number): boolean {
  const frame = frames[frameIndex];
  if (!frame) return false;

  const frameNum = frame.frameNumber;

  if (frameNum === 10) {
    if (
      frame.roll1 === 10 ||
      (frame.roll2 !== null && frame.roll1 + frame.roll2 === 10)
    ) {
      return frame.roll3 !== null;
    }
    return frame.roll2 !== null;
  }

  if (frame.isStrike) {
    // Need next 2 rolls from subsequent frames
    let rollsFound = 0;
    for (let n = frameNum + 1; n <= 10 && rollsFound < 2; n++) {
      const next = frames.find((f) => f.frameNumber === n);
      if (!next) return false;
      rollsFound++;
      if (!next.isStrike || n === 10) {
        if (next.roll2 !== null) rollsFound++;
      }
    }
    return rollsFound >= 2;
  }

  if (frame.isSpare) {
    // Need next 1 roll
    const next = frames.find((f) => f.frameNumber === frameNum + 1);
    return !!next;
  }

  return true;
}
