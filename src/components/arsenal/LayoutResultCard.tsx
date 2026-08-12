"use client";

import { useState } from "react";
import type { LayoutRecommendation } from "@/lib/layoutEngine";
import type { PapPosition, Handedness } from "@/lib/layoutGeometry";
import BallLayoutDiagram from "@/components/arsenal/BallLayoutDiagram";

export type LayoutSystem = "dual" | "vls" | "2ls";

export default function LayoutResultCard({
  layout,
  pap,
  hand = "right",
  twoHanded = false,
  onSystemChange,
}: {
  layout: LayoutRecommendation;
  pap?: PapPosition;
  hand?: Handedness;
  twoHanded?: boolean;
  onSystemChange?: (system: LayoutSystem) => void;
}) {
  // Two-handers have no thumb, so Storm's 2LS notation is their default view
  const [system, setSystem] = useState<LayoutSystem>(
    twoHanded ? "2ls" : "dual",
  );
  // Storm's two-handed convention: PAP located 5" over, 2" down from bridge
  const effectivePap = pap ?? (twoHanded ? { over: 5, up: -2 } : undefined);
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

  function pick(key: LayoutSystem) {
    setSystem(key);
    onSystemChange?.(key);
  }

  return (
    <div className="animate-slide-up flex flex-col gap-4">
      <div className="glass p-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
          Recommended layout
        </p>
        <div className="mb-3 flex rounded-lg bg-surface-light p-1">
          {(Object.keys(systemViews) as LayoutSystem[]).map((key) => (
            <button
              key={key}
              onClick={() => pick(key)}
              className={`flex-1 rounded-md py-2 text-xs font-semibold transition-all duration-150 ${
                system === key
                  ? "bg-blue/20 text-blue"
                  : "text-text-muted active:scale-95"
              }`}
            >
              {systemViews[key].label}
            </button>
          ))}
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
        <BallLayoutDiagram
          layout={layout.dualAngle}
          pap={effectivePap}
          hand={hand}
          showPsa={system !== "vls"}
          showThumb={!twoHanded}
        />
      </div>

      <div className="glass p-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
          Why this layout
        </p>
        <ul className="flex flex-col gap-2.5">
          {layout.reasons.map((reason, i) => (
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
    </div>
  );
}
