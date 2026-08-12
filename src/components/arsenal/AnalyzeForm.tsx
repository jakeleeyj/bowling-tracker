"use client";

import { useState } from "react";
import { HelpCircle } from "lucide-react";
import {
  STYLE_PRESETS,
  SPEC_LIMITS,
  type BowlerSpecs,
} from "@/lib/flightAnalysis";
import type { LaneCondition } from "@/lib/layoutEngine";

const PRESET_LABELS: Record<keyof typeof STYLE_PRESETS, string> = {
  stroker: "Smooth & accurate",
  tweener: "A bit of both",
  cranker: "Big hook",
  "two-handed": "Two-handed",
};

const FIELD_HELP: Record<string, string> = {
  speed:
    "Time your ball from release to pins (60 ft). 2.4 seconds ≈ 17 mph, 2.9 seconds ≈ 14 mph. Most house monitors also show it.",
  revs: "Film your shot in slow motion, count tape rotations in the first second. A typical league bowler is 250–350 rpm.",
  tilt: "How much the ball spins like a top. 0–15° is normal, 30°+ means you're a spinner. If unsure, leave the default.",
  rotation:
    "How much side-turn you put on the ball. 0° = end-over-end, 90° = full sideways. Most players are 30–60°.",
};

export interface AnalyzeInput {
  specs: BowlerSpecs;
  lane: LaneCondition;
}

export default function AnalyzeForm({
  onAnalyze,
}: {
  onAnalyze: (input: AnalyzeInput) => void;
}) {
  const [mode, setMode] = useState<"preset" | "manual">("preset");
  const [preset, setPreset] = useState<keyof typeof STYLE_PRESETS>("tweener");
  const [speed, setSpeed] = useState("16");
  const [revs, setRevs] = useState("300");
  const [tilt, setTilt] = useState("13");
  const [rotation, setRotation] = useState("45");
  const [lane, setLane] = useState<LaneCondition>("medium");
  const [openHelp, setOpenHelp] = useState<string | null>(null);

  function submit() {
    const specs: BowlerSpecs =
      mode === "preset"
        ? STYLE_PRESETS[preset]
        : {
            ballSpeedMph: parseFloat(speed) || 16,
            revRate: parseFloat(revs) || 300,
            axisTilt: parseFloat(tilt) || 13,
            axisRotation: parseFloat(rotation) || 45,
          };
    onAnalyze({ specs, lane });
  }

  const numberField = (
    label: string,
    helpKey: string,
    value: string,
    setValue: (v: string) => void,
    unit: string,
    limits: { min: number; max: number },
  ) => (
    <div>
      <div className="mb-1 flex items-center gap-1.5">
        <label className="block text-xs text-text-muted">{label}</label>
        <button
          onClick={() => setOpenHelp(openHelp === helpKey ? null : helpKey)}
          aria-label={`Help for ${label}`}
          className="text-text-muted active:scale-90"
        >
          <HelpCircle size={12} />
        </button>
        <span className="ml-auto text-xs text-text-muted">{unit}</span>
      </div>
      {openHelp === helpKey && (
        <p className="animate-slide-down mb-2 rounded-lg bg-surface-light p-3 text-xs leading-relaxed text-text-secondary">
          {FIELD_HELP[helpKey]}
        </p>
      )}
      <input
        type="number"
        inputMode="decimal"
        min={limits.min}
        max={limits.max}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full rounded-lg border border-border bg-surface-light px-4 py-3 text-base text-text-primary outline-none focus:border-blue"
      />
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="glass rounded-xl p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
          Your numbers
        </p>
        <div className="mb-4 flex rounded-lg bg-surface-light p-1">
          {(["preset", "manual"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 rounded-md py-2 text-xs font-semibold transition-all duration-150 ${
                mode === m
                  ? "bg-blue/20 text-blue"
                  : "text-text-muted active:scale-95"
              }`}
            >
              {m === "preset"
                ? "Not sure — pick my style"
                : "I know my numbers"}
            </button>
          ))}
        </div>

        {mode === "preset" ? (
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(STYLE_PRESETS) as (keyof typeof STYLE_PRESETS)[]).map(
              (key) => (
                <button
                  key={key}
                  onClick={() => setPreset(key)}
                  className={`rounded-lg border p-3 text-left transition-all duration-150 active:scale-[0.97] ${
                    preset === key
                      ? "border-blue bg-blue/10"
                      : "border-border bg-surface-light"
                  }`}
                >
                  <p className="text-sm font-bold capitalize text-text-primary">
                    {key}
                  </p>
                  <p className="text-xs text-text-muted">
                    {PRESET_LABELS[key]}
                  </p>
                </button>
              ),
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {numberField(
              "Ball speed",
              "speed",
              speed,
              setSpeed,
              "mph",
              SPEC_LIMITS.ballSpeedMph,
            )}
            {numberField(
              "Rev rate",
              "revs",
              revs,
              setRevs,
              "rpm",
              SPEC_LIMITS.revRate,
            )}
            {numberField(
              "Axis tilt",
              "tilt",
              tilt,
              setTilt,
              "degrees",
              SPEC_LIMITS.axisTilt,
            )}
            {numberField(
              "Axis rotation",
              "rotation",
              rotation,
              setRotation,
              "degrees",
              SPEC_LIMITS.axisRotation,
            )}
          </div>
        )}
      </div>

      <div className="glass rounded-xl p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
          Typical lane condition
        </p>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["dry", "Dry / short"],
              ["medium", "House shot"],
              ["oily", "Heavy oil"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setLane(value)}
              className={`rounded-lg border py-3 text-xs font-semibold transition-all duration-150 active:scale-[0.97] ${
                lane === value
                  ? "border-blue bg-blue/10 text-blue"
                  : "border-border bg-surface-light text-text-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={submit}
        className="rounded-lg bg-gradient-to-r from-blue to-blue-dark py-3 text-sm font-bold text-white shadow-lg shadow-blue/25 transition-all duration-150 active:scale-[0.97]"
      >
        Analyze
      </button>
    </div>
  );
}
