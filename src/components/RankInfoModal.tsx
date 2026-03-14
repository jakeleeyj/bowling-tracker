"use client";

import { useState } from "react";
import { Info, X } from "lucide-react";

const RANK_TABLE = [
  { name: "Iron", avg: "< 120", color: "text-gray-400" },
  { name: "Bronze", avg: "120–140", color: "text-amber-600" },
  { name: "Silver", avg: "140–160", color: "text-gray-300" },
  { name: "Gold", avg: "160–175", color: "text-gold" },
  { name: "Platinum", avg: "175–190", color: "text-cyan-400" },
  { name: "Diamond", avg: "190–205", color: "text-blue" },
  { name: "Master", avg: "205–220", color: "text-purple" },
  { name: "Grandmaster", avg: "220+", color: "text-red" },
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
          {/* Backdrop */}
          <div className="absolute inset-0 bg-surface/80 backdrop-blur-sm" />

          {/* Modal */}
          <div
            className="glass-strong relative z-10 w-full max-w-[400px] max-h-[80vh] overflow-y-auto rounded-2xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
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

            {/* Explainer */}
            <div className="mb-4 space-y-2.5 text-[12px] leading-relaxed text-text-secondary">
              <p>
                Your <span className="font-bold text-text-primary">MMR</span> is
                based on your bowling scores relative to a 180 baseline. Recent
                games are weighted more heavily than older ones, so your rank
                reflects current form.
              </p>
              <p>
                Competitive sessions count more:{" "}
                <span className="text-text-primary">Tournament</span> games have
                the highest weight, followed by{" "}
                <span className="text-text-primary">League</span>, then{" "}
                <span className="text-text-primary">Casual</span>.
              </p>
              <p>
                You need{" "}
                <span className="font-bold text-text-primary">3 games</span> to
                finish calibration and receive your initial rank.
              </p>
            </div>

            {/* Tier table */}
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
                  <span className="text-[11px] text-text-muted">
                    ~{r.avg} avg
                  </span>
                </div>
              ))}
            </div>

            <p className="mt-3 text-[10px] text-text-muted">
              Each tier (except Master & Grandmaster) has 4 divisions: IV to I
            </p>
          </div>
        </div>
      )}
    </>
  );
}
