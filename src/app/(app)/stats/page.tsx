"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { isSplit } from "@/lib/bowling";

const PIN_POSITIONS: Record<number, { x: number; y: number }> = {
  7: { x: 30, y: 30 },
  8: { x: 70, y: 30 },
  9: { x: 110, y: 30 },
  10: { x: 150, y: 30 },
  4: { x: 50, y: 70 },
  5: { x: 90, y: 70 },
  6: { x: 130, y: 70 },
  2: { x: 70, y: 110 },
  3: { x: 110, y: 110 },
  1: { x: 90, y: 150 },
};

interface GameData {
  id: string;
  total_score: number;
  entry_type: string;
  is_clean: boolean;
  strike_count: number;
  spare_count: number;
  created_at: string;
  sessions: { session_date: string };
}

interface FrameData {
  id: string;
  game_id: string;
  frame_number: number;
  roll_1: number;
  roll_2: number | null;
  roll_3: number | null;
  is_strike: boolean;
  is_spare: boolean;
  pins_remaining: number[] | null;
  spare_converted: boolean;
  frame_score: number;
}

type Filter = "last10" | "last50" | "ytd";
type Tab = "overview" | "spares";

function filterGames(games: GameData[], filter: Filter): GameData[] {
  if (filter === "last10") return games.slice(-10);
  if (filter === "last50") return games.slice(-50);
  const yearStart = new Date(new Date().getFullYear(), 0, 1)
    .toISOString()
    .split("T")[0];
  return games.filter((g) => g.sessions.session_date >= yearStart);
}

function getFramesForGames(
  allFrames: FrameData[],
  games: GameData[],
): FrameData[] {
  const ids = new Set(games.map((g) => g.id));
  return allFrames.filter((f) => ids.has(f.game_id));
}

export default function StatsPage() {
  const supabase = createClient();
  const [allGames, setAllGames] = useState<GameData[]>([]);
  const [allFrames, setAllFrames] = useState<FrameData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("last10");
  const [tab, setTab] = useState<Tab>("overview");

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: games } = (await supabase
        .from("games")
        .select("*, sessions(session_date)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })) as {
        data: GameData[] | null;
      };

      const gameIds = games?.map((g) => g.id) ?? [];
      const { data: frames } = (await supabase
        .from("frames")
        .select("*")
        .in("game_id", gameIds.length > 0 ? gameIds : ["none"])) as {
        data: FrameData[] | null;
      };

      setAllGames(games ?? []);
      setAllFrames(frames ?? []);
      setLoading(false);
    }
    load();
  }, [supabase]);

  if (loading) {
    return (
      <div>
        <h1 className="mb-6 text-xl font-extrabold">My Stats</h1>
        <div className="glass p-8 text-center">
          <p className="text-sm text-text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  if (allGames.length === 0) {
    return (
      <div>
        <h1 className="mb-6 text-xl font-extrabold">My Stats</h1>
        <div className="glass p-8 text-center">
          <p className="text-sm text-text-muted">
            No games logged yet. Play some games to see your stats!
          </p>
        </div>
      </div>
    );
  }

  const games = filterGames(allGames, filter);
  const frames = getFramesForGames(allFrames, games);
  const scores = games.map((g) => g.total_score);
  const avg =
    scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;
  const high = scores.length > 0 ? Math.max(...scores) : 0;
  const low = scores.length > 0 ? Math.min(...scores) : 0;

  const detailedGames = games.filter((g) => g.entry_type === "detailed");
  const cleanGames = detailedGames.filter((g) => g.is_clean).length;

  const framesWithSpareOpp = frames.filter(
    (f) => !f.is_strike && f.frame_number <= 9,
  );
  const sparesConverted = framesWithSpareOpp.filter((f) => f.is_spare).length;
  const spareRate =
    framesWithSpareOpp.length > 0
      ? Math.round((sparesConverted / framesWithSpareOpp.length) * 100)
      : 0;

  const totalFramesPlayed = detailedGames.length * 10;
  const firstBallStrikes = frames.filter(
    (f) => f.is_strike && f.frame_number <= 10,
  ).length;
  const strikeRate =
    totalFramesPlayed > 0
      ? Math.round((firstBallStrikes / totalFramesPlayed) * 100)
      : 0;

  // Pin leave frequency
  const pinLeaveCount: Record<number, number> = {};
  frames
    .filter(
      (f) =>
        f.pins_remaining && Array.isArray(f.pins_remaining) && !f.is_strike,
    )
    .forEach((f) => {
      (f.pins_remaining as number[]).forEach((pin) => {
        pinLeaveCount[pin] = (pinLeaveCount[pin] ?? 0) + 1;
      });
    });
  const maxLeaves = Math.max(...Object.values(pinLeaveCount), 1);

  // Spare streak
  let maxSpareStreak = 0;
  let currentStreak = 0;
  const sortedFrames = [...frames].sort((a, b) => {
    if (a.game_id !== b.game_id) return a.game_id.localeCompare(b.game_id);
    return a.frame_number - b.frame_number;
  });
  for (const f of sortedFrames) {
    if (f.spare_converted) {
      currentStreak++;
      maxSpareStreak = Math.max(maxSpareStreak, currentStreak);
    } else if (!f.is_strike) {
      currentStreak = 0;
    }
  }

  // Spare breakdown
  const spareOpportunities = frames.filter(
    (f) =>
      !f.is_strike &&
      f.pins_remaining &&
      Array.isArray(f.pins_remaining) &&
      (f.pins_remaining as number[]).length > 0,
  );

  let singlePinAttempts = 0,
    singlePinConverted = 0;
  let multiPinAttempts = 0,
    multiPinConverted = 0;
  let splitAttempts = 0,
    splitConverted = 0;

  for (const f of spareOpportunities) {
    const pins = f.pins_remaining as number[];
    const converted = f.spare_converted;
    if (pins.length === 1) {
      singlePinAttempts++;
      if (converted) singlePinConverted++;
    } else if (isSplit(pins)) {
      splitAttempts++;
      if (converted) splitConverted++;
    } else {
      multiPinAttempts++;
      if (converted) multiPinConverted++;
    }
  }

  const singlePinRate =
    singlePinAttempts > 0
      ? Math.round((singlePinConverted / singlePinAttempts) * 100)
      : 0;
  const multiPinRate =
    multiPinAttempts > 0
      ? Math.round((multiPinConverted / multiPinAttempts) * 100)
      : 0;
  const splitRate =
    splitAttempts > 0 ? Math.round((splitConverted / splitAttempts) * 100) : 0;

  // Score chart
  const chartMax = Math.max(...scores, 200);
  const chartMin = Math.min(...scores, 0);
  const chartRange = chartMax - chartMin || 1;

  // Spare conversion trend (rolling per-game spare %)
  const spareConvTrend = games
    .filter((g) => g.entry_type === "detailed")
    .map((g) => {
      const gameFrames = frames.filter(
        (f) => f.game_id === g.id && !f.is_strike && f.frame_number <= 9,
      );
      if (gameFrames.length === 0) return null;
      const converted = gameFrames.filter((f) => f.is_spare).length;
      return Math.round((converted / gameFrames.length) * 100);
    })
    .filter((v): v is number => v !== null);

  const spareChartMax = 100;

  // Spare leave log — group by leave pattern
  const leaveLog: Record<
    string,
    { pins: number[]; attempts: number; converted: number }
  > = {};
  for (const f of spareOpportunities) {
    const pins = [...(f.pins_remaining as number[])].sort((a, b) => a - b);
    const key = pins.join("-");
    if (!leaveLog[key]) leaveLog[key] = { pins, attempts: 0, converted: 0 };
    leaveLog[key].attempts++;
    if (f.spare_converted) leaveLog[key].converted++;
  }
  const sortedLeaves = Object.values(leaveLog).sort(
    (a, b) => b.attempts - a.attempts,
  );

  const filterLabels: Record<Filter, string> = {
    last10: "Last 10",
    last50: "Last 50",
    ytd: "YTD",
  };

  return (
    <div>
      <h1 className="mb-4 text-xl font-extrabold">My Stats</h1>

      {/* Filter pills */}
      <div className="mb-4 flex gap-1.5">
        {(["last10", "last50", "ytd"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              filter === f
                ? "bg-blue text-white"
                : "bg-surface-light text-text-muted active:bg-surface-light/80"
            }`}
          >
            {filterLabels[f]}
          </button>
        ))}
        <span className="ml-auto self-center text-[10px] text-text-muted">
          {games.length} game{games.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex rounded-lg bg-surface-light p-[3px]">
        <button
          onClick={() => setTab("overview")}
          className={`flex-1 rounded-md py-[6px] text-[13px] transition-colors ${
            tab === "overview"
              ? "bg-blue font-semibold text-white"
              : "text-text-muted"
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setTab("spares")}
          className={`flex-1 rounded-md py-[6px] text-[13px] transition-colors ${
            tab === "spares"
              ? "bg-blue font-semibold text-white"
              : "text-text-muted"
          }`}
        >
          Spares
        </button>
      </div>

      {games.length === 0 ? (
        <div className="glass p-8 text-center">
          <p className="text-sm text-text-muted">No games in this range.</p>
        </div>
      ) : tab === "overview" ? (
        <>
          {/* Overview stats */}
          <div className="mb-4 grid grid-cols-2 gap-2">
            <div className="glass p-3 text-center">
              <div className="text-[10px] uppercase text-text-muted">
                Average
              </div>
              <div className="text-2xl font-extrabold">{avg}</div>
            </div>
            <div className="glass p-3 text-center">
              <div className="text-[10px] uppercase text-text-muted">
                High Game
              </div>
              <div className="text-2xl font-extrabold text-gold">{high}</div>
            </div>
            <div className="glass p-3 text-center">
              <div className="text-[10px] uppercase text-text-muted">
                Low Game
              </div>
              <div className="text-2xl font-extrabold">{low}</div>
            </div>
            <div className="glass p-3 text-center">
              <div className="text-[10px] uppercase text-text-muted">
                Clean Games
              </div>
              <div className="text-2xl font-extrabold text-green">
                {cleanGames}
              </div>
            </div>
          </div>

          {/* Score Trend */}
          <div className="glass mb-4 p-4">
            <h3 className="mb-3 text-xs font-bold text-text-secondary">
              Score Trend
            </h3>
            <div className="flex h-32 items-end gap-[2px]">
              {scores.map((score, i) => {
                const height = ((score - chartMin) / chartRange) * 100;
                const isAboveAvg = score >= avg;
                return (
                  <div
                    key={i}
                    className="relative flex-1 h-full flex items-end"
                  >
                    <div
                      className={`w-full rounded-t ${isAboveAvg ? "bg-blue" : "bg-surface-light"}`}
                      style={{ height: `${Math.max(height, 4)}%` }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="mt-1 flex items-center justify-end gap-1">
              <div className="h-px w-3 bg-blue" />
              <span className="text-[9px] text-text-muted">avg {avg}</span>
            </div>
          </div>

          {/* Strike & Spare rates */}
          <div className="mb-4 flex gap-2">
            <div className="glass flex-1 p-4">
              <h3 className="mb-2 text-xs font-bold text-text-secondary">
                Strike %
              </h3>
              <div className="text-3xl font-extrabold text-green">
                {strikeRate}%
              </div>
              <div className="text-[10px] text-text-muted">
                {firstBallStrikes} in {totalFramesPlayed} frames
              </div>
            </div>
            <div className="glass flex-1 p-4">
              <h3 className="mb-2 text-xs font-bold text-text-secondary">
                Spare %
              </h3>
              <div className="text-3xl font-extrabold text-gold">
                {spareRate}%
              </div>
              <div className="text-[10px] text-text-muted">
                {sparesConverted}/{framesWithSpareOpp.length} converted
              </div>
            </div>
          </div>

          {/* Spare Streak */}
          <div className="glass mb-4 p-4">
            <h3 className="mb-1 text-xs font-bold text-text-secondary">
              Best Spare Streak
            </h3>
            <div className="text-3xl font-extrabold">{maxSpareStreak}</div>
            <div className="text-[10px] text-text-muted">
              consecutive spares picked up
            </div>
          </div>

          {/* Pin Leave Heatmap */}
          {Object.keys(pinLeaveCount).length > 0 && (
            <div className="glass p-4">
              <h3 className="mb-3 text-xs font-bold text-text-secondary">
                Pins Left Standing Most
              </h3>
              <svg viewBox="0 0 180 180" className="mx-auto w-48">
                {Object.entries(PIN_POSITIONS).map(([pin, pos]) => {
                  const count = pinLeaveCount[Number(pin)] ?? 0;
                  const intensity = count / maxLeaves;
                  const r = Math.round(239 * intensity + 30 * (1 - intensity));
                  const g = Math.round(68 * intensity + 41 * (1 - intensity));
                  const b = Math.round(68 * intensity + 59 * (1 - intensity));
                  return (
                    <g key={pin}>
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r={16}
                        fill={
                          count > 0
                            ? `rgb(${r}, ${g}, ${b})`
                            : "rgba(255,255,255,0.05)"
                        }
                      />
                      <text
                        x={pos.x}
                        y={pos.y}
                        textAnchor="middle"
                        dy="4"
                        fontSize="10"
                        fontWeight="bold"
                        fill="white"
                      >
                        {pin}
                      </text>
                      {count > 0 && (
                        <text
                          x={pos.x}
                          y={pos.y + 24}
                          textAnchor="middle"
                          fontSize="8"
                          fill="#94a3b8"
                        >
                          {count}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
              <p className="mt-2 text-center text-[10px] text-text-muted">
                Darker = left standing more often
              </p>
            </div>
          )}
        </>
      ) : (
        /* SPARES TAB */
        <>
          {/* Spare Conversion Trend */}
          {spareConvTrend.length > 1 && (
            <div className="glass mb-4 p-4">
              <h3 className="mb-3 text-xs font-bold text-text-secondary">
                Spare Conversion Trend
              </h3>
              <div className="flex h-32 items-end gap-[2px]">
                {spareConvTrend.map((pct, i) => {
                  const height = (pct / spareChartMax) * 100;
                  return (
                    <div
                      key={i}
                      className="relative flex-1 h-full flex items-end"
                    >
                      <div
                        className={`w-full rounded-t ${pct >= spareRate ? "bg-gold" : "bg-surface-light"}`}
                        style={{ height: `${Math.max(height, 4)}%` }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="mt-1 flex items-center justify-end gap-1">
                <div className="h-px w-3 bg-gold" />
                <span className="text-[9px] text-text-muted">
                  avg {spareRate}%
                </span>
              </div>
            </div>
          )}

          {/* Spare Breakdown */}
          {spareOpportunities.length > 0 && (
            <div className="glass mb-4 p-4">
              <h3 className="mb-3 text-xs font-bold text-text-secondary">
                Spare Breakdown
              </h3>
              <div className="flex flex-col gap-2.5">
                {[
                  {
                    label: "Single Pin",
                    attempts: singlePinAttempts,
                    converted: singlePinConverted,
                    rate: singlePinRate,
                    color: "green",
                  },
                  {
                    label: "Multi Pin",
                    attempts: multiPinAttempts,
                    converted: multiPinConverted,
                    rate: multiPinRate,
                    color: "gold",
                  },
                  {
                    label: "Splits",
                    attempts: splitAttempts,
                    converted: splitConverted,
                    rate: splitRate,
                    color: "red",
                  },
                ].map(({ label, attempts, converted, rate, color }) => (
                  <div key={label}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">{label}</p>
                        <p className="text-[10px] text-text-muted">
                          {converted}/{attempts} converted
                        </p>
                      </div>
                      <span className={`text-lg font-extrabold text-${color}`}>
                        {rate}%
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-surface-light">
                      <div
                        className={`h-full rounded-full bg-${color}`}
                        style={{ width: `${rate}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Leave Log */}
          {sortedLeaves.length > 0 && (
            <div className="glass p-4">
              <h3 className="mb-3 text-xs font-bold text-text-secondary">
                Every Spare Leave
              </h3>
              <div className="flex flex-col gap-1.5">
                {sortedLeaves.map(({ pins, attempts, converted }) => {
                  const rate =
                    attempts > 0 ? Math.round((converted / attempts) * 100) : 0;
                  const isSplitLeave = isSplit(pins);
                  const label = pins.join("-");

                  return (
                    <div
                      key={label}
                      className="flex items-center gap-3 rounded-lg bg-black/20 px-3 py-2"
                    >
                      {/* Mini pin diagram */}
                      <div className="flex w-10 flex-col items-center gap-[1px]">
                        {([[7, 8, 9, 10], [4, 5, 6], [2, 3], [1]] as const).map(
                          (row, ri) => (
                            <div key={ri} className="flex gap-[2px]">
                              {row.map((pin) => (
                                <div
                                  key={pin}
                                  className={`h-[5px] w-[5px] rounded-full ${
                                    pins.includes(pin)
                                      ? isSplitLeave
                                        ? "bg-red"
                                        : "bg-blue"
                                      : "bg-white/8"
                                  }`}
                                />
                              ))}
                            </div>
                          ),
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold">
                            {label} leave
                          </span>
                          {isSplitLeave && (
                            <span className="text-[9px] font-semibold text-red">
                              SPLIT
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-text-muted">
                          {converted}/{attempts} converted
                        </p>
                      </div>
                      <span
                        className={`text-sm font-bold ${rate === 100 ? "text-green" : rate >= 50 ? "text-gold" : "text-text-secondary"}`}
                      >
                        {rate}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
