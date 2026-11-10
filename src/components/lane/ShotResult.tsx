"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import type { ShotStats } from "@/lib/lane/shotStats";
import { saveTrackedShot } from "@/lib/lane/saveShot";
import LaneView from "@/components/lane/LaneView";

const MPH_TO_KMH = 1.609344;

function Stat({
  label,
  value,
  color,
  estimated,
}: {
  label: string;
  value: number;
  color: string;
  estimated?: boolean;
}) {
  return (
    <div>
      <p
        className={`text-2xl font-extrabold leading-tight tabular-nums ${estimated ? "text-text-muted" : ""}`}
      >
        {value.toFixed(1)}
      </p>
      <p className={`text-xs font-semibold ${color}`}>
        {label}
        {estimated && (
          <span className="font-normal text-text-muted"> · est.</span>
        )}
      </p>
    </div>
  );
}

export default function ShotResult({
  stats,
  onNext,
}: {
  stats: ShotStats;
  onNext: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const seenFrom = stats.path[0].feet;
  const seenTo = Math.max(...stats.path.map((p) => p.feet));

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    const { error } = await saveTrackedShot(stats);
    setSaving(false);
    if (error) {
      setSaveError(error);
      return;
    }
    onNext();
  }

  return (
    <div className="glass mt-3 p-4">
      <p className="text-xs text-text-muted">
        {stats.speedFrom === "pins"
          ? "Speed, foul line to pins"
          : "Speed while tracked"}
      </p>
      <p className="mb-4">
        <span className="text-4xl font-extrabold tabular-nums">
          {(stats.speedMph * MPH_TO_KMH).toFixed(1)}
        </span>
        <span className="ml-1.5 text-sm text-text-muted">
          km/h · {stats.speedMph.toFixed(1)} mph
        </span>
      </p>
      <div className="mb-4 flex gap-4">
        <div className="w-[46%] max-w-[240px] shrink-0">
          <LaneView stats={stats} />
        </div>
        <div className="flex flex-col-reverse justify-between py-1">
          <Stat
            label="Foul line"
            value={stats.releaseBoard}
            color="text-green"
            estimated={seenFrom > 3}
          />
          <Stat label="Arrows" value={stats.arrowsBoard} color="text-gold" />
          <Stat
            label={`Breakpoint · ${stats.breakpointFeet.toFixed(0)} ft`}
            value={stats.breakpointBoard}
            color="text-purple"
          />
          <Stat
            label="Entry"
            value={stats.entryBoard}
            color="text-pink"
            estimated={seenTo < 57}
          />
        </div>
      </div>
      {saveError && (
        <p className="mb-2 text-center text-xs text-red-400">{saveError}</p>
      )}
      <div className="flex gap-2">
        <button
          onClick={onNext}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white/10 py-3 text-sm font-bold text-text-muted active:scale-[0.97]"
        >
          <X size={16} /> Discard
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-blue to-blue-dark py-3 text-sm font-bold text-white shadow-lg shadow-blue/25 active:scale-[0.97] disabled:opacity-60"
        >
          <Check size={16} /> {saving ? "Saving…" : "Save shot"}
        </button>
      </div>
    </div>
  );
}
