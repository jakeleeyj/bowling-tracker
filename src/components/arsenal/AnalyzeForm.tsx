"use client";

import { useEffect, useState } from "react";
import { HelpCircle } from "lucide-react";
import {
  STYLE_PRESETS,
  SPEC_LIMITS,
  kmhToMph,
  parseMeasure,
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
  pap: 'Your Positive Axis Point: where your ball\'s rotation axis sits, measured from the grip center. A pro shop can mark it, or find it from the track flare rings. Typical: 4–5" over, 0–1" up. Leave blank if unknown.',
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
export const PAP_KEY = "spare-me-pap";

export function loadStoredPap(): PapPosition | undefined {
  try {
    const raw = localStorage.getItem(PAP_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.over !== "number" || typeof parsed?.up !== "number")
      return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

export default function AnalyzeForm({
  onAnalyze,
}: {
  onAnalyze: (input: AnalyzeInput) => void;
}) {
  const [mode, setMode] = useState<"preset" | "manual">("preset");
  const [preset, setPreset] = useState<keyof typeof STYLE_PRESETS>("tweener");
  const [speed, setSpeed] = useState("28");
  const [revs, setRevs] = useState("300");
  const [tilt, setTilt] = useState("13");
  const [rotation, setRotation] = useState("45");
  const [openHelp, setOpenHelp] = useState<string | null>(null);
  const [speedUnit, setSpeedUnit] = useState<SpeedUnit>("kmh");
  const [papOver, setPapOver] = useState("");
  const [papUp, setPapUp] = useState("");
  const [hand, setHand] = useState<Handedness>("right");
  const [twoHanded, setTwoHanded] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(HAND_KEY) === "left") setHand("left");
    if (localStorage.getItem(GRIP_KEY) === "two") setTwoHanded(true);
    const storedPap = loadStoredPap();
    if (storedPap) {
      setPapOver(String(storedPap.over));
      setPapUp(storedPap.up !== 0 ? String(storedPap.up) : "");
    }
    // km/h is the default; only switch if the user chose mph before
    if (localStorage.getItem(SPEED_UNIT_KEY) === "mph") {
      setSpeedUnit("mph");
      setSpeed((s) =>
        String(Math.round(kmhToMph(parseFloat(s) || 28) * 10) / 10),
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
      : 17.4;
    const specs: BowlerSpecs =
      mode === "preset"
        ? STYLE_PRESETS[preset]
        : {
            ballSpeedMph: Math.round(speedMph * 10) / 10,
            revRate: parseFloat(revs) || 300,
            axisTilt: parseFloat(tilt) || 13,
            axisRotation: parseFloat(rotation) || 45,
          };
    const over = parseMeasure(papOver);
    const up = parseMeasure(papUp);
    const pap =
      mode === "manual" && Number.isFinite(over)
        ? { over, up: Number.isFinite(up) ? up : 0 }
        : undefined;
    if (pap) localStorage.setItem(PAP_KEY, JSON.stringify(pap));
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

  const pillThumb = (count: number, index: number) => (
    <span
      aria-hidden
      className="absolute inset-y-[3px] left-[3px] rounded-md bg-blue shadow-sm transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]"
      style={{
        width: `calc((100% - 6px) / ${count})`,
        transform: `translateX(${index * 100}%)`,
      }}
    />
  );

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
        <label
          htmlFor={`analyze-${helpKey}`}
          className="block text-xs text-text-muted"
        >
          {label}
        </label>
        <button
          onClick={() => setOpenHelp(openHelp === helpKey ? null : helpKey)}
          aria-label={`Help for ${label}`}
          aria-expanded={openHelp === helpKey}
          className="-my-3 -ml-1 flex h-10 w-10 items-center justify-center text-text-muted transition-transform duration-150 active:scale-[0.94]"
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
        id={`analyze-${helpKey}`}
        type="number"
        inputMode="decimal"
        min={limits.min}
        max={limits.max}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-11 w-full rounded-lg border border-border bg-surface-light px-4 text-base tabular-nums text-text-primary outline-none focus:border-blue"
      />
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="glass p-4">
        <h2 className="mb-3 text-sm font-semibold">Your numbers</h2>
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs text-text-muted">Grip</span>
          <div className="relative flex h-11 w-[200px] rounded-lg bg-surface-light p-[3px]">
            {pillThumb(2, twoHanded ? 1 : 0)}
            {(
              [
                [false, "One-handed"],
                [true, "Two-handed"],
              ] as const
            ).map(([two, label]) => (
              <button
                key={label}
                onClick={() => switchGrip(two)}
                aria-pressed={twoHanded === two}
                className={`relative flex-1 rounded-md text-sm font-semibold transition-colors duration-200 ${
                  twoHanded === two ? "text-white" : "text-text-muted"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs text-text-muted">Bowling hand</span>
          <div className="relative flex h-11 w-[200px] rounded-lg bg-surface-light p-[3px]">
            {pillThumb(2, hand === "right" ? 0 : 1)}
            {(["right", "left"] as const).map((h) => (
              <button
                key={h}
                onClick={() => switchHand(h)}
                aria-pressed={hand === h}
                className={`relative flex-1 rounded-md text-sm font-semibold capitalize transition-colors duration-200 ${
                  hand === h ? "text-white" : "text-text-muted"
                }`}
              >
                {h}
              </button>
            ))}
          </div>
        </div>
        <div className="relative mb-4 flex h-11 rounded-lg bg-surface-light p-[3px]">
          {pillThumb(2, mode === "preset" ? 0 : 1)}
          {(["preset", "manual"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
              className={`relative flex-1 rounded-md text-xs font-semibold transition-colors duration-200 ${
                mode === m ? "text-white" : "text-text-muted"
              }`}
            >
              {m === "preset"
                ? "Not sure? Pick my style"
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
                aria-pressed={preset === key}
                className={`rounded-lg border p-3 text-left transition-[transform,background-color,border-color] duration-150 active:scale-[0.97] ${
                  preset === key
                    ? "border-blue bg-blue/10"
                    : "border-border bg-surface-light"
                }`}
              >
                <p className="text-sm font-semibold capitalize text-text-primary">
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
              <span className="relative flex h-10 w-28 rounded-lg bg-surface-light p-[3px]">
                {pillThumb(2, speedUnit === "kmh" ? 0 : 1)}
                {(["kmh", "mph"] as const).map((u) => (
                  <button
                    key={u}
                    onClick={() => switchUnit(u)}
                    aria-pressed={speedUnit === u}
                    className={`relative flex-1 rounded-md text-xs font-semibold transition-colors duration-200 ${
                      speedUnit === u ? "text-white" : "text-text-muted"
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
                <span className="block text-xs text-text-muted">
                  PAP (optional)
                </span>
                <button
                  onClick={() => setOpenHelp(openHelp === "pap" ? null : "pap")}
                  aria-label="Help for PAP"
                  aria-expanded={openHelp === "pap"}
                  className="-my-3 -ml-1 flex h-10 w-10 items-center justify-center text-text-muted transition-transform duration-150 active:scale-[0.94]"
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
                  type="text"
                  value={papOver}
                  onChange={(e) => setPapOver(e.target.value)}
                  placeholder={'over (e.g. 4 1/2")'}
                  aria-label="PAP over"
                  className="h-11 min-w-0 flex-1 rounded-lg border border-border bg-surface-light px-4 text-base text-text-primary outline-none placeholder:text-text-muted focus:border-blue"
                />
                <input
                  type="text"
                  value={papUp}
                  onChange={(e) => setPapUp(e.target.value)}
                  placeholder={'up (e.g. 1/2")'}
                  aria-label="PAP up"
                  className="h-11 min-w-0 flex-1 rounded-lg border border-border bg-surface-light px-4 text-base text-text-primary outline-none placeholder:text-text-muted focus:border-blue"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <button
        onClick={submit}
        className="rounded-xl bg-blue py-4 text-base font-semibold text-white inset-shadow-2xs inset-shadow-white/20 transition-transform duration-150 ease-out active:scale-[0.97]"
      >
        Analyze
      </button>
    </div>
  );
}
