"use client";

import { CircleDot, ChevronRight } from "lucide-react";
import type { Ball } from "@/lib/database.types";
import { dualAngleTo2LS, TWO_HANDED_PAP } from "@/lib/layoutEngine";

function layoutLabel(ball: Ball): string {
  if (
    ball.drilling_angle === null ||
    ball.pin_to_pap === null ||
    ball.val_angle === null
  )
    return "No layout yet";
  const dual = {
    drillingAngle: ball.drilling_angle,
    pinToPap: Number(ball.pin_to_pap),
    valAngle: ball.val_angle,
  };
  if (ball.no_thumb) {
    const pap =
      ball.pap_over !== null
        ? { over: Number(ball.pap_over), up: Number(ball.pap_up ?? 0) }
        : { ...TWO_HANDED_PAP };
    const t = dualAngleTo2LS(dual, pap);
    return `2LS — ${t.pinToPap}" × ${t.psaToPap}" × ${t.pinToCog}"`;
  }
  if (ball.core_type === "symmetric") {
    return `VLS — ${dual.pinToPap}" × ${ball.psa_to_pap ?? dualAngleTo2LS(dual).psaToPap}" × ${ball.pin_buffer ?? "?"}"`;
  }
  return `Dual — ${dual.drillingAngle}° × ${dual.pinToPap}" × ${dual.valAngle}°`;
}

export default function BallCard({
  ball,
  onClick,
}: {
  ball: Ball;
  onClick: () => void;
}) {
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
            layoutLabel(ball),
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
      <ChevronRight size={16} className="shrink-0 text-text-muted" />
    </button>
  );
}
