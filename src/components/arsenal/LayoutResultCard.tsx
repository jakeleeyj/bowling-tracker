"use client";

import { useState } from "react";
import {
  dualAngleTo2LS,
  TWO_HANDED_PAP,
  type LayoutRecommendation,
} from "@/lib/layoutEngine";
import type { PapPosition, Handedness } from "@/lib/layoutGeometry";
import BallLayoutDiagram from "@/components/arsenal/BallLayoutDiagram";

export type LayoutSystem = "dual" | "vls" | "2ls";

export default function LayoutResultCard({
  layout,
  pap,
  hand = "right",
  twoHanded = false,
  span,
  onSystemChange,
}: {
  layout: LayoutRecommendation;
  pap?: PapPosition;
  hand?: Handedness;
  twoHanded?: boolean;
  span?: number;
  onSystemChange?: (system: LayoutSystem) => void;
}) {
  // Two-handers use Storm's 2LS only; one-handers use Dual Angle or VLS
  const availableSystems: LayoutSystem[] = twoHanded
    ? ["2ls"]
    : ["dual", "vls"];
  const [system, setSystem] = useState<LayoutSystem>(
    twoHanded ? "2ls" : "dual",
  );
  const activeSystem = availableSystems.includes(system)
    ? system
    : availableSystems[0];
  // Storm's two-handed convention: PAP located 5" over, 1" down from bridge
  const effectivePap = pap ?? (twoHanded ? { ...TWO_HANDED_PAP } : undefined);
  const twoLS = dualAngleTo2LS(
    layout.dualAngle,
    effectivePap ?? { over: 4.5, up: 0 },
  );
  const systemViews = {
    dual: {
      label: "Dual Angle",
      value: `${layout.dualAngle.drillingAngle}° × ${layout.dualAngle.pinToPap}" × ${layout.dualAngle.valAngle}°`,
      legend: "drilling angle × pin-to-PAP × VAL angle",
      note: "Works for any ball; the standard modern system.",
    },
    vls: {
      label: "VLS",
      value: `${layout.vls.pinToPap}" × ${twoLS.psaToPap}" × ${layout.vls.pinBuffer}"`,
      legend: "pin-to-PAP × PSA-to-PAP × pin buffer",
      note: "Storm's pin buffer system; buffer is the pin-to-VAL distance.",
    },
    "2ls": {
      label: "2LS",
      value: `${twoLS.pinToPap}" × ${twoLS.psaToPap}" × ${twoLS.pinToCog}"`,
      legend: "pin-to-PAP × PSA-to-PAP × pin-to-COG",
      note: "Storm's 2-hand layout system, measured from the bridge center.",
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
        {availableSystems.length > 1 && (
          <div className="mb-3 flex rounded-lg bg-surface-light p-1">
            {availableSystems.map((key) => (
              <button
                key={key}
                onClick={() => pick(key)}
                className={`flex-1 rounded-md py-2 text-xs font-semibold transition-all duration-150 ${
                  activeSystem === key
                    ? "bg-blue/20 text-blue"
                    : "text-text-muted active:scale-95"
                }`}
              >
                {systemViews[key].label}
              </button>
            ))}
          </div>
        )}
        <div className="mb-4 rounded-lg bg-blue/10 p-4 text-center">
          <p className="text-xs text-text-muted">
            {systemViews[activeSystem].label}
          </p>
          <p className="text-2xl font-extrabold text-text-primary">
            {systemViews[activeSystem].value}
          </p>
          <p className="mt-1 text-[10px] text-text-muted">
            {systemViews[activeSystem].legend}
          </p>
          <p className="mt-1 text-[10px] text-text-secondary">
            {systemViews[activeSystem].note}
          </p>
        </div>
        <BallLayoutDiagram
          layout={layout.dualAngle}
          pap={effectivePap}
          hand={hand}
          system={activeSystem}
          showThumb={!twoHanded}
          span={span}
        />
      </div>

      {layout.reasons.length > 0 && (
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
      )}
    </div>
  );
}
