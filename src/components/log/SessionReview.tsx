"use client";

import { ArrowLeft } from "lucide-react";
import { isCleanGame } from "@/lib/bowling";
import type { GameData } from "@/hooks/useSessionState";

interface SessionReviewProps {
  games: GameData[];
  venue: string;
  eventLabel: string;
  saving: boolean;
  onBack: () => void;
  onSave: () => void;
}

export default function SessionReview({
  games,
  venue,
  eventLabel,
  saving,
  onBack,
  onSave,
}: SessionReviewProps) {
  const totalPins = games.reduce((sum, g) => sum + g.totalScore, 0);
  const avg = Math.floor(totalPins / games.length);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button onClick={onBack} className="text-text-muted">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-base font-bold text-text-primary">
          Session Complete
        </h1>
        <div className="w-5" />
      </div>
      <p className="mb-4 text-sm text-text-muted">
        {venue && `${venue} • `}
        {eventLabel && `${eventLabel} • `}
        {games.length} games
      </p>

      <div className="mb-4 flex gap-3">
        <div className="glass flex-1 p-4 text-center">
          <div className="text-xs text-text-muted">Total</div>
          <div className="text-2xl font-extrabold text-text-primary">
            {totalPins}
          </div>
        </div>
        <div className="glass flex-1 p-4 text-center">
          <div className="text-xs text-text-muted">Average</div>
          <div className="text-2xl font-extrabold text-text-primary">{avg}</div>
        </div>
      </div>

      <div className="mb-6 flex gap-2">
        {games.map((g, i) => {
          const isHigh =
            g.totalScore === Math.max(...games.map((x) => x.totalScore));
          const clean = g.entryType === "detailed" && isCleanGame(g.frames);

          return (
            <div
              key={i}
              className={`glass flex-1 p-3 text-center ${isHigh ? "border-gold/35" : ""} ${clean ? "border-green/35" : ""}`}
            >
              <div className="text-[9px] text-text-muted">G{i + 1}</div>
              <div
                className={`text-base font-bold ${isHigh ? "text-gold" : clean ? "text-green" : "text-text-primary"}`}
              >
                {g.totalScore}
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={onSave}
        disabled={saving}
        className="w-full rounded-xl bg-gradient-to-r from-green to-emerald-600 py-4 text-base font-bold text-white shadow-lg shadow-green/25 disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Session"}
      </button>
    </div>
  );
}
