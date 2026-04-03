"use client";

import { useState, useEffect } from "react";
import {
  Trophy,
  Zap,
  Sparkles,
  Flame,
  Target,
  Crown,
  Award,
} from "lucide-react";
import { getRank, getDivisionProgress, CALIBRATION_GAMES } from "@/lib/ranking";
import RankEmblem from "@/components/RankEmblem";
import type { ResultsData } from "@/hooks/useSessionState";
import type { AchievementDef } from "@/lib/achievements";

function AnimatedCounter({
  from,
  to,
  duration = 2500,
}: {
  from: number;
  to: number;
  duration?: number;
}) {
  const [value, setValue] = useState(from);
  useEffect(() => {
    const start = performance.now();
    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(from + (to - from) * eased));
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [from, to, duration]);
  return <>{value}</>;
}

const RESULTS_ICON_MAP: Record<string, React.ReactNode> = {
  Trophy: <Trophy size={24} />,
  Zap: <Zap size={24} />,
  Sparkles: <Sparkles size={24} />,
  Flame: <Flame size={24} />,
  Target: <Target size={24} />,
  Crown: <Crown size={24} />,
  Award: <Award size={24} />,
};

export default function SessionResults({ data }: { data: ResultsData }) {
  const isCalibrating = data.totalGamesAfter < CALIBRATION_GAMES;
  const wasCalibrating = data.gamesBefore < CALIBRATION_GAMES;
  const justCalibrated = !isCalibrating && wasCalibrating;

  const [showRankChange, setShowRankChange] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const lpDiff = data.newLp - data.oldLp;

  function skipAnimations() {
    if (skipped) return;
    setSkipped(true);
    setShowRankChange(true);
    setShowAchievements(true);
  }
  const displayRank =
    data.rankChanged && !showRankChange ? data.oldRank : data.newRank;
  const progress = getDivisionProgress(data.newLp);

  useEffect(() => {
    if (data.rankChanged && !wasCalibrating) {
      const timer = setTimeout(() => setShowRankChange(true), 1400);
      return () => clearTimeout(timer);
    }
  }, [data.rankChanged, wasCalibrating]);

  useEffect(() => {
    if (data.unlockedAchievements.length > 0) {
      const delay = data.rankChanged && !wasCalibrating ? 2400 : 1600;
      const timer = setTimeout(() => setShowAchievements(true), delay);
      return () => clearTimeout(timer);
    }
  }, [data.unlockedAchievements.length, data.rankChanged, wasCalibrating]);

  return (
    <div
      className="flex min-h-[70vh] flex-col items-center justify-center text-center"
      onClick={skipAnimations}
    >
      <div className="animate-results-emblem mb-4">
        <RankEmblem
          tierName={isCalibrating ? getRank(0).name : data.newRank.name}
          size={96}
        />
      </div>

      {isCalibrating ? (
        <>
          <div className="animate-results-fade mb-1">
            <span className="text-2xl font-extrabold text-text-muted">
              Calibrating
            </span>
          </div>
          <div className="animate-results-fade mb-6 mt-1">
            <p className="text-sm text-text-muted">
              {CALIBRATION_GAMES - data.totalGamesAfter} more game
              {CALIBRATION_GAMES - data.totalGamesAfter !== 1 ? "s" : ""} to set
              your rank
            </p>
            <div className="mx-auto mt-3 flex w-full max-w-[120px] gap-1.5">
              {Array.from({ length: CALIBRATION_GAMES }, (_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full ${
                    i < data.totalGamesAfter ? "bg-blue" : "bg-surface-light"
                  }`}
                />
              ))}
            </div>
          </div>
        </>
      ) : justCalibrated ? (
        <>
          <div className="animate-results-fade mb-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
              Calibration Complete
            </span>
          </div>
          <div className="animate-results-flash mb-1">
            <span className={`text-2xl font-extrabold ${data.newRank.color}`}>
              {data.newRank.name}
              {data.newRank.division ? ` ${data.newRank.division}` : ""}
            </span>
          </div>
          <div className="animate-results-fade mb-1 w-full max-w-[200px]">
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-light">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue to-green"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between text-[9px] text-text-muted">
              <span>{data.newRank.division ?? data.newRank.name}</span>
              <span>{progress}%</span>
            </div>
          </div>
          <div className="animate-results-fade mb-6 mt-3">
            <div className="text-4xl font-extrabold tabular-nums text-text-primary">
              <AnimatedCounter from={0} to={data.newLp} />
              <span className="text-lg text-text-muted"> LP</span>
            </div>
            <div
              className={`mt-1 text-sm font-semibold ${lpDiff > 0 ? "text-green" : lpDiff < 0 ? "text-red" : "text-text-muted"}`}
            >
              {lpDiff > 0 ? "+" : ""}
              {lpDiff} LP
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="animate-results-fade mb-1">
            <span className={`text-2xl font-extrabold ${displayRank.color}`}>
              {displayRank.name}
              {displayRank.division ? ` ${displayRank.division}` : ""}
            </span>
          </div>

          {data.rankChanged && showRankChange && (
            <div className="animate-results-flash mb-2">
              <span
                className={`text-sm font-bold ${data.isRankUp ? "text-gold" : "text-red"}`}
              >
                {data.isRankUp
                  ? data.newRank.name !== data.oldRank.name
                    ? "RANK UP!"
                    : "DIVISION UP!"
                  : data.newRank.name !== data.oldRank.name
                    ? "RANK DOWN"
                    : "DIVISION DOWN"}
              </span>
            </div>
          )}

          <div className="animate-results-fade mb-1 w-full max-w-[200px]">
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-light">
              <div
                className={`h-full rounded-full transition-all duration-[2500ms] ${
                  lpDiff >= 0
                    ? "bg-gradient-to-r from-blue to-green"
                    : "bg-gradient-to-r from-red to-gold"
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between text-[9px] text-text-muted">
              <span>{displayRank.division ?? displayRank.name}</span>
              <span>{progress}%</span>
            </div>
          </div>

          <div className="animate-results-fade mb-6 mt-3">
            <div className="text-4xl font-extrabold tabular-nums text-text-primary">
              <AnimatedCounter from={data.oldLp} to={data.newLp} />
              <span className="text-lg text-text-muted"> LP</span>
            </div>
            <div
              className={`mt-1 text-sm font-semibold ${lpDiff > 0 ? "text-green" : lpDiff < 0 ? "text-red" : "text-text-muted"}`}
            >
              {lpDiff > 0 ? "+" : ""}
              {lpDiff} LP
            </div>
          </div>
        </>
      )}

      {showAchievements && data.unlockedAchievements.length > 0 && (
        <div className="animate-results-fade mb-6 w-full max-w-[300px]">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gold">
            Achievement Unlocked!
          </p>
          <div className="flex flex-col gap-2">
            {data.unlockedAchievements.map((a: AchievementDef) => (
              <div
                key={a.id}
                className={`animate-results-flash flex items-center gap-3 rounded-xl ${a.bgColor} px-4 py-3`}
              >
                <span className={a.color}>{RESULTS_ICON_MAP[a.iconName]}</span>
                <div className="text-left">
                  <p className="text-sm font-bold">{a.name}</p>
                  <p className="text-[10px] text-text-muted">{a.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.isNewPB && (
        <div className="animate-results-flash mb-4 rounded-xl bg-gold/10 px-5 py-3">
          <p className="text-sm font-extrabold text-gold">New Personal Best!</p>
          <p className="text-[10px] text-text-muted">
            {data.sessionHigh} pins — your new high game
          </p>
        </div>
      )}

      <div className="mb-6 flex w-full max-w-[300px] gap-2">
        <div className="glass flex-1 p-3 text-center">
          <div className="text-[10px] uppercase text-text-muted">Avg</div>
          <div className="text-lg font-extrabold">{data.sessionAvg}</div>
        </div>
        <div className="glass flex-1 p-3 text-center">
          <div className="text-[10px] uppercase text-text-muted">High</div>
          <div className="text-lg font-extrabold">{data.sessionHigh}</div>
        </div>
        <div className="glass flex-1 p-3 text-center">
          <div className="text-[10px] uppercase text-text-muted">Total</div>
          <div className="text-lg font-extrabold">{data.totalPins}</div>
        </div>
      </div>

      <div className="mb-8 flex flex-wrap justify-center gap-2 w-full max-w-[300px]">
        {data.gameScores.map((score: number, i: number) => (
          <div key={i} className="glass min-w-[48px] flex-1 p-2 text-center">
            <div className="text-[9px] text-text-muted">G{i + 1}</div>
            <div className="text-sm font-bold text-text-primary">{score}</div>
          </div>
        ))}
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          window.location.href = "/dashboard";
        }}
        className="w-full max-w-[300px] rounded-xl bg-gradient-to-r from-blue to-blue-dark py-4 text-base font-bold text-white shadow-lg shadow-blue/25 active:scale-[0.97]"
      >
        Continue
      </button>
    </div>
  );
}
