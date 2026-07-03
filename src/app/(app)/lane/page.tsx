"use client";

import dynamic from "next/dynamic";
import { Video } from "lucide-react";

const LaneTracker = dynamic(() => import("@/components/lane/LaneTracker"), {
  ssr: false,
  loading: () => (
    <div className="glass p-6 text-center text-sm text-text-muted">
      Loading tracker…
    </div>
  ),
});

export default function LanePage() {
  return (
    <div>
      <header className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue/15 text-blue">
          <Video size={22} />
        </div>
        <div>
          <h1 className="text-xl font-extrabold leading-tight">Lane Tracker</h1>
          <p className="text-[13px] text-text-muted">
            Line, speed and breakpoint from your camera
          </p>
        </div>
      </header>
      <LaneTracker />
    </div>
  );
}
