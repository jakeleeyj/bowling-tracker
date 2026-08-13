"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import BallLayoutDiagram, {
  type DiagramSystem,
} from "@/components/arsenal/BallLayoutDiagram";
import { BowlingSpinner } from "@/components/Skeleton";
import type { DualAngleLayout } from "@/lib/layoutEngine";
import type { PapPosition, Handedness } from "@/lib/layoutGeometry";

const Ball3D = dynamic(() => import("@/components/arsenal/Ball3D"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[300px] items-center justify-center">
      <BowlingSpinner />
    </div>
  ),
});

export default function BallView(props: {
  layout: DualAngleLayout;
  system?: DiagramSystem;
  pap?: PapPosition;
  hand?: Handedness;
  showThumb?: boolean;
  span?: number;
}) {
  const [view, setView] = useState<"3d" | "2d">("3d");

  return (
    <div className="relative">
      <div className="absolute right-0 top-0 z-10 flex gap-1">
        {(["3d", "2d"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase transition-all duration-150 ${
              view === v
                ? "bg-blue/20 text-blue"
                : "bg-surface-light text-text-muted active:scale-95"
            }`}
          >
            {v}
          </button>
        ))}
      </div>
      {view === "3d" ? <Ball3D {...props} /> : <BallLayoutDiagram {...props} />}
    </div>
  );
}
