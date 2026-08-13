"use client";

import {
  formatSpeed,
  type FlightAnalysis,
  type SpeedUnit,
} from "@/lib/flightAnalysis";

const MATCH_LABELS = {
  "speed-dominant": "Speed-dominant",
  matched: "Matched",
  "rev-dominant": "Rev-dominant",
} as const;

export default function StyleResultCard({
  analysis,
  speedUnit = "mph",
}: {
  analysis: FlightAnalysis;
  speedUnit?: SpeedUnit;
}) {
  // Balance meter: 0 = all speed, 1 = all revs; matched band is 0.35–0.65
  const meterPos = Math.min(1, Math.max(0, analysis.ratio - 0.5));

  return (
    <div className="glass-strong animate-slide-up p-5">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
        Your style
      </p>
      <p className="mb-1 text-2xl font-extrabold capitalize text-text-primary">
        {analysis.style}
      </p>
      <p className="mb-4 text-sm font-semibold text-blue">
        {MATCH_LABELS[analysis.match]} ·{" "}
        {formatSpeed(analysis.specs.ballSpeedMph, speedUnit)} /{" "}
        {Math.round(analysis.specs.revRate)} rpm
      </p>

      <div className="mb-1 flex justify-between text-[10px] uppercase tracking-wide text-text-muted">
        <span>Speed</span>
        <span>Balanced</span>
        <span>Revs</span>
      </div>
      <div className="relative mb-4 h-2 rounded-full bg-surface-light">
        <div className="absolute inset-y-0 left-[35%] right-[35%] rounded-full bg-green/20" />
        <div
          className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-blue shadow-lg shadow-blue/40"
          style={{ left: `${meterPos * 100}%` }}
        />
      </div>

      <ul className="flex flex-col gap-2.5">
        {analysis.reasons.map((reason, i) => (
          <li
            key={i}
            className="flex gap-2 text-xs leading-relaxed text-text-secondary"
          >
            <span className="mt-0.5 shrink-0 text-blue">•</span>
            {reason}
          </li>
        ))}
      </ul>
    </div>
  );
}
