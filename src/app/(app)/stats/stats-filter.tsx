"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { StatsFilter as FilterType } from "@/lib/queries";

const filterLabels: Record<FilterType, string> = {
  last10: "Last 10",
  last50: "Last 50",
  ytd: "YTD",
  custom: "Custom",
  all: "All",
};

export default function StatsFilter({
  currentFilter,
  dateFrom,
  dateTo,
}: {
  currentFilter: FilterType;
  dateFrom: string;
  dateTo: string;
}) {
  const router = useRouter();
  const [localDateFrom, setLocalDateFrom] = useState(dateFrom);
  const [localDateTo, setLocalDateTo] = useState(dateTo);

  function handleFilterChange(f: FilterType) {
    if (f === "custom") {
      const to = dateTo || new Date().toISOString().split("T")[0];
      const from =
        dateFrom ||
        new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
      setLocalDateFrom(from);
      setLocalDateTo(to);
      router.push(`/stats?filter=custom&dateFrom=${from}&dateTo=${to}`);
    } else {
      router.push(`/stats?filter=${f}`);
    }
  }

  function handleDateChange(from: string, to: string) {
    setLocalDateFrom(from);
    setLocalDateTo(to);
    if (from && to) {
      router.push(`/stats?filter=custom&dateFrom=${from}&dateTo=${to}`);
    }
  }

  return (
    <>
      <div className="mb-3 flex gap-1.5">
        {(["last10", "last50", "ytd", "custom"] as FilterType[]).map((f) => (
          <button
            key={f}
            onClick={() => handleFilterChange(f)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              currentFilter === f
                ? "bg-blue text-white"
                : "bg-surface-light text-text-muted active:bg-surface-light/80"
            }`}
          >
            {filterLabels[f]}
          </button>
        ))}
      </div>

      {currentFilter === "custom" && (
        <div className="mb-5 flex items-center gap-2">
          <input
            type="date"
            value={localDateFrom}
            onChange={(e) => handleDateChange(e.target.value, localDateTo)}
            className="flex-1 rounded-lg border border-border bg-surface-light px-3 py-2 text-sm text-text-primary outline-none focus:border-blue"
          />
          <span className="text-xs text-text-muted">to</span>
          <input
            type="date"
            value={localDateTo}
            onChange={(e) => handleDateChange(localDateFrom, e.target.value)}
            className="flex-1 rounded-lg border border-border bg-surface-light px-3 py-2 text-sm text-text-primary outline-none focus:border-blue"
          />
        </div>
      )}
    </>
  );
}
