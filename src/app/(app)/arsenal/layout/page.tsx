"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { useToast } from "@/components/Toast";
import { BowlingSpinner } from "@/components/Skeleton";
import BackButton from "@/components/BackButton";
import LayoutResultCard from "@/components/arsenal/LayoutResultCard";
import { recommendLayout, type LaneCondition } from "@/lib/layoutEngine";
import type { BowlerSpecs } from "@/lib/flightAnalysis";
import type { Handedness } from "@/lib/layoutGeometry";
import { HAND_KEY } from "@/components/arsenal/AnalyzeForm";
import { Sparkles } from "lucide-react";
import type { FlightAnalysisRow } from "@/lib/database.types";

const LANES: [LaneCondition, string][] = [
  ["dry", "Dry / short"],
  ["medium", "House shot"],
  ["oily", "Heavy oil"],
];

export default function LayoutPage() {
  const supabase = createClient();
  const router = useRouter();
  const { toast } = useToast();
  const [latest, setLatest] = useState<FlightAnalysisRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [lane, setLane] = useState<LaneCondition>("medium");
  const [hand, setHand] = useState<Handedness>("right");
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
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex min-h-[60dvh] items-center justify-center">
        <BowlingSpinner />
      </div>
    );
  }

  if (!latest) {
    return (
      <div className="animate-fade-in px-4 py-6">
        <div className="mb-6 flex items-center gap-3">
          <BackButton />
          <h1 className="text-xl font-extrabold text-text-primary">
            Get a Layout
          </h1>
        </div>
        <div className="glass p-6 text-center">
          <p className="mb-1 text-sm font-bold text-text-primary">
            Analyze your style first
          </p>
          <p className="mb-4 text-xs leading-relaxed text-text-muted">
            A layout is built from your style numbers — takes under a minute.
          </p>
          <button
            onClick={() => router.push("/arsenal/analyze")}
            className="mx-auto flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue to-blue-dark px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue/25 transition-all duration-150 active:scale-[0.97]"
          >
            <Sparkles size={16} />
            Analyze My Style
          </button>
        </div>
      </div>
    );
  }

  const specs: BowlerSpecs = {
    ballSpeedMph: Number(latest.ball_speed_mph),
    revRate: latest.rev_rate,
    axisTilt: latest.axis_tilt,
    axisRotation: latest.axis_rotation,
  };
  const layout = recommendLayout(specs, lane);

  async function saveToBall() {
    if (!ballName.trim() || saving) return;
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

  return (
    <div className="animate-fade-in px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <BackButton />
        <h1 className="text-xl font-extrabold text-text-primary">
          Get a Layout
        </h1>
      </div>

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

      <LayoutResultCard layout={layout} hand={hand} />

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
    </div>
  );
}
