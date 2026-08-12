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
  const [customDrill, setCustomDrill] = useState("50");
  const [customPin, setCustomPin] = useState("4.5");
  const [customVal, setCustomVal] = useState("35");
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
    if (localStorage.getItem(GRIP_KEY) === "two") setTwoHanded(true);
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex min-h-[60dvh] items-center justify-center">
        <BowlingSpinner />
      </div>
    );
  }

  const isTwoHanded = latest?.style === "two-handed" || twoHanded;

  let layout: LayoutRecommendation | null = null;
  if (mode === "custom") {
    const dualAngle = {
      drillingAngle: clamp(parseFloat(customDrill) || 50, 10, 90),
      pinToPap: clamp(parseFloat(customPin) || 4.5, 0.75, 6),
      valAngle: clamp(parseFloat(customVal) || 35, 20, 90),
    };
    layout = {
      dualAngle,
      vls: dualAngleToVLS(dualAngle),
      twoLS: dualAngleTo2LS(
        dualAngle,
        isTwoHanded ? TWO_HANDED_PAP : { over: 4.5, up: 0 },
      ),
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
            Your layout (dual angle)
          </p>
          <div className="grid grid-cols-3 gap-3">
            {customField("Drill angle °", customDrill, setCustomDrill)}
            {customField('Pin-to-PAP "', customPin, setCustomPin)}
            {customField("VAL angle °", customVal, setCustomVal)}
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-text-muted">
            The VLS and 2LS tabs below convert these numbers automatically.
          </p>
        </div>
      )}

      {layout && (
        <>
          <LayoutResultCard
            layout={layout}
            hand={hand}
            twoHanded={isTwoHanded}
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
