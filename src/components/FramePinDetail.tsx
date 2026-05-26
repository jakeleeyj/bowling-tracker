"use client";

import { useState } from "react";
import { PIN_LAYOUT, isSplit, getFrame10ShotPins } from "@/lib/bowling";

interface FramePin {
  frame_number: number;
  roll_1: number;
  roll_2: number | null;
  roll_3: number | null;
  is_strike: boolean;
  is_spare: boolean;
  pins_remaining: number[] | null;
  pins_remaining_roll2: number[] | null;
  pins_remaining_roll3: number[] | null;
  spare_converted?: boolean;
}

interface FramePinDetailProps {
  frames: FramePin[];
}

export default function FramePinDetail({ frames }: FramePinDetailProps) {
  const [selectedFrame, setSelectedFrame] = useState<number | null>(null);
  // User's explicit shot pick, tied to the frame it applies to so it
  // auto-resets when another frame is selected.
  const [shotOverride, setShotOverride] = useState<{
    frame: number;
    shot: 1 | 2 | 3;
  } | null>(null);

  const frame = frames.find((f) => f.frame_number === selectedFrame);
  const frameHasViewablePins = (f: FramePin) => {
    if (f.pins_remaining && f.pins_remaining.length > 0) return true;
    // Frame 10 with multiple shots is still worth viewing per-shot.
    if (f.frame_number === 10 && (f.roll_2 !== null || f.roll_3 !== null))
      return true;
    return false;
  };
  const hasPinData = frames.some(frameHasViewablePins);

  // Default to the last shot rolled in the current frame.
  const defaultShot: 1 | 2 | 3 =
    frame && frame.frame_number === 10
      ? frame.roll_3 !== null
        ? 3
        : frame.roll_2 !== null
          ? 2
          : 1
      : 1;
  const selectedShot: 1 | 2 | 3 =
    shotOverride && shotOverride.frame === selectedFrame
      ? shotOverride.shot
      : defaultShot;

  if (!hasPinData) return null;

  return (
    <div>
      {/* Frame selector */}
      <div className="flex gap-[3px]">
        {frames.map((f) => {
          const hasPins = frameHasViewablePins(f);
          const isSelected = f.frame_number === selectedFrame;

          return (
            <button
              key={f.frame_number}
              onClick={() =>
                setSelectedFrame(isSelected ? null : f.frame_number)
              }
              disabled={!hasPins}
              className={`flex-1 rounded py-1 text-[10px] font-semibold transition-colors ${
                isSelected
                  ? "bg-blue text-white"
                  : hasPins
                    ? "bg-surface-light text-text-secondary active:bg-surface-light/80"
                    : "bg-transparent text-text-muted/30"
              }`}
            >
              {f.frame_number}
            </button>
          );
        })}
      </div>

      {/* Pin detail */}
      {frame &&
        (() => {
          const isFrame10 = frame.frame_number === 10;
          const hasR2 = frame.roll_2 !== null;
          const hasR3 = frame.roll_3 !== null;

          const shotData = isFrame10
            ? getFrame10ShotPins(
                selectedShot,
                frame.pins_remaining,
                frame.pins_remaining_roll2,
                frame.roll_1,
                frame.roll_2,
                frame.roll_3,
                frame.pins_remaining_roll3,
              )
            : {
                pins: frame.pins_remaining ?? [],
                precise: true,
                knocked: frame.roll_1,
              };

          // Frames 1–9 only render when there's a meaningful leave.
          if (!isFrame10 && shotData.pins.length === 0) return null;

          const displayPins = shotData.pins;
          const split = isSplit(displayPins);
          const stateLabel =
            isFrame10 && selectedShot === 3
              ? null
              : frame.is_spare || frame.spare_converted
                ? "SPARED"
                : split
                  ? "SPLIT"
                  : "OPEN";
          const positionLabel = !isFrame10
            ? "Left standing"
            : shotData.precise
              ? `Standing after R${selectedShot}`
              : `Going into R${selectedShot}`;

          return (
            <div className="mt-2 rounded-lg bg-black/20 p-3">
              {/* Frame 10 shot toggle */}
              {isFrame10 && (hasR2 || hasR3) && (
                <div className="mb-2 flex rounded-lg bg-surface-light p-[3px]">
                  {([1, 2, 3] as const).map((shot) => {
                    if (shot === 2 && !hasR2) return null;
                    if (shot === 3 && !hasR3) return null;
                    const active = selectedShot === shot;
                    return (
                      <button
                        key={shot}
                        onClick={() =>
                          setShotOverride({
                            frame: frame.frame_number,
                            shot,
                          })
                        }
                        className={`flex-1 rounded-md py-[5px] text-[12px] transition-colors ${
                          active
                            ? "bg-blue font-semibold text-white"
                            : "text-text-muted"
                        }`}
                      >
                        Shot {shot}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] text-text-muted">
                  Frame {frame.frame_number} &mdash; {positionLabel}
                </span>
                {stateLabel && (
                  <span
                    className={`text-[11px] font-semibold ${
                      frame.is_spare || frame.spare_converted
                        ? "text-gold"
                        : split
                          ? "text-red"
                          : "text-text-secondary"
                    }`}
                  >
                    {stateLabel}
                  </span>
                )}
              </div>

              {/* Mini pin diagram */}
              <div className="flex flex-col items-center gap-1">
                {PIN_LAYOUT.map((row, rowIndex) => (
                  <div key={rowIndex} className="flex gap-[6px]">
                    {row.map((pin) => {
                      const isLeft = displayPins.includes(pin);
                      return (
                        <div
                          key={pin}
                          className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold ${
                            isLeft
                              ? split
                                ? "bg-red/20 text-red"
                                : "bg-blue/20 text-blue"
                              : "bg-surface-light/30 text-text-muted/20"
                          }`}
                        >
                          {pin}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              <p className="mt-2 text-center text-[10px] text-text-muted">
                {isFrame10
                  ? shotData.knocked === 10
                    ? "Strike — all 10"
                    : shotData.knocked === 0
                      ? "Gutter — 0 knocked"
                      : displayPins.length === 0
                        ? `Knocked ${shotData.knocked ?? "-"}`
                        : shotData.precise
                          ? `${displayPins.join("-")} leave`
                          : `Knocked ${shotData.knocked} — exact pins not recorded`
                  : `${displayPins.join("-")} leave`}
              </p>
            </div>
          );
        })()}
    </div>
  );
}
