"use client";

import { PIN_LAYOUT } from "@/lib/bowling";

interface PinDiagramProps {
  standingPins: number[];
  availablePins?: number[];
  onPinToggle: (pin: number) => void;
  disabled?: boolean;
  label?: string;
  toolbar?: React.ReactNode;
}

export default function PinDiagram({
  standingPins,
  availablePins,
  onPinToggle,
  disabled = false,
  label = "Tap pins left standing",
  toolbar,
}: PinDiagramProps) {
  const available = availablePins ?? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  return (
    <div className="glass rounded-xl px-4 pb-3 pt-2.5">
      {toolbar ? (
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="min-w-0 truncate text-[11px] text-text-muted">
            {label}
          </p>
          {toolbar}
        </div>
      ) : (
        <p className="mb-2 text-center text-[11px] text-text-muted">{label}</p>
      )}
      <div className="flex flex-col items-center gap-1.5">
        {PIN_LAYOUT.map((row, rowIndex) => (
          <div key={rowIndex} className="flex gap-[10px]">
            {row.map((pin) => {
              const isAvailable = available.includes(pin);
              const isStanding = standingPins.includes(pin);

              if (!isAvailable) {
                return (
                  <div
                    key={pin}
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-light/30 text-[15px] font-bold text-text-muted/20"
                  >
                    {pin}
                  </div>
                );
              }

              return (
                <button
                  key={pin}
                  onClick={() => !disabled && onPinToggle(pin)}
                  disabled={disabled}
                  aria-label={`Pin ${pin}`}
                  aria-pressed={isStanding}
                  className={`flex h-11 w-11 items-center justify-center rounded-full text-[15px] font-bold transition-[transform,background-color,color,box-shadow,opacity] duration-150 ease-out ${
                    isStanding
                      ? "scale-100 bg-blue text-white shadow-md shadow-blue/30 inset-shadow-2xs inset-shadow-white/30"
                      : "scale-90 bg-surface-light text-text-muted"
                  } ${disabled ? "opacity-50" : isStanding ? "active:scale-90" : "active:scale-[0.82]"}`}
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
