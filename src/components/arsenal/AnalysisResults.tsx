"use client";

import {
  formatSpeed,
  type FlightAnalysis,
  type SpeedUnit,
} from "@/lib/flightAnalysis";
import type { LayoutRecommendation } from "@/lib/layoutEngine";
import BallLayoutDiagram from "@/components/arsenal/BallLayoutDiagram";
import type { PapPosition, Handedness } from "@/lib/layoutGeometry";
import { useState } from "react";

const MATCH_LABELS = {
  "speed-dominant": "Speed-dominant",
  matched: "Matched",
  "rev-dominant": "Rev-dominant",
} as const;

export default function AnalysisResults({
  analysis,
  layout,
  speedUnit = "mph",
  pap,
  hand = "right",
}: {
  analysis: FlightAnalysis;
  layout: LayoutRecommendation;
  speedUnit?: SpeedUnit;
  pap?: PapPosition;
  hand?: Handedness;
}) {
  const [system, setSystem] = useState<"dual" | "vls" | "2ls">("dual");
  const systemViews = {
    dual: {
      label: "Dual Angle",
      value: `${layout.dualAngle.drillingAngle}° × ${layout.dualAngle.pinToPap}" × ${layout.dualAngle.valAngle}°`,
      legend: "drilling angle × pin-to-PAP × VAL angle",
      note: "Works for any ball; the standard modern system.",
    },
    vls: {
      label: "VLS",
      value: `${layout.vls.pinToPap}" × ${layout.vls.pinBuffer}"`,
      legend: "pin-to-PAP × pin buffer",
      note: "For symmetric-core balls.",
    },
    "2ls": {
      label: "2LS",
      value: `${layout.twoLS.pinToPap}" × ${layout.twoLS.psaToPap}" × ${layout.twoLS.pinBuffer}"`,
      legend: "pin-to-PAP × PSA-to-PAP × pin buffer",
      note: "For asymmetric-core balls.",
    },
  } as const;
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
        <div className="mb-3 flex rounded-lg bg-surface-light p-1">
          {(Object.keys(systemViews) as (keyof typeof systemViews)[]).map(
            (key) => (
              <button
                key={key}
                onClick={() => setSystem(key)}
                className={`flex-1 rounded-md py-2 text-xs font-semibold transition-all duration-150 ${
                  system === key
                    ? "bg-blue/20 text-blue"
                    : "text-text-muted active:scale-95"
                }`}
              >
                {systemViews[key].label}
              </button>
            ),
          )}
        </div>
        <div className="mb-4 rounded-lg bg-blue/10 p-4 text-center">
          <p className="text-xs text-text-muted">{systemViews[system].label}</p>
          <p className="text-2xl font-extrabold text-text-primary">
            {systemViews[system].value}
          </p>
          <p className="mt-1 text-[10px] text-text-muted">
            {systemViews[system].legend}
          </p>
          <p className="mt-1 text-[10px] text-text-secondary">
            {systemViews[system].note}
          </p>
        </div>
        <div className="mb-4">
          <BallLayoutDiagram
            layout={layout.dualAngle}
            pap={pap}
            hand={hand}
            showPsa={system !== "vls"}
          />
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
