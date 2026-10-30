"use client";

import { useEffect, useState } from "react";
import {
  dualAngleTo2LS,
  TWO_HANDED_PAP,
  type LayoutRecommendation,
} from "@/lib/layoutEngine";
import type { PapPosition, Handedness } from "@/lib/layoutGeometry";
import BallView from "@/components/arsenal/BallView";

import type { LayoutSystem } from "@/lib/layoutEngine";
export type { LayoutSystem };

export default function LayoutResultCard({
  layout,
  pap,
  hand = "right",
  twoHanded = false,
  span,
  defaultSystem,
  onSystemChange,
}: {
  layout: LayoutRecommendation;
  pap?: PapPosition;
  hand?: Handedness;
  twoHanded?: boolean;
  span?: number;
  defaultSystem?: LayoutSystem;
  onSystemChange?: (system: LayoutSystem) => void;
}) {
  // Two-handers use Storm's 2LS only; one-handers use Dual Angle or VLS
  const availableSystems: LayoutSystem[] = twoHanded
    ? ["2ls"]
    : ["dual", "vls"];
  const [system, setSystem] = useState<LayoutSystem>(
    twoHanded ? "2ls" : "dual",
  );
  useEffect(() => {
    if (defaultSystem) setSystem(defaultSystem);
  }, [defaultSystem]);
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
        <h2 className="mb-3 text-sm font-semibold">Layout</h2>
        {availableSystems.length > 1 && (
          <div className="relative mb-3 flex h-11 rounded-lg bg-surface-light p-[3px]">
            <span
              aria-hidden
              className="absolute inset-y-[3px] left-[3px] rounded-md bg-blue shadow-sm transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]"
              style={{
                width: `calc((100% - 6px) / ${availableSystems.length})`,
                transform: `translateX(${availableSystems.indexOf(activeSystem) * 100}%)`,
              }}
            />
            {availableSystems.map((key) => (
              <button
                key={key}
                onClick={() => pick(key)}
                aria-pressed={activeSystem === key}
                className={`relative flex-1 rounded-md text-sm font-semibold transition-colors duration-200 ${
                  activeSystem === key ? "text-white" : "text-text-muted"
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
          <p className="text-2xl font-extrabold tabular-nums text-text-primary">
            {systemViews[activeSystem].value}
          </p>
          <p className="mt-1 text-[11px] text-text-muted">
            {systemViews[activeSystem].legend}
          </p>
          <p className="mt-1 text-[11px] text-text-secondary">
            {systemViews[activeSystem].note}
          </p>
        </div>
        <BallView
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
          <h2 className="mb-3 text-sm font-semibold">Why this layout</h2>
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
