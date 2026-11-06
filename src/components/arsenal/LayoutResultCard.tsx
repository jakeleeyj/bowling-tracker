"use client";

import { Fragment, useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  dualAngleTo2LS,
  TWO_HANDED_PAP,
  type LayoutRecommendation,
} from "@/lib/layoutEngine";
import type { PapPosition, Handedness } from "@/lib/layoutGeometry";
import BallView from "@/components/arsenal/BallView";

import type { LayoutSystem } from "@/lib/layoutEngine";
export type { LayoutSystem };

const MARKS = [
  ["Pin", "The coloured dot on the ball. It marks the top of the core."],
  ["PAP", "Positive axis point. The spot your ball spins around, on the grip side."],
  ["PSA", "The second marker on asymmetric balls. It shows the core's preferred spin direction."],
  ["VAL", "Vertical axis line. A line through your PAP, square to the line to your grip."],
  ["CG", "Centre of gravity. Marks the heavy side of the undrilled ball."],
  ["Bridge", "The gap between your two finger holes."],
] as const;

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
  const flare = "Sets how much the ball flares. Most flare at 3 to 4\", less closer or farther.";
  const sideRoll =
    "Sets how quickly the ball gives up its side roll at the breakpoint.";
  const systemViews = {
    dual: {
      label: "Dual Angle",
      value: `${layout.dualAngle.drillingAngle}° × ${layout.dualAngle.pinToPap}" × ${layout.dualAngle.valAngle}°`,
      note: "The most widely used layout system. Works on any ball.",
      rows: [
        {
          value: `${layout.dualAngle.drillingAngle}°`,
          name: "Drilling angle",
          detail:
            "Lower rolls earlier and smoother. Higher skids longer and turns sharper. Range 10 to 90°.",
        },
        { value: `${layout.dualAngle.pinToPap}"`, name: "Pin to PAP", detail: flare },
        {
          value: `${layout.dualAngle.valAngle}°`,
          name: "VAL angle",
          detail:
            "Lower revs up and turns quicker. Higher revs up and turns slower. Range 20 to 70°.",
        },
      ],
    },
    vls: {
      label: "VLS",
      value: `${layout.vls.pinToPap}" × ${twoLS.psaToPap}" × ${layout.vls.pinBuffer}"`,
      note: "Storm's layout system, also called Pin Buffer.",
      rows: [
        { value: `${layout.vls.pinToPap}"`, name: "Pin to PAP", detail: flare },
        { value: `${twoLS.psaToPap}"`, name: "PSA to PAP", detail: sideRoll },
        {
          value: `${layout.vls.pinBuffer}"`,
          name: "Pin buffer",
          detail:
            "Pin to VAL distance. Shorter turns sharper at the breakpoint. Longer arcs more smoothly.",
        },
      ],
    },
    "2ls": {
      label: "2LS",
      value: `${twoLS.pinToPap}" × ${twoLS.psaToPap}" × ${twoLS.pinToCog}"`,
      note: "Storm's system for two-handed bowlers, measured from the centre of your bridge.",
      rows: [
        {
          value: `${twoLS.pinToPap}"`,
          name: "Pin to PAP",
          detail:
            "Sets how much the ball flares. Over 3⅜\" gives a later, sharper breakpoint.",
        },
        { value: `${twoLS.psaToPap}"`, name: "PSA to PAP", detail: sideRoll },
        {
          value: `${twoLS.pinToCog}"`,
          name: "Pin to bridge",
          detail:
            "How far the pin sits from the centre of your bridge. Places the layout around your grip.",
        },
      ],
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
        <div className="rounded-lg bg-white/[0.06] p-4 text-center">
          <p className="text-2xl font-extrabold tabular-nums text-text-primary">
            {systemViews[activeSystem].value}
          </p>
          <p className="mt-1 text-[11px] text-text-secondary">
            {systemViews[activeSystem].note}
          </p>
        </div>
        <dl className="mt-4 mb-4 flex flex-col gap-3">
          {systemViews[activeSystem].rows.map((row) => (
            <div key={row.name} className="grid grid-cols-[52px_1fr] gap-2.5">
              <dt className="text-[17px] font-bold tabular-nums text-text-primary">
                {row.value}
              </dt>
              <dd>
                <p className="text-xs font-semibold text-text-primary">
                  {row.name}
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-text-secondary">
                  {row.detail}
                </p>
              </dd>
            </div>
          ))}
        </dl>
        <BallView
          layout={layout.dualAngle}
          pap={effectivePap}
          hand={hand}
          system={activeSystem}
          showThumb={!twoHanded}
          span={span}
        />
      </div>

      <details className="glass group p-5">
        <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold [&::-webkit-details-marker]:hidden">
          What the marks are
          <ChevronDown
            size={16}
            aria-hidden
            className="text-text-muted transition-transform duration-200 group-open:rotate-180"
          />
        </summary>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-xs leading-relaxed">
          {MARKS.map(([term, meaning]) => (
            <Fragment key={term}>
              <dt className="font-semibold text-text-primary">{term}</dt>
              <dd className="text-text-secondary">{meaning}</dd>
            </Fragment>
          ))}
        </dl>
      </details>

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
