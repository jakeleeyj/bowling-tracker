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
import type { PapPosition, Handedness } from "@/lib/layoutGeometry";

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
  pap: 'Your Positive Axis Point — where your ball\'s rotation axis sits, measured from the grip center. A pro shop can mark it, or find it from the track flare rings. Typical: 4–5" over, 0–1" up. Leave blank if unknown.',
};

export interface AnalyzeInput {
  specs: BowlerSpecs;
  speedUnit: SpeedUnit;
  pap?: PapPosition;
  hand: Handedness;
  twoHanded: boolean;
}

const SPEED_UNIT_KEY = "spare-me-speed-unit";
export const HAND_KEY = "spare-me-hand";
export const GRIP_KEY = "spare-me-grip";

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
  const [openHelp, setOpenHelp] = useState<string | null>(null);
  const [speedUnit, setSpeedUnit] = useState<SpeedUnit>("mph");
  const [papOver, setPapOver] = useState("");
  const [papUp, setPapUp] = useState("");
  const [hand, setHand] = useState<Handedness>("right");
  const [twoHanded, setTwoHanded] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(HAND_KEY) === "left") setHand("left");
    if (localStorage.getItem(GRIP_KEY) === "two") setTwoHanded(true);
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
    const over = parseFloat(papOver);
    const up = parseFloat(papUp);
    const pap =
      mode === "manual" && Number.isFinite(over)
        ? { over, up: Number.isFinite(up) ? up : 0 }
        : undefined;
    onAnalyze({
      specs,
      speedUnit,
      pap,
      hand,
      twoHanded: twoHanded || (mode === "preset" && preset === "two-handed"),
    });
  }

  function switchGrip(two: boolean) {
    setTwoHanded(two);
    localStorage.setItem(GRIP_KEY, two ? "two" : "one");
    if (two) setPreset("two-handed");
    else if (preset === "two-handed") setPreset("tweener");
  }

  function switchHand(h: Handedness) {
    setHand(h);
    localStorage.setItem(HAND_KEY, h);
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
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs text-text-muted">Grip</span>
          <div className="flex gap-1">
            {(
              [
                [false, "One-handed"],
                [true, "Two-handed"],
              ] as const
            ).map(([two, label]) => (
              <button
                key={label}
                onClick={() => switchGrip(two)}
                className={`rounded px-2.5 py-1 text-xs font-semibold transition-all duration-150 ${
                  twoHanded === two
                    ? "bg-blue/20 text-blue"
                    : "bg-surface-light text-text-muted active:scale-95"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs text-text-muted">Bowling hand</span>
          <div className="flex gap-1">
            {(["right", "left"] as const).map((h) => (
              <button
                key={h}
                onClick={() => switchHand(h)}
                className={`rounded px-2.5 py-1 text-xs font-semibold capitalize transition-all duration-150 ${
                  hand === h
                    ? "bg-blue/20 text-blue"
                    : "bg-surface-light text-text-muted active:scale-95"
                }`}
              >
                {h}
              </button>
            ))}
          </div>
        </div>
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
            {(
              (twoHanded
                ? ["two-handed"]
                : [
                    "stroker",
                    "tweener",
                    "cranker",
                  ]) as (keyof typeof STYLE_PRESETS)[]
            ).map((key) => (
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
                <p className="text-xs text-text-muted">{PRESET_LABELS[key]}</p>
              </button>
            ))}
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
            <div>
              <div className="mb-1 flex items-center gap-1.5">
                <label className="block text-xs text-text-muted">
                  PAP (optional)
                </label>
                <button
                  onClick={() => setOpenHelp(openHelp === "pap" ? null : "pap")}
                  aria-label="Help for PAP"
                  className="-m-2 p-2 text-text-muted active:scale-90"
                >
                  <HelpCircle size={12} />
                </button>
                <span className="ml-auto text-xs text-text-muted">inches</span>
              </div>
              {openHelp === "pap" && (
                <p className="animate-slide-down mb-2 rounded-lg bg-surface-light p-3 text-xs leading-relaxed text-text-secondary">
                  {FIELD_HELP.pap}
                </p>
              )}
              <div className="flex gap-2">
                <input
                  type="number"
                  inputMode="decimal"
                  value={papOver}
                  onChange={(e) => setPapOver(e.target.value)}
                  placeholder={'over (e.g. 4.5")'}
                  className="min-w-0 flex-1 rounded-lg border border-border bg-surface-light px-4 py-3 text-base text-text-primary outline-none placeholder:text-text-muted focus:border-blue"
                />
                <input
                  type="number"
                  inputMode="decimal"
                  value={papUp}
                  onChange={(e) => setPapUp(e.target.value)}
                  placeholder={'up (e.g. 0.5")'}
                  className="min-w-0 flex-1 rounded-lg border border-border bg-surface-light px-4 py-3 text-base text-text-primary outline-none placeholder:text-text-muted focus:border-blue"
                />
              </div>
            </div>
          </div>
        )}
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
