"use client";

import VenueCombobox from "@/components/VenueCombobox";
import { EVENT_LABELS } from "@/lib/ranking";

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

export default function SessionSetup({
  venue,
  onVenueChange,
  pastVenues,
  eventLabel,
  onEventLabelChange,
  gameCount,
  onGameCountChange,
  onStart,
}: SessionSetupProps) {
  return (
    <div>
      <h1 className="mb-6 text-xl font-extrabold text-text-primary">
        Log a Session
      </h1>

      <div className="flex flex-col gap-5">
        <div>
          <label className="mb-1.5 block text-xs text-text-muted">
            Venue (optional)
          </label>
          <VenueCombobox
            value={venue}
            onChange={onVenueChange}
            pastVenues={pastVenues}
          />
        </div>

        <fieldset>
          <legend className="mb-1.5 text-xs text-text-muted">
            Event (optional)
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {EVENT_LABELS.map((label) => (
              <button
                key={label}
                onClick={() =>
                  onEventLabelChange(eventLabel === label ? "" : label)
                }
                aria-pressed={eventLabel === label}
                className={`h-11 rounded-lg px-4 text-sm transition-[color,background-color,transform] duration-150 active:scale-[0.97] ${
                  eventLabel === label
                    ? "bg-blue font-semibold text-white"
                    : "bg-surface-light text-text-secondary"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-1.5 text-xs text-text-muted">
            How many games?
          </legend>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <button
                key={n}
                onClick={() => onGameCountChange(n)}
                aria-pressed={gameCount === n}
                className={`h-11 flex-1 rounded-lg text-sm font-bold tabular-nums transition-[color,background-color,transform] duration-150 active:scale-[0.94] ${
                  gameCount === n
                    ? "bg-blue text-white"
                    : "bg-surface-light text-text-secondary"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </fieldset>

        <button
          onClick={onStart}
          className="mt-2 rounded-xl bg-gradient-to-r from-blue to-blue-dark py-4 text-base font-bold text-white shadow-lg shadow-blue/25 transition-transform duration-150 active:scale-[0.97]"
        >
          Start bowling
        </button>
      </div>
    </div>
  );
}
