"use client";

import { PIN_LAYOUT } from "@/lib/bowling";

interface PinDiagramProps {
  standingPins: number[];
  onPinToggle: (pin: number) => void;
  disabled?: boolean;
  label?: string;
}

export default function PinDiagram({
  standingPins,
  onPinToggle,
  disabled = false,
  label = "Tap pins left standing",
}: PinDiagramProps) {
  return (
    <div className="glass rounded-xl p-5">
      <p className="mb-3 text-center text-[11px] text-text-muted">{label}</p>
      <div className="flex flex-col items-center gap-2">
        {PIN_LAYOUT.map((row, rowIndex) => (
          <div key={rowIndex} className="flex gap-[10px]">
            {row.map((pin) => {
              const isStanding = standingPins.includes(pin);
              return (
                <button
                  key={pin}
                  onClick={() => !disabled && onPinToggle(pin)}
                  disabled={disabled}
                  className={`flex h-11 w-11 items-center justify-center rounded-full text-[15px] font-bold transition-all ${
                    isStanding
                      ? "bg-blue text-white shadow-md shadow-blue/30"
                      : "bg-surface-light text-text-muted line-through"
                  } ${disabled ? "opacity-50" : "active:scale-95"}`}
                >
                  {pin}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
