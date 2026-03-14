"use client";

import { useState } from "react";
import { Info, X } from "lucide-react";

const RANK_TABLE = [
  { name: "Iron", avg: "< 140", color: "text-gray-400" },
  { name: "Bronze", avg: "140–160", color: "text-amber-700" },
  { name: "Silver", avg: "160–190", color: "text-gray-300" },
  { name: "Gold", avg: "190–215", color: "text-gold" },
  { name: "Platinum", avg: "215–235", color: "text-cyan-400" },
  { name: "Diamond", avg: "235–255", color: "text-blue" },
  { name: "Master", avg: "255–270", color: "text-purple" },
  { name: "Grandmaster", avg: "270+", color: "text-red" },
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
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="glass-strong mx-auto w-full max-w-[480px] rounded-t-2xl p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-extrabold">How Ranking Works</h2>
              <button
                onClick={() => setOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5"
              >
                <X size={14} className="text-text-muted" />
              </button>
            </div>

            <div className="mb-4 space-y-2 text-[12px] leading-relaxed text-text-secondary">
              <p>
                Your <span className="font-bold text-text-primary">MMR</span>{" "}
                (matchmaking rating) is based on your bowling scores relative to
                a 180 baseline. Recent games count more than older ones.
              </p>
              <p>
                Tournament and League games are weighted higher than Casual
                sessions, so competitive play has a bigger impact on your rank.
              </p>
              <p>
                You need{" "}
                <span className="font-bold text-text-primary">3 games</span> to
                finish calibration and receive your rank.
              </p>
            </div>

            <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-text-muted">
              Rank Tiers
            </h3>
            <div className="space-y-1">
              {RANK_TABLE.map((r) => (
                <div
                  key={r.name}
                  className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-1.5"
                >
                  <span className={`text-[12px] font-bold ${r.color}`}>
                    {r.name}
                  </span>
                  <span className="text-[11px] text-text-muted">
                    ~{r.avg} avg
                  </span>
                </div>
              ))}
            </div>

            <p className="mt-3 text-[10px] text-text-muted">
              Each tier (except Master & Grandmaster) has 4 divisions: IV → I
            </p>
          </div>
        </div>
      )}
    </>
  );
}
