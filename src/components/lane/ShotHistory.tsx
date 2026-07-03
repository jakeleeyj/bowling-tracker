"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import type { TrackedShotRow } from "@/lib/queries";

export default function ShotHistory() {
  const [shots, setShots] = useState<TrackedShotRow[] | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("tracked_shots")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => setShots((data as TrackedShotRow[] | null) ?? []));
  }, []);

  if (!shots || shots.length === 0) return null;

  const avgSpeed = shots.reduce((s, x) => s + x.speed_mph, 0) / shots.length;

  return (
    <div className="mt-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold">Recent shots</h2>
        <span className="text-xs text-text-muted">
          avg {avgSpeed.toFixed(1)} mph
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {shots.map((s) => (
          <div key={s.id} className="glass flex items-center gap-3 p-3">
            <span className="w-16 text-sm font-extrabold">
              {s.speed_mph.toFixed(1)} mph
            </span>
            <span className="flex-1 text-xs text-text-muted">
              {s.release_board.toFixed(0)} → {s.breakpoint_board.toFixed(0)} →{" "}
              {s.entry_board.toFixed(0)} board
            </span>
            <span className="text-[10px] text-text-muted/60">
              {new Date(s.created_at).toLocaleDateString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
