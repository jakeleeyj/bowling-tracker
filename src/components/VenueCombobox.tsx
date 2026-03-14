"use client";

import { useState, useRef, useEffect } from "react";
import { MapPin } from "lucide-react";

const PRESET_VENUES = [
  "Planet Bowl",
  "SuperBowl - Toa Payoh",
  "SuperBowl - Mt Faber",
  "Westwood Bowl",
  "Sonic Bowl - Punggol",
];

interface VenueComboboxProps {
  value: string;
  onChange: (value: string) => void;
  pastVenues: string[];
}

export default function VenueCombobox({
  value,
  onChange,
  pastVenues,
}: VenueComboboxProps) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Merge past venues + presets, deduped, past first
  const allVenues = [
    ...pastVenues,
    ...PRESET_VENUES.filter((v) => !pastVenues.includes(v)),
  ];

  const filtered = filter
    ? allVenues.filter((v) => v.toLowerCase().includes(filter.toLowerCase()))
    : allVenues;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setFilter("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSelect(venue: string) {
    onChange(venue);
    setOpen(false);
    setFilter("");
    inputRef.current?.blur();
  }

  function handleInputChange(text: string) {
    setFilter(text);
    onChange(text);
    if (!open) setOpen(true);
  }

  function handleFocus() {
    setOpen(true);
    setFilter("");
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <MapPin
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
        />
        <input
          ref={inputRef}
          type="text"
          placeholder="Select or type a venue..."
          value={open ? filter || value : value}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={handleFocus}
          className="w-full rounded-lg border border-border bg-surface-light py-2.5 pl-9 pr-4 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-blue"
        />
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute z-30 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-border bg-surface-light shadow-lg">
          {filtered.map((v) => (
            <button
              key={v}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(v)}
              className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors active:bg-white/5 ${
                v === value ? "font-semibold text-blue" : "text-text-secondary"
              }`}
            >
              <MapPin size={14} className="shrink-0 text-text-muted" />
              {v}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
