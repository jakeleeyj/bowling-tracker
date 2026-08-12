"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { useToast } from "@/components/Toast";
import BackButton from "@/components/BackButton";
import AnalyzeForm, {
  type AnalyzeInput,
} from "@/components/arsenal/AnalyzeForm";
import AnalysisResults from "@/components/arsenal/AnalysisResults";
import {
  analyzeFlight,
  type FlightAnalysis,
  type SpeedUnit,
} from "@/lib/flightAnalysis";
import {
  recommendLayout,
  type LaneCondition,
  type LayoutRecommendation,
} from "@/lib/layoutEngine";
import type { PapPosition } from "@/lib/layoutGeometry";

export default function AnalyzePage() {
  const supabase = createClient();
  const router = useRouter();
  const { toast } = useToast();
  const [analysis, setAnalysis] = useState<FlightAnalysis | null>(null);
  const [layout, setLayout] = useState<LayoutRecommendation | null>(null);
  const [lane, setLane] = useState<LaneCondition>("medium");
  const [speedUnit, setSpeedUnit] = useState<SpeedUnit>("mph");
  const [pap, setPap] = useState<PapPosition | undefined>(undefined);
  const [ballName, setBallName] = useState("");
  const [saving, setSaving] = useState(false);

  function handleAnalyze(input: AnalyzeInput) {
    const result = analyzeFlight(input.specs, input.speedUnit);
    setAnalysis(result);
    setLayout(recommendLayout(result.specs, input.lane));
    setLane(input.lane);
    setSpeedUnit(input.speedUnit);
    setPap(input.pap);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveToBall() {
    if (!analysis || !layout || !ballName.trim()) return;
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const { data: ball, error: ballError } = await supabase
      .from("balls")
      .insert({
        user_id: user.id,
        name: ballName.trim().slice(0, 60),
        drilling_angle: layout.dualAngle.drillingAngle,
        pin_to_pap: layout.dualAngle.pinToPap,
        val_angle: layout.dualAngle.valAngle,
        pin_buffer: layout.vls.pinBuffer,
        psa_to_pap: layout.twoLS.psaToPap,
        pap_over: pap?.over ?? null,
        pap_up: pap?.up ?? null,
      })
      .select("id")
      .single();

    if (ballError || !ball) {
      toast("Couldn't save — check your connection", "error");
      setSaving(false);
      return;
    }

    await supabase.from("flight_analyses").insert({
      user_id: user.id,
      ball_speed_mph: analysis.specs.ballSpeedMph,
      rev_rate: Math.round(analysis.specs.revRate),
      axis_tilt: Math.round(analysis.specs.axisTilt),
      axis_rotation: Math.round(analysis.specs.axisRotation),
      lane_condition: lane,
      speed_rev_match: analysis.match,
      style: analysis.style,
      drilling_angle: layout.dualAngle.drillingAngle,
      pin_to_pap: layout.dualAngle.pinToPap,
      val_angle: layout.dualAngle.valAngle,
    });

    toast("Ball saved to your arsenal");
    router.push(`/arsenal/${ball.id}`);
  }

  return (
    <div className="animate-fade-in px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <BackButton />
        <h1 className="text-xl font-extrabold text-text-primary">
          Ball Flight Analysis
        </h1>
      </div>

      {!analysis || !layout ? (
        <>
          <p className="mb-5 text-xs leading-relaxed text-text-muted">
            A drilling layout controls where the pin sits relative to your hand,
            which shapes how your ball rolls. Answer a couple of questions and
            we&apos;ll recommend one you can take to a pro shop.
          </p>
          <AnalyzeForm onAnalyze={handleAnalyze} />
        </>
      ) : (
        <>
          <AnalysisResults
            analysis={analysis}
            layout={layout}
            speedUnit={speedUnit}
            pap={pap}
          />

          <div className="glass mt-4 rounded-xl p-4">
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

          <button
            onClick={() => {
              setAnalysis(null);
              setLayout(null);
            }}
            className="mt-3 w-full py-2 text-center text-xs text-text-muted active:scale-95"
          >
            Start over
          </button>
        </>
      )}
    </div>
  );
}
