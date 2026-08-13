"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { useToast } from "@/components/Toast";
import { BowlingSpinner } from "@/components/Skeleton";
import BackButton from "@/components/BackButton";
import LayoutResultCard from "@/components/arsenal/LayoutResultCard";
import {
  recommendLayout,
  dualAngleToVLS,
  dualAngleTo2LS,
  vlsToDualAngle,
  twoLSToDualAngle,
  lightningArc,
  isValid2LS,
  TWO_HANDED_PAP,
  type LaneCondition,
  type LayoutRecommendation,
} from "@/lib/layoutEngine";
import type { BowlerSpecs } from "@/lib/flightAnalysis";
import type { Handedness } from "@/lib/layoutGeometry";
import { HAND_KEY, GRIP_KEY } from "@/components/arsenal/AnalyzeForm";
import { Sparkles } from "lucide-react";
import type { FlightAnalysisRow } from "@/lib/database.types";

const LANES: [LaneCondition, string][] = [
  ["dry", "Dry / short"],
  ["medium", "House shot"],
  ["oily", "Heavy oil"],
];

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

export default function LayoutPage() {
  const supabase = createClient();
  const router = useRouter();
  const { toast } = useToast();
  const [latest, setLatest] = useState<FlightAnalysisRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"recommended" | "custom">("recommended");
  const [lane, setLane] = useState<LaneCondition>("medium");
  const [hand, setHand] = useState<Handedness>("right");
  const [twoHanded, setTwoHanded] = useState(false);
  const [customSystem, setCustomSystem] = useState<"dual" | "vls" | "2ls">(
    "dual",
  );
  const [customDrill, setCustomDrill] = useState("50");
  const [customPin, setCustomPin] = useState("4.5");
  const [customVal, setCustomVal] = useState("35");
  const [customBuffer, setCustomBuffer] = useState("2.5");
  const [customPsa, setCustomPsa] = useState("4.25");
  const [customCog, setCustomCog] = useState("3.5");
  const [customPapOver, setCustomPapOver] = useState("");
  const [customPapUp, setCustomPapUp] = useState("");
  const [customSpan, setCustomSpan] = useState("");
  const [customGrip, setCustomGrip] = useState<"one" | "two">("one");
  const [ballName, setBallName] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    const { data } = await supabase
      .from("flight_analyses")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setLatest(data ?? null);
    setLoading(false);
  }, [supabase, router]);

  useEffect(() => {
    if (localStorage.getItem(HAND_KEY) === "left") setHand("left");
    if (localStorage.getItem(GRIP_KEY) === "two") {
      setTwoHanded(true);
      setCustomGrip("two");
    }
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex min-h-[60dvh] items-center justify-center">
        <BowlingSpinner />
      </div>
    );
  }

  // In custom mode the grip picker decides; recommended mode follows the
  // saved style / stored preference.
  const isTwoHanded =
    mode === "custom"
      ? customGrip === "two"
      : latest?.style === "two-handed" || twoHanded;
  const effectiveSystem =
    mode === "custom"
      ? isTwoHanded
        ? "2ls"
        : customSystem === "2ls"
          ? "dual"
          : customSystem
      : customSystem;

  const papOverNum = parseFloat(customPapOver);
  const papUpNum = parseFloat(customPapUp);
  const customPap = Number.isFinite(papOverNum)
    ? { over: papOverNum, up: Number.isFinite(papUpNum) ? papUpNum : 0 }
    : isTwoHanded
      ? { ...TWO_HANDED_PAP }
      : { over: 4.5, up: 0 };

  let layout: LayoutRecommendation | null = null;
  if (mode === "custom") {
    const pinToPap = clamp(parseFloat(customPin) || 4.5, 0.75, 6);
    const dualAngle =
      effectiveSystem === "vls"
        ? vlsToDualAngle(
            {
              pinToPap,
              pinBuffer: clamp(parseFloat(customBuffer) || 2.5, 0, 6),
            },
            Number.isFinite(parseFloat(customPsa))
              ? clamp(parseFloat(customPsa), 0.5, 8.5)
              : undefined,
          )
        : effectiveSystem === "2ls"
          ? twoLSToDualAngle(
              {
                pinToPap,
                psaToPap: clamp(parseFloat(customPsa) || 4.25, 0.5, 8.5),
                pinToCog: clamp(parseFloat(customCog) || 3.5, 0.5, 8),
              },
              customPap,
            )
          : {
              drillingAngle: clamp(parseFloat(customDrill) || 50, 10, 90),
              pinToPap,
              valAngle: clamp(parseFloat(customVal) || 35, 20, 90),
            };
    layout = {
      dualAngle,
      vls: dualAngleToVLS(dualAngle),
      twoLS: dualAngleTo2LS(dualAngle, customPap),
      reasons: [],
    };
  } else if (latest) {
    const specs: BowlerSpecs = {
      ballSpeedMph: Number(latest.ball_speed_mph),
      revRate: latest.rev_rate,
      axisTilt: latest.axis_tilt,
      axisRotation: latest.axis_rotation,
    };
    layout = recommendLayout(specs, lane);
  }

  async function saveToBall() {
    if (!layout || !ballName.trim() || saving) return;
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    const { data: ball, error } = await supabase
      .from("balls")
      .insert({
        user_id: user.id,
        name: ballName.trim().slice(0, 60),
        drilling_angle: layout.dualAngle.drillingAngle,
        pin_to_pap: layout.dualAngle.pinToPap,
        val_angle: layout.dualAngle.valAngle,
        pin_buffer: layout.vls.pinBuffer,
        psa_to_pap: layout.twoLS.psaToPap,
        no_thumb: isTwoHanded,
      })
      .select("id")
      .single();
    setSaving(false);
    if (error || !ball) {
      toast("Couldn't save — check your connection", "error");
      return;
    }
    toast("Ball saved to your arsenal");
    router.push(`/arsenal/${ball.id}`);
  }

  const customField = (
    label: string,
    value: string,
    setValue: (v: string) => void,
  ) => (
    <div>
      <label className="mb-1 block text-xs text-text-muted">{label}</label>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full rounded-lg border border-border bg-surface-light px-3 py-2.5 text-sm text-text-primary outline-none focus:border-blue"
      />
    </div>
  );

  return (
    <div className="animate-fade-in px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <BackButton />
        <h1 className="text-xl font-extrabold text-text-primary">
          Get a Layout
        </h1>
      </div>

      <div className="mb-4 flex rounded-lg bg-surface-light p-1">
        {(
          [
            ["recommended", "Recommended for me"],
            ["custom", "Custom layout"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setMode(value)}
            className={`flex-1 rounded-md py-2 text-xs font-semibold transition-all duration-150 ${
              mode === value
                ? "bg-blue/20 text-blue"
                : "text-text-muted active:scale-95"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "recommended" && !latest && (
        <div className="glass p-6 text-center">
          <p className="mb-1 text-sm font-bold text-text-primary">
            Analyze your style first
          </p>
          <p className="mb-4 text-xs leading-relaxed text-text-muted">
            A recommendation is built from your style numbers — takes under a
            minute. Or switch to Custom to enter a layout directly.
          </p>
          <button
            onClick={() => router.push("/arsenal/analyze")}
            className="mx-auto flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue to-blue-dark px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue/25 transition-all duration-150 active:scale-[0.97]"
          >
            <Sparkles size={16} />
            Analyze My Style
          </button>
        </div>
      )}

      {mode === "recommended" && latest && (
        <>
          <div className="glass mb-4 flex items-center justify-between p-4">
            <div>
              <p className="text-xs text-text-muted">Based on your style</p>
              <p className="text-sm font-bold capitalize text-text-primary">
                {latest.style} · {latest.speed_rev_match.replace("-", " ")}
              </p>
            </div>
            <button
              onClick={() => router.push("/arsenal/analyze")}
              className="text-xs font-semibold text-blue active:scale-95"
            >
              Re-analyze
            </button>
          </div>

          <div className="glass mb-4 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
              Lane condition
            </p>
            <div className="grid grid-cols-3 gap-2">
              {LANES.map(([value, label]) => (
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
        </>
      )}

      {mode === "custom" && (
        <div className="glass mb-4 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
            Your layout
          </p>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs text-text-muted">Grip</span>
            <div className="flex gap-1">
              {(
                [
                  ["one", "One-handed"],
                  ["two", "Two-handed"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setCustomGrip(value)}
                  className={`rounded px-2.5 py-1 text-xs font-semibold transition-all duration-150 ${
                    customGrip === value
                      ? "bg-blue/20 text-blue"
                      : "bg-surface-light text-text-muted active:scale-95"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {isTwoHanded ? (
            <p className="mb-3 rounded-lg bg-surface-light p-2 text-center text-xs font-semibold text-blue">
              2LS — the 2-hand layout system
            </p>
          ) : (
            <div className="mb-3 flex rounded-lg bg-surface-light p-1">
              {(
                [
                  ["dual", "Dual Angle"],
                  ["vls", "VLS"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setCustomSystem(value)}
                  className={`flex-1 rounded-md py-2 text-xs font-semibold transition-all duration-150 ${
                    effectiveSystem === value
                      ? "bg-blue/20 text-blue"
                      : "text-text-muted active:scale-95"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          <div className="grid grid-cols-3 gap-3">
            {effectiveSystem === "dual" && (
              <>
                {customField("Drill angle °", customDrill, setCustomDrill)}
                {customField('Pin-to-PAP "', customPin, setCustomPin)}
                {customField("VAL angle °", customVal, setCustomVal)}
              </>
            )}
            {effectiveSystem === "vls" && (
              <>
                {customField('Pin-to-PAP "', customPin, setCustomPin)}
                {customField('PSA-to-PAP "', customPsa, setCustomPsa)}
                {customField('Pin buffer "', customBuffer, setCustomBuffer)}
              </>
            )}
            {effectiveSystem === "2ls" && (
              <>
                {customField('Pin-to-PAP "', customPin, setCustomPin)}
                {customField('PSA-to-PAP "', customPsa, setCustomPsa)}
                {customField('Pin-to-COG "', customCog, setCustomCog)}
              </>
            )}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {customField(
              `PAP over " (default ${isTwoHanded ? "5" : "4.5"})`,
              customPapOver,
              setCustomPapOver,
            )}
            {customField('PAP up " (− = down)', customPapUp, setCustomPapUp)}
            {!isTwoHanded &&
              customField('Span " (optional)', customSpan, setCustomSpan)}
          </div>
          {effectiveSystem === "2ls" &&
            layout &&
            !isValid2LS(
              {
                pinToPap: layout.dualAngle.pinToPap,
                psaToPap: clamp(parseFloat(customPsa) || 4.25, 0.5, 8.5),
                pinToCog: clamp(parseFloat(customCog) || 3.5, 0.5, 8),
              },
              customPap,
            ) && (
              <p className="mt-2 rounded-lg bg-red/10 p-3 text-[10px] leading-relaxed text-red">
                These distances can&apos;t meet on the ball with your PAP —
                Storm&apos;s Lightning Arc for a {customPap.over}&quot; ×{" "}
                {Math.abs(customPap.up)}&quot; PAP is {lightningArc(customPap)}
                &quot;, so pin-to-PAP and pin-to-COG must differ by less than
                that. The preview shows the nearest drillable layout.
              </p>
            )}
          <p className="mt-2 text-[10px] leading-relaxed text-text-muted">
            Enter the numbers you know — the tabs below convert between all
            three systems automatically.
          </p>
        </div>
      )}

      {layout && (
        <>
          <LayoutResultCard
            layout={layout}
            hand={hand}
            twoHanded={isTwoHanded}
            pap={mode === "custom" ? customPap : undefined}
            span={
              mode === "custom" && Number.isFinite(parseFloat(customSpan))
                ? clamp(parseFloat(customSpan), 3, 6)
                : undefined
            }
          />

          <div className="glass mt-4 p-4">
            <label className="mb-1 block text-xs text-text-muted">
              Save this layout to a ball
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={ballName}
                onChange={(e) => setBallName(e.target.value)}
                placeholder="e.g. Storm Phaze II"
                maxLength={60}
                className="min-w-0 flex-1 rounded-lg border border-border bg-surface-light px-4 py-3 text-base text-text-primary outline-none placeholder:text-text-muted focus:border-blue"
              />
              <button
                onClick={saveToBall}
                disabled={!ballName.trim() || saving}
                className="shrink-0 rounded-lg bg-gradient-to-r from-blue to-blue-dark px-5 text-sm font-bold text-white shadow-lg shadow-blue/25 transition-all duration-150 active:scale-[0.97] disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
