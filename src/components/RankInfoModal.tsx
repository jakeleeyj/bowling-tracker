"use client";

import { useState } from "react";
import { Info, X } from "lucide-react";
import Sheet from "@/components/Sheet";

const RANK_TABLE = [
  { name: "Iron", lp: "0–1,000", color: "text-iron" },
  { name: "Bronze", lp: "1,000–1,200", color: "text-bronze" },
  { name: "Silver", lp: "1,200–1,400", color: "text-silver" },
  { name: "Gold", lp: "1,400–1,600", color: "text-gold" },
  { name: "Platinum", lp: "1,600–1,800", color: "text-cyan-400" },
  { name: "Emerald", lp: "1,800–2,000", color: "text-emerald" },
  { name: "Diamond", lp: "2,000–2,200", color: "text-blue" },
  { name: "Master", lp: "2,200–2,400", color: "text-purple" },
  { name: "Grandmaster", lp: "2,400–2,600", color: "text-red" },
  { name: "Challenger", lp: "2,600+", color: "text-rose-400" },
];

export default function RankInfoModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative flex h-7 w-7 items-center justify-center rounded-full bg-white/5 transition-[background-color,transform] duration-150 after:absolute after:-inset-1.5 after:content-[''] active:scale-[0.94] active:bg-white/10"
        aria-label="How ranking works"
      >
        <Info size={14} className="text-text-muted" />
      </button>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        labelledBy="rank-info-title"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2
            id="rank-info-title"
            className="text-base font-semibold text-text-primary"
          >
            How ranking works
          </h2>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="relative flex h-7 w-7 items-center justify-center rounded-full bg-white/5 transition-[background-color,transform] duration-150 after:absolute after:-inset-1.5 after:content-[''] active:scale-[0.94] active:bg-white/10"
          >
            <X size={14} className="text-text-muted" />
          </button>
        </div>

        <div className="mb-4 space-y-2.5 text-xs leading-relaxed text-text-secondary">
          <p>
            You earn <span className="font-semibold text-text-primary">LP</span>{" "}
            (League Points) each game based on your score. Games above 185
            earn LP, games below 185 lose LP. Recent games count more: each
            older game counts 1.25% less, down to a 25% floor.
          </p>
          <p>
            Your first{" "}
            <span className="font-semibold text-text-primary">4 games</span>{" "}
            ever are calibration matches worth 5x LP to set your starting
            rank.
          </p>
          <p>
            When a season ends, your LP moves 70% of the way back to 1,200.
            The next season starts from there, and only its games count
            toward LP.
          </p>
          <p>
            Competitive sessions earn more:{" "}
            <span className="text-text-primary">Tournament</span> (1.5x),{" "}
            <span className="text-text-primary">Funbowl</span> (1.35x),{" "}
            <span className="text-text-primary">League</span> (1.25x),{" "}
            <span className="text-text-primary">Casual</span> (1x).
          </p>
        </div>

        <h3 className="mb-2 text-[11px] font-semibold text-text-muted">
          Rank tiers
        </h3>
        <div className="space-y-1">
          {RANK_TABLE.map((r) => (
            <div
              key={r.name}
              className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2"
            >
              <span className={`text-xs font-semibold ${r.color}`}>
                {r.name}
              </span>
              <span className="text-[11px] tabular-nums text-text-muted">
                {r.lp} LP
              </span>
            </div>
          ))}
        </div>

        <p className="mt-3 text-[11px] text-text-muted">
          Iron through Diamond have 4 divisions (IV to I). Master,
          Grandmaster, and Challenger have no divisions.
        </p>
      </Sheet>
    </>
  );
}
