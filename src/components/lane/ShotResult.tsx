"use client";

import type { ShotStats } from "@/lib/lane/shotStats";

export default function ShotResult({
  stats,
  onNext,
}: {
  stats: ShotStats;
  onNext: () => void;
}) {
  return (
    <div className="absolute inset-x-3 bottom-3 glass p-4">
      <p className="text-lg font-extrabold">{stats.speedMph.toFixed(1)} mph</p>
      <button onClick={onNext} className="mt-2 text-sm font-bold text-blue">
        Next shot
      </button>
    </div>
  );
}
