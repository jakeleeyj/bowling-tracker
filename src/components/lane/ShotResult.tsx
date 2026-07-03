"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import type { ShotStats } from "@/lib/lane/shotStats";
import { saveTrackedShot } from "@/lib/lane/saveShot";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-base font-extrabold leading-tight">{value}</span>
      <span className="text-[10px] text-text-muted">{label}</span>
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
    <div className="absolute inset-x-3 bottom-3 glass p-4">
      <div className="mb-3 text-center">
        <span className="text-2xl font-extrabold">
          {stats.speedMph.toFixed(1)}
        </span>
        <span className="ml-1 text-sm text-text-muted">mph</span>
      </div>
      <div className="mb-4 grid grid-cols-4 gap-2">
        <Stat label="Release" value={stats.releaseBoard.toFixed(0)} />
        <Stat label="Arrows" value={stats.arrowsBoard.toFixed(0)} />
        <Stat label="Breakpoint" value={stats.breakpointBoard.toFixed(0)} />
        <Stat label="Entry" value={stats.entryBoard.toFixed(0)} />
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
