"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { useToast } from "@/components/Toast";
import BackButton from "@/components/BackButton";
import AnalyzeForm, {
  type AnalyzeInput,
} from "@/components/arsenal/AnalyzeForm";
import StyleResultCard from "@/components/arsenal/StyleResultCard";
import {
  analyzeFlight,
  type FlightAnalysis,
  type SpeedUnit,
} from "@/lib/flightAnalysis";
import { recommendLayout } from "@/lib/layoutEngine";
import { ArrowRight } from "lucide-react";

export default function AnalyzePage() {
  const supabase = createClient();
  const router = useRouter();
  const { toast } = useToast();
  const [analysis, setAnalysis] = useState<FlightAnalysis | null>(null);
  const [speedUnit, setSpeedUnit] = useState<SpeedUnit>("mph");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function handleAnalyze(input: AnalyzeInput) {
    setAnalysis(
      analyzeFlight(input.specs, input.speedUnit, {
        twoHanded: input.twoHanded,
      }),
    );
    setSpeedUnit(input.speedUnit);
    setSaved(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveStyle() {
    if (!analysis || saving) return;
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    // Store a house-shot baseline layout alongside the style numbers
    const layout = recommendLayout(analysis.specs, "medium");
    const { error } = await supabase.from("flight_analyses").insert({
      user_id: user.id,
      ball_speed_mph: analysis.specs.ballSpeedMph,
      rev_rate: Math.round(analysis.specs.revRate),
      axis_tilt: Math.round(analysis.specs.axisTilt),
      axis_rotation: Math.round(analysis.specs.axisRotation),
      lane_condition: "medium",
      speed_rev_match: analysis.match,
      style: analysis.style,
      drilling_angle: layout.dualAngle.drillingAngle,
      pin_to_pap: layout.dualAngle.pinToPap,
      val_angle: layout.dualAngle.valAngle,
    });
    setSaving(false);
    if (error) {
      toast("Couldn't save — check your connection", "error");
    } else {
      setSaved(true);
      toast("Style saved");
    }
  }

  return (
    <div className="animate-fade-in px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <BackButton />
        <h1 className="text-xl font-extrabold text-text-primary">
          Analyze My Style
        </h1>
      </div>

      {!analysis ? (
        <>
          <p className="mb-5 text-xs leading-relaxed text-text-muted">
            Your speed, rev rate and release numbers define your style — the
            starting point for every layout decision.
          </p>
          <AnalyzeForm onAnalyze={handleAnalyze} />
        </>
      ) : (
        <>
          <StyleResultCard analysis={analysis} speedUnit={speedUnit} />

          <div className="mt-4 flex flex-col gap-3">
            {!saved ? (
              <button
                onClick={saveStyle}
                disabled={saving}
                className="rounded-lg bg-gradient-to-r from-blue to-blue-dark py-3 text-sm font-bold text-white shadow-lg shadow-blue/25 transition-all duration-150 active:scale-[0.97] disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save my style"}
              </button>
            ) : (
              <button
                onClick={() => router.push("/arsenal/layout")}
                className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue to-blue-dark py-3 text-sm font-bold text-white shadow-lg shadow-blue/25 transition-all duration-150 active:scale-[0.97]"
              >
                Get a layout
                <ArrowRight size={16} />
              </button>
            )}
            <button
              onClick={() => setAnalysis(null)}
              className="w-full py-2 text-center text-xs text-text-muted active:scale-95"
            >
              Start over
            </button>
          </div>
        </>
      )}
    </div>
  );
}
