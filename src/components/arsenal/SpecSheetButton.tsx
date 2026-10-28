"use client";

import { useRef, useState } from "react";
import { Share2 } from "lucide-react";
import { useToast } from "@/components/Toast";
import { shareSpecSheet } from "@/lib/shareSpecSheet";
import SpecSheetCard from "@/components/arsenal/SpecSheetCard";
import type { Ball } from "@/lib/database.types";
import type { BallDraft } from "@/components/arsenal/DrillingSpecsForm";

export default function SpecSheetButton({
  ball,
  draft,
}: {
  ball: Ball;
  draft: BallDraft;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [sharing, setSharing] = useState(false);
  const [ballImage, setBallImage] = useState<string | undefined>(undefined);

  async function share() {
    if (!cardRef.current || sharing) return;
    setSharing(true);
    try {
      // snapshot the on-page 3D ball so the sheet carries the real render
      const canvas = document.querySelector<HTMLCanvasElement>("canvas");
      if (canvas) setBallImage(canvas.toDataURL("image/png"));
      await new Promise((r) => setTimeout(r, 120));
      await shareSpecSheet(cardRef.current, ball.name);
    } catch {
      toast("Couldn't create the spec sheet", "error");
    }
    setSharing(false);
  }

  return (
    <>
      <button
        onClick={share}
        disabled={sharing}
        className="flex items-center justify-center gap-2 rounded-xl border border-border-light bg-surface-light py-4 text-base font-bold text-text-primary transition-[transform,background-color] duration-150 active:scale-[0.97] active:bg-white/5 disabled:opacity-60"
      >
        {sharing ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            Creating
          </>
        ) : (
          <>
            <Share2 size={16} />
            Share spec sheet
          </>
        )}
      </button>
      <div className="pointer-events-none fixed -left-[2000px] top-0">
        <SpecSheetCard ref={cardRef} draft={draft} ballImage={ballImage} />
      </div>
    </>
  );
}
