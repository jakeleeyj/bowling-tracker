"use client";

import {
  formatSpeed,
  type FlightAnalysis,
  type SpeedUnit,
} from "@/lib/flightAnalysis";
import type { LayoutRecommendation } from "@/lib/layoutEngine";

const MATCH_LABELS = {
  "speed-dominant": "Speed-dominant",
  matched: "Matched",
  "rev-dominant": "Rev-dominant",
} as const;

export default function AnalysisResults({
  analysis,
  layout,
  speedUnit = "mph",
}: {
  analysis: FlightAnalysis;
  layout: LayoutRecommendation;
  speedUnit?: SpeedUnit;
}) {
  // Balance meter: 0 = all speed, 1 = all revs; matched band is 0.4–0.6
  const meterPos = Math.min(1, Math.max(0, (analysis.ratio - 0.5) / 1));

  return (
    <div className="animate-slide-up flex flex-col gap-4">
      <div className="glass-strong p-5">
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
        <div className="relative h-2 rounded-full bg-surface-light">
          <div className="absolute inset-y-0 left-[35%] right-[35%] rounded-full bg-green/20" />
          <div
            className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-blue shadow-lg shadow-blue/40"
            style={{ left: `${meterPos * 100}%` }}
          />
        </div>
      </div>

      <div className="glass p-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
          Recommended layout
        </p>
        <div className="mb-4 rounded-lg bg-blue/10 p-4 text-center">
          <p className="text-xs text-text-muted">Dual Angle</p>
          <p className="text-2xl font-extrabold text-text-primary">
            {layout.dualAngle.drillingAngle}° × {layout.dualAngle.pinToPap}
            &quot; × {layout.dualAngle.valAngle}°
          </p>
          <p className="mt-1 text-[10px] text-text-muted">
            drilling angle × pin-to-PAP × VAL angle
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-surface-light p-3 text-center">
            <p className="text-[10px] uppercase tracking-wide text-text-muted">
              VLS (symmetric)
            </p>
            <p className="text-sm font-bold text-text-primary">
              {layout.vls.pinToPap}&quot; × {layout.vls.pinBuffer}&quot;
            </p>
          </div>
          <div className="rounded-lg bg-surface-light p-3 text-center">
            <p className="text-[10px] uppercase tracking-wide text-text-muted">
              2LS (asymmetric)
            </p>
            <p className="text-sm font-bold text-text-primary">
              {layout.twoLS.pinToPap}&quot; × {layout.twoLS.psaToPap}&quot; ×{" "}
              {layout.twoLS.pinBuffer}&quot;
            </p>
          </div>
        </div>
      </div>

      <div className="glass p-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
          Why this layout
        </p>
        <ul className="flex flex-col gap-2.5">
          {[...analysis.reasons.slice(1), ...layout.reasons].map(
            (reason, i) => (
              <li
                key={i}
                className="flex gap-2 text-xs leading-relaxed text-text-secondary"
              >
                <span className="mt-0.5 shrink-0 text-blue">•</span>
                {reason}
              </li>
            ),
          )}
        </ul>
      </div>
    </div>
  );
}
