"use client";

import { useState } from "react";
import { Info, X } from "lucide-react";

const RANK_TABLE = [
  { name: "Iron", lp: "0–1,000", color: "text-gray-400" },
  { name: "Bronze", lp: "1,000–1,200", color: "text-amber-600" },
  { name: "Silver", lp: "1,200–1,400", color: "text-gray-300" },
  { name: "Gold", lp: "1,400–1,600", color: "text-gold" },
  { name: "Platinum", lp: "1,600–1,800", color: "text-cyan-400" },
  { name: "Emerald", lp: "1,800–2,000", color: "text-emerald-400" },
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
        className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 active:bg-white/10"
        aria-label="How ranking works"
      >
        <Info size={14} className="text-text-muted" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-surface/80 backdrop-blur-sm" />

          <div
            className="glass-strong relative z-10 w-full max-w-[400px] max-h-[80vh] overflow-y-auto rounded-2xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-extrabold text-text-primary">
                How Ranking Works
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 active:bg-white/10"
              >
                <X size={14} className="text-text-muted" />
              </button>
            </div>

            <div className="mb-4 space-y-2.5 text-[12px] leading-relaxed text-text-secondary">
              <p>
                You earn <span className="font-bold text-text-primary">LP</span>{" "}
                (League Points) each game based on your score. Games above 180
                earn LP, games below 180 lose LP. Your LP accumulates over time.
              </p>
              <p>
                Your first{" "}
                <span className="font-bold text-text-primary">4 games</span> are
                calibration matches worth 5x LP to set your starting rank.
              </p>
              <p>
                Competitive sessions earn more:{" "}
                <span className="text-text-primary">Tournament</span> (1.5x),{" "}
                <span className="text-text-primary">Funbowl</span> (1.35x),{" "}
                <span className="text-text-primary">League</span> (1.25x),{" "}
                <span className="text-text-primary">Casual</span> (1x).
              </p>
            </div>

            <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-text-muted">
              Rank Tiers
            </h3>
            <div className="space-y-1">
              {RANK_TABLE.map((r) => (
                <div
                  key={r.name}
                  className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2"
                >
                  <span className={`text-[12px] font-bold ${r.color}`}>
                    {r.name}
                  </span>
                  <span className="text-[11px] text-text-muted">{r.lp} LP</span>
                </div>
              ))}
            </div>

            <p className="mt-3 text-[10px] text-text-muted">
              Iron through Diamond have 4 divisions (IV to I). Master,
              Grandmaster, and Challenger have no divisions.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
