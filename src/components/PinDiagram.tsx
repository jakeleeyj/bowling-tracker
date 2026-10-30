"use client";

import { PIN_LAYOUT } from "@/lib/bowling";

interface PinDiagramProps {
  standingPins: number[];
  availablePins?: number[];
  onPinToggle: (pin: number) => void;
  disabled?: boolean;
  label?: string;
  toolbar?: React.ReactNode;
  /** Grow to fill the parent's free height, scaling pins to fit */
  fill?: boolean;
  /** Absolutely positioned layer drawn over the pins */
  overlay?: React.ReactNode;
}

export default function PinDiagram({
  standingPins,
  availablePins,
  onPinToggle,
  disabled = false,
  label = "Tap pins left standing",
  toolbar,
  fill = false,
  overlay,
}: PinDiagramProps) {
  const available = availablePins ?? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  return (
    <div
      className={`glass relative overflow-hidden rounded-xl px-4 pb-3 pt-2.5 ${fill ? "grid min-h-[256px] grid-rows-[auto_1fr] lg:block lg:min-h-0" : ""}`}
    >
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
      <div
        className={
          fill
            ? "relative [container-type:size] lg:[container-type:normal]"
            : undefined
        }
      >
        <div
          className={`flex flex-col items-center ${
            fill
              ? "absolute inset-0 justify-center gap-[calc(var(--pin)*0.16)] [--pin:clamp(2.75rem,min(100cqh/5.2,100cqw/5.4),3.5rem)] lg:static lg:gap-1.5 lg:[--pin:2.75rem]"
              : "gap-1.5 [--pin:2.75rem]"
          }`}
        >
          {PIN_LAYOUT.map((row, rowIndex) => (
            <div key={rowIndex} className="flex gap-[calc(var(--pin)*0.23)]">
              {row.map((pin) => {
                const isAvailable = available.includes(pin);
                const isStanding = standingPins.includes(pin);

                if (!isAvailable) {
                  return (
                    <div
                      key={pin}
                      className="flex size-(--pin) items-center justify-center rounded-full bg-surface-light/30 text-[length:calc(var(--pin)*0.34)] font-semibold text-text-muted/20"
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
                    className={`flex size-(--pin) items-center justify-center rounded-full text-[length:calc(var(--pin)*0.34)] font-semibold transition-transform duration-100 ease-out ${
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
      {overlay}
    </div>
  );
}
