"use client";

import { useEffect, useState } from "react";
import { HelpCircle } from "lucide-react";
import {
  STYLE_PRESETS,
  SPEC_LIMITS,
  kmhToMph,
  mphToKmh,
  type BowlerSpecs,
  type SpeedUnit,
} from "@/lib/flightAnalysis";
import type { LaneCondition } from "@/lib/layoutEngine";

const PRESET_LABELS: Record<keyof typeof STYLE_PRESETS, string> = {
  stroker: "Smooth & accurate",
  tweener: "A bit of both",
  cranker: "Big hook",
  "two-handed": "High revs, no thumb",
};

const FIELD_HELP: Record<string, string> = {
  speed:
    "Time your ball from release to pins (60 ft). 2.4 seconds ≈ 17 mph (27 km/h), 2.9 seconds ≈ 14 mph (23 km/h). Most house monitors also show it.",
  revs: "Film your shot in slow motion, count tape rotations in the first second. A typical league bowler is 250–350 rpm.",
  tilt: "How much the ball spins like a top. 0–15° is normal, 30°+ means you're a spinner. If unsure, leave the default.",
  rotation:
    "How much side-turn you put on the ball. 0° = end-over-end, 90° = full sideways. Most players are 30–60°.",
};

export interface AnalyzeInput {
  specs: BowlerSpecs;
  lane: LaneCondition;
  speedUnit: SpeedUnit;
}

const SPEED_UNIT_KEY = "spare-me-speed-unit";

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
  const [speedUnit, setSpeedUnit] = useState<SpeedUnit>("mph");

  useEffect(() => {
    const saved = localStorage.getItem(SPEED_UNIT_KEY);
    if (saved === "kmh") {
      setSpeedUnit("kmh");
      setSpeed((s) =>
        String(Math.round(mphToKmh(parseFloat(s) || 16) * 10) / 10),
      );
    }
  }, []);

  function switchUnit(unit: SpeedUnit) {
    if (unit === speedUnit) return;
    setSpeedUnit(unit);
    localStorage.setItem(SPEED_UNIT_KEY, unit);
    const value = parseFloat(speed);
    if (Number.isFinite(value)) {
      const converted = unit === "kmh" ? mphToKmh(value) : kmhToMph(value);
      setSpeed(String(Math.round(converted * 10) / 10));
    }
  }

  function submit() {
    const rawSpeed = parseFloat(speed);
    const speedMph = Number.isFinite(rawSpeed)
      ? speedUnit === "kmh"
        ? kmhToMph(rawSpeed)
        : rawSpeed
      : 16;
    const specs: BowlerSpecs =
      mode === "preset"
        ? STYLE_PRESETS[preset]
        : {
            ballSpeedMph: Math.round(speedMph * 10) / 10,
            revRate: parseFloat(revs) || 300,
            axisTilt: parseFloat(tilt) || 13,
            axisRotation: parseFloat(rotation) || 45,
          };
    onAnalyze({ specs, lane, speedUnit });
  }

  const numberField = (
    label: string,
    helpKey: string,
    value: string,
    setValue: (v: string) => void,
    unit: React.ReactNode,
    limits: { min: number; max: number },
  ) => (
    <div>
      <div className="mb-1 flex items-center gap-1.5">
        <label className="block text-xs text-text-muted">{label}</label>
        <button
          onClick={() => setOpenHelp(openHelp === helpKey ? null : helpKey)}
          aria-label={`Help for ${label}`}
          className="-m-2 p-2 text-text-muted active:scale-90"
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
      <div className="glass p-4">
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
              <span className="flex gap-1">
                {(["mph", "kmh"] as const).map((u) => (
                  <button
                    key={u}
                    onClick={() => switchUnit(u)}
                    className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase transition-all duration-150 ${
                      speedUnit === u
                        ? "bg-blue/20 text-blue"
                        : "bg-surface-light text-text-muted active:scale-95"
                    }`}
                  >
                    {u === "kmh" ? "km/h" : "mph"}
                  </button>
                ))}
              </span>,
              speedUnit === "kmh"
                ? {
                    min: Math.round(mphToKmh(SPEC_LIMITS.ballSpeedMph.min)),
                    max: Math.round(mphToKmh(SPEC_LIMITS.ballSpeedMph.max)),
                  }
                : SPEC_LIMITS.ballSpeedMph,
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

      <div className="glass p-4">
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
