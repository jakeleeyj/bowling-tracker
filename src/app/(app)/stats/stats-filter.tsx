"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { StatsFilter as FilterType } from "@/lib/queries";

const filterLabels: Record<FilterType, string> = {
  last10: "Last 10",
  last50: "Last 50",
  ytd: "YTD",
  all: "Lifetime",
  custom: "Custom",
};

const EVENT_OPTIONS = [
  { value: "", label: "All" },
  { value: "casual", label: "Casual" },
  { value: "League", label: "League" },
  { value: "Tournament", label: "Tournament" },
  { value: "Funbowl", label: "Funbowl" },
];

export default function StatsFilter({
  currentFilter,
  dateFrom,
  dateTo,
  currentEvent,
}: {
  currentFilter: FilterType;
  dateFrom: string;
  dateTo: string;
  currentEvent: string;
}) {
  const router = useRouter();
  const [localDateFrom, setLocalDateFrom] = useState(dateFrom);
  const [localDateTo, setLocalDateTo] = useState(dateTo);

  function buildUrl(f: FilterType, event: string, from = "", to = "") {
    const params = new URLSearchParams({ filter: f });
    if (event) params.set("event", event);
    if (f === "custom" && from && to) {
      params.set("dateFrom", from);
      params.set("dateTo", to);
    }
    return `/stats?${params.toString()}`;
  }

  function handleFilterChange(f: FilterType) {
    if (f === "custom") {
      const to = dateTo || new Date().toISOString().split("T")[0];
      const from =
        dateFrom ||
        new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
      setLocalDateFrom(from);
      setLocalDateTo(to);
      router.push(buildUrl(f, currentEvent, from, to));
    } else {
      router.push(buildUrl(f, currentEvent));
    }
  }

  function handleEventChange(event: string) {
    router.push(buildUrl(currentFilter, event, localDateFrom, localDateTo));
  }

  function handleDateChange(from: string, to: string) {
    setLocalDateFrom(from);
    setLocalDateTo(to);
    if (from && to) {
      router.push(buildUrl("custom", currentEvent, from, to));
    }
  }

  const filters = ["last10", "last50", "ytd", "all", "custom"] as FilterType[];

  return (
    <>
      <div
        role="group"
        aria-label="Date range"
        className="relative mb-2 flex h-11 rounded-lg bg-surface-light p-[3px]"
      >
        <span
          aria-hidden
          className="absolute inset-y-[3px] left-[3px] rounded-md bg-blue shadow-sm transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]"
          style={{
            width: `calc((100% - 6px) / ${filters.length})`,
            transform: `translateX(${filters.indexOf(currentFilter) * 100}%)`,
          }}
        />
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => handleFilterChange(f)}
            aria-pressed={currentFilter === f}
            className={`relative flex-1 rounded-md text-xs font-semibold transition-colors duration-200 ${
              currentFilter === f ? "text-white" : "text-text-muted"
            }`}
          >
            {filterLabels[f]}
          </button>
        ))}
      </div>

      <div
        role="group"
        aria-label="Event type"
        className="mb-3 flex flex-wrap gap-1.5"
      >
        {EVENT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleEventChange(opt.value)}
            aria-pressed={currentEvent === opt.value}
            className={`h-10 rounded-full px-3.5 text-[11px] font-semibold transition-[color,background-color,transform] duration-150 active:scale-[0.94] ${
              currentEvent === opt.value
                ? "bg-purple/20 text-purple"
                : "bg-surface-light/60 text-text-muted active:bg-surface-light/80"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {currentFilter === "custom" && (
        <div className="mb-5 flex items-center gap-2">
          <input
            type="date"
            aria-label="From date"
            value={localDateFrom}
            onChange={(e) => handleDateChange(e.target.value, localDateTo)}
            className="h-11 min-w-0 flex-1 rounded-lg border border-border bg-surface-light px-3 text-sm text-text-primary outline-none focus:border-blue"
          />
          <span className="text-xs text-text-muted">to</span>
          <input
            type="date"
            aria-label="To date"
            value={localDateTo}
            onChange={(e) => handleDateChange(localDateFrom, e.target.value)}
            className="h-11 min-w-0 flex-1 rounded-lg border border-border bg-surface-light px-3 text-sm text-text-primary outline-none focus:border-blue"
          />
        </div>
      )}
    </>
  );
}
