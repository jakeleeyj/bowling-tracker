"use client";

import dynamic from "next/dynamic";
import { BowlingSpinner } from "@/components/Skeleton";
import type { DualAngleLayout, LayoutSystem } from "@/lib/layoutEngine";
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
  system?: LayoutSystem;
  pap?: PapPosition;
  hand?: Handedness;
  showThumb?: boolean;
  span?: number;
}) {
  return <Ball3D {...props} />;
}
