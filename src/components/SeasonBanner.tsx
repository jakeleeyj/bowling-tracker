"use client";

import { useEffect, useState } from "react";
import { X, Clock, Sparkles } from "lucide-react";
import {
  getCurrentSeason,
  getActiveBannerMilestone,
  getSeasonDaysLeft,
  type SeasonMilestone,
} from "@/lib/seasons";

const DISMISS_KEY = "seasonBanner.dismissed";

function readDismissed(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function persistDismissed(set: Set<string>) {
  localStorage.setItem(DISMISS_KEY, JSON.stringify([...set]));
}

export default function SeasonBanner() {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Hydrate dismissed set from localStorage after mount. SSR safety
    // requires deferring storage access; lint flag accepted here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDismissed(readDismissed());
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);
  }, []);

  if (!hydrated) return null;

  const season = getCurrentSeason();
  const milestone = getActiveBannerMilestone(season);
  if (!milestone) return null;

  const key = `${season.number}.${milestone}`;
  if (dismissed.has(key)) return null;

  const daysLeft = getSeasonDaysLeft(season);

  const config: Record<
    SeasonMilestone,
    {
      icon: typeof Clock;
      title: string;
      body: string;
      accent: string;
    }
  > = {
    "30d": {
      icon: Clock,
      title: `${season.shortName} ends in ${daysLeft} days`,
      body: "Squeeze in a few sessions to climb the ranks before the reset.",
      accent: "border-blue/30 bg-blue/10 text-blue",
    },
    "7d": {
      icon: Clock,
      title: `${season.shortName} ends in ${daysLeft} ${daysLeft === 1 ? "day" : "days"}`,
      body: "Final stretch — last chance to lock in your rank for the season.",
      accent: "border-gold/40 bg-gold/10 text-gold",
    },
    started: {
      icon: Sparkles,
      title: `${season.name} has begun`,
      body: `S${season.number - 1} ended — LP soft-reset toward 1200. Calibration starts fresh.`,
      accent: "border-green/30 bg-green/10 text-green",
    },
  };

  const { icon: Icon, title, body, accent } = config[milestone];

  function handleDismiss() {
    const next = new Set(dismissed);
    next.add(key);
    setDismissed(next);
    persistDismissed(next);
  }

  return (
    <div
      className={`mb-3 flex items-start gap-2.5 rounded-lg border px-3 py-2.5 ${accent}`}
    >
      <Icon size={16} className="mt-[1px] shrink-0" />
      <div className="flex-1">
        <div className="text-[13px] font-semibold leading-tight">{title}</div>
        <p className="mt-0.5 text-[11px] leading-snug opacity-80">{body}</p>
      </div>
      <button
        onClick={handleDismiss}
        className="-mr-1 shrink-0 p-1 opacity-60 transition-opacity active:opacity-100"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}
