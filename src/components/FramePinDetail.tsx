"use client";

import { useState } from "react";
import { PIN_LAYOUT, isSplit } from "@/lib/bowling";

interface FramePin {
  frame_number: number;
  roll_1: number;
  roll_2: number | null;
  roll_3: number | null;
  is_strike: boolean;
  is_spare: boolean;
  pins_remaining: number[] | null;
  spare_converted?: boolean;
}

interface FramePinDetailProps {
  frames: FramePin[];
}

export default function FramePinDetail({ frames }: FramePinDetailProps) {
  const [selectedFrame, setSelectedFrame] = useState<number | null>(null);

  const frame = frames.find((f) => f.frame_number === selectedFrame);
  const hasPinData = frames.some(
    (f) => f.pins_remaining && f.pins_remaining.length > 0,
  );

  if (!hasPinData) return null;

  return (
    <div>
      {/* Frame selector */}
      <div className="flex gap-[3px]">
        {frames.map((f) => {
          const hasPins = f.pins_remaining && f.pins_remaining.length > 0;
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
      {frame && frame.pins_remaining && frame.pins_remaining.length > 0 && (
        <div className="mt-2 rounded-lg bg-black/20 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] text-text-muted">
              Frame {frame.frame_number} — Left standing
            </span>
            <span
              className={`text-[11px] font-semibold ${
                frame.is_spare || frame.spare_converted
                  ? "text-gold"
                  : isSplit(frame.pins_remaining)
                    ? "text-red"
                    : "text-text-secondary"
              }`}
            >
              {frame.is_spare || frame.spare_converted
                ? "SPARED"
                : isSplit(frame.pins_remaining)
                  ? "SPLIT"
                  : "OPEN"}
            </span>
          </div>

          {/* Mini pin diagram */}
          <div className="flex flex-col items-center gap-1">
            {PIN_LAYOUT.map((row, rowIndex) => (
              <div key={rowIndex} className="flex gap-[6px]">
                {row.map((pin) => {
                  const isLeft = frame.pins_remaining!.includes(pin);
                  return (
                    <div
                      key={pin}
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold ${
                        isLeft
                          ? isSplit(frame.pins_remaining!)
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
            {frame.pins_remaining.join("-")} leave
          </p>
        </div>
      )}
    </div>
  );
}
