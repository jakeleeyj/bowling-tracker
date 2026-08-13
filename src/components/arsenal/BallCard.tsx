"use client";

import { CircleDot, ChevronRight } from "lucide-react";
import type { Ball } from "@/lib/database.types";

export default function BallCard({
  ball,
  onClick,
}: {
  ball: Ball;
  onClick: () => void;
}) {
  const hasLayout = ball.drilling_angle !== null;
  return (
    <button
      onClick={onClick}
      className="glass flex w-full items-center gap-3 rounded-xl p-4 text-left transition-all duration-150 active:scale-[0.98]"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-purple/15 text-purple">
        <CircleDot size={22} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-text-primary">
          {ball.name}
        </p>
        <p className="truncate text-xs text-text-muted">
          {[
            ball.brand,
            ball.weight_lbs ? `${ball.weight_lbs} lbs` : null,
            hasLayout
              ? `${ball.drilling_angle}° × ${ball.pin_to_pap}" × ${ball.val_angle}°`
              : "No layout yet",
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
      <ChevronRight size={16} className="shrink-0 text-text-muted" />
    </button>
  );
}
