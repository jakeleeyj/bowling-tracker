"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { isSplit } from "@/lib/bowling";

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

function ScoreTrendChart({ scores, avg }: { scores: number[]; avg: number }) {
  if (scores.length === 0) return null;

  const padding = { top: 12, right: 8, bottom: 24, left: 32 };
  const width = 320;
  const height = 160;
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const rawMin = Math.min(...scores);
  const rawMax = Math.max(...scores);
  // Round to nearest 10 for clean gridlines
  const yMin = Math.floor(Math.min(rawMin, avg) / 10) * 10;
  const yMax = Math.ceil(Math.max(rawMax, avg) / 10) * 10;
  const yRange = yMax - yMin || 1;

  // Generate ~4 Y-axis gridlines
  const yStep = Math.max(10, Math.ceil(yRange / 4 / 10) * 10);
  const yTicks: number[] = [];
  for (let v = yMin; v <= yMax; v += yStep) {
    yTicks.push(v);
  }
  if (!yTicks.includes(yMax)) yTicks.push(yMax);

  const toX = (i: number) =>
    padding.left +
    (scores.length === 1 ? chartW / 2 : (i / (scores.length - 1)) * chartW);
  const toY = (v: number) =>
    padding.top + chartH - ((v - yMin) / yRange) * chartH;

  // Build SVG path
  const points = scores.map((s, i) => `${toX(i)},${toY(s)}`);
  const linePath = `M${points.join("L")}`;

  // Average line Y
  const avgY = toY(avg);

  // X-axis labels: show first, last, and middle
  const xLabels: { i: number; label: string }[] = [];
  if (scores.length <= 6) {
    scores.forEach((_, i) => xLabels.push({ i, label: `${i + 1}` }));
  } else {
    xLabels.push({ i: 0, label: "1" });
    const mid = Math.floor(scores.length / 2);
    xLabels.push({ i: mid, label: `${mid + 1}` });
    xLabels.push({
      i: scores.length - 1,
      label: `${scores.length}`,
    });
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
      {/* Y gridlines + labels */}
      {yTicks.map((v) => (
        <g key={v}>
          <line
            x1={padding.left}
            y1={toY(v)}
            x2={width - padding.right}
            y2={toY(v)}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={0.5}
          />
          <text
            x={padding.left - 4}
            y={toY(v)}
            textAnchor="end"
            dominantBaseline="middle"
            fontSize={8}
            fill="#64748b"
          >
            {v}
          </text>
        </g>
      ))}

      {/* Average line */}
      <line
        x1={padding.left}
        y1={avgY}
        x2={width - padding.right}
        y2={avgY}
        stroke="#3b82f6"
        strokeWidth={0.75}
        strokeDasharray="4 3"
        opacity={0.5}
      />

      {/* Line */}
      <path
        d={linePath}
        fill="none"
        stroke="#3b82f6"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Dots */}
      {scores.map((s, i) => (
        <g key={i}>
          <circle
            cx={toX(i)}
            cy={toY(s)}
            r={3}
            fill={s >= avg ? "#3b82f6" : "#334155"}
            stroke={s >= avg ? "#3b82f6" : "#64748b"}
            strokeWidth={1}
          />
          {/* Score label on dot for small datasets */}
          {scores.length <= 10 && (
            <text
              x={toX(i)}
              y={toY(s) - 7}
              textAnchor="middle"
              fontSize={7}
              fontWeight="bold"
              fill="#e2e8f0"
            >
              {s}
            </text>
          )}
        </g>
      ))}

      {/* X-axis labels */}
      {xLabels.map(({ i, label }) => (
        <text
          key={i}
          x={toX(i)}
          y={height - 4}
          textAnchor="middle"
          fontSize={8}
          fill="#64748b"
        >
          {label}
        </text>
      ))}

      {/* Avg label */}
      <text
        x={width - padding.right}
        y={avgY - 4}
        textAnchor="end"
        fontSize={7}
        fill="#3b82f6"
      >
        avg {avg}
      </text>
    </svg>
  );
}

function LeaveItem({
  pins,
  attempts,
  converted,
  isSplitLeave,
}: {
  pins: number[];
  attempts: number;
  converted: number;
  isSplitLeave: boolean;
}) {
  const rate = attempts > 0 ? Math.round((converted / attempts) * 100) : 0;
  const label = pins.join("-");

  return (
    <div className="flex items-center gap-3 rounded-lg bg-black/20 px-3 py-2">
      <div className="flex w-10 flex-col items-center gap-[1px]">
        {([[7, 8, 9, 10], [4, 5, 6], [2, 3], [1]] as const).map((row, ri) => (
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
        ))}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold">{label} leave</span>
          {isSplitLeave && (
            <span className="text-[9px] font-semibold text-red">SPLIT</span>
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

  // Double rate: strike after strike %
  // Group frames by game, sorted by frame number
  const framesByGame: Record<string, FrameData[]> = {};
  frames.forEach((f) => {
    if (!framesByGame[f.game_id]) framesByGame[f.game_id] = [];
    framesByGame[f.game_id].push(f);
  });
  let doubleOpportunities = 0;
  let doubles = 0;
  for (const gFrames of Object.values(framesByGame)) {
    const sorted = [...gFrames].sort((a, b) => a.frame_number - b.frame_number);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i - 1].is_strike) {
        doubleOpportunities++;
        if (sorted[i].is_strike) doubles++;
      }
    }
  }
  const doubleRate =
    doubleOpportunities > 0
      ? Math.round((doubles / doubleOpportunities) * 100)
      : 0;

  // Pocket hit % approximation: strike OR single-pin leave = pocket hit
  const firstBallFrames = frames.filter((f) => f.frame_number <= 10);
  let pocketHits = 0;
  for (const f of firstBallFrames) {
    if (f.is_strike) {
      pocketHits++;
    } else if (
      f.pins_remaining &&
      Array.isArray(f.pins_remaining) &&
      (f.pins_remaining as number[]).length === 1
    ) {
      pocketHits++;
    }
  }
  const pocketRate =
    firstBallFrames.length > 0
      ? Math.round((pocketHits / firstBallFrames.length) * 100)
      : 0;

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

  // Spare leave log — group by leave pattern, categorized
  const leaveLog: Record<
    string,
    {
      pins: number[];
      attempts: number;
      converted: number;
      category: "single" | "multi" | "split";
    }
  > = {};
  for (const f of spareOpportunities) {
    const pins = [...(f.pins_remaining as number[])].sort((a, b) => a - b);
    const key = pins.join("-");
    if (!leaveLog[key]) {
      const category =
        pins.length === 1 ? "single" : isSplit(pins) ? "split" : "multi";
      leaveLog[key] = { pins, attempts: 0, converted: 0, category };
    }
    leaveLog[key].attempts++;
    if (f.spare_converted) leaveLog[key].converted++;
  }

  const singlePinLeaves = Object.values(leaveLog)
    .filter((l) => l.category === "single")
    .sort((a, b) => b.attempts - a.attempts);
  const multiPinLeaves = Object.values(leaveLog)
    .filter((l) => l.category === "multi")
    .sort((a, b) => b.attempts - a.attempts);
  const splitLeaves = Object.values(leaveLog)
    .filter((l) => l.category === "split")
    .sort((a, b) => b.attempts - a.attempts);

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

          {/* Score Trend — Line Chart */}
          <div className="glass mb-4 p-4">
            <h3 className="mb-2 text-xs font-bold text-text-secondary">
              Score Trend
            </h3>
            <ScoreTrendChart scores={scores} avg={avg} />
          </div>

          {/* Strike & Spare rates */}
          <div className="mb-4 grid grid-cols-2 gap-2">
            <div className="glass p-3">
              <div className="text-[10px] uppercase text-text-muted">
                Strike %
              </div>
              <div className="text-2xl font-extrabold text-green">
                {strikeRate}%
              </div>
              <div className="text-[10px] text-text-muted">
                {firstBallStrikes}/{totalFramesPlayed}
              </div>
            </div>
            <div className="glass p-3">
              <div className="text-[10px] uppercase text-text-muted">
                Spare %
              </div>
              <div className="text-2xl font-extrabold text-gold">
                {spareRate}%
              </div>
              <div className="text-[10px] text-text-muted">
                {sparesConverted}/{framesWithSpareOpp.length}
              </div>
            </div>
            <div className="glass p-3">
              <div className="text-[10px] uppercase text-text-muted">
                Double %
              </div>
              <div className="text-2xl font-extrabold text-green">
                {doubleRate}%
              </div>
              <div className="text-[10px] text-text-muted">
                {doubles}/{doubleOpportunities} back-to-back
              </div>
            </div>
            <div className="glass p-3">
              <div className="text-[10px] uppercase text-text-muted">
                Pocket %
              </div>
              <div className="text-2xl font-extrabold text-cyan-400">
                {pocketRate}%
              </div>
              <div className="text-[10px] text-text-muted">
                {pocketHits}/{firstBallFrames.length} first balls
              </div>
            </div>
          </div>

          {/* Spare Streak */}
          <div className="glass p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase text-text-muted">
                  Best Spare Streak
                </div>
                <div className="text-2xl font-extrabold">{maxSpareStreak}</div>
                <div className="text-[10px] text-text-muted">
                  consecutive spares
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase text-text-muted">
                  Clean Rate
                </div>
                <div className="text-2xl font-extrabold text-green">
                  {detailedGames.length > 0
                    ? Math.round((cleanGames / detailedGames.length) * 100)
                    : 0}
                  %
                </div>
                <div className="text-[10px] text-text-muted">
                  {cleanGames}/{detailedGames.length} games
                </div>
              </div>
            </div>
          </div>
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
                      className="relative flex h-full flex-1 items-end"
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

          {/* Spare Breakdown Summary */}
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
                    textColor: "text-green",
                    barColor: "bg-green",
                  },
                  {
                    label: "Multi Pin",
                    attempts: multiPinAttempts,
                    converted: multiPinConverted,
                    rate: multiPinRate,
                    textColor: "text-gold",
                    barColor: "bg-gold",
                  },
                  {
                    label: "Splits",
                    attempts: splitAttempts,
                    converted: splitConverted,
                    rate: splitRate,
                    textColor: "text-red",
                    barColor: "bg-red",
                  },
                ].map(
                  ({
                    label,
                    attempts,
                    converted,
                    rate,
                    textColor,
                    barColor,
                  }) => (
                    <div key={label}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold">{label}</p>
                          <p className="text-[10px] text-text-muted">
                            {converted}/{attempts} converted
                          </p>
                        </div>
                        <span className={`text-lg font-extrabold ${textColor}`}>
                          {rate}%
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-surface-light">
                        <div
                          className={`h-full rounded-full ${barColor}`}
                          style={{ width: `${rate}%` }}
                        />
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>
          )}

          {/* Leave Log — grouped by category */}
          {singlePinLeaves.length > 0 && (
            <div className="glass mb-4 p-4">
              <h3 className="mb-2 text-xs font-bold text-green">
                Single Pin Leaves
              </h3>
              <p className="mb-3 text-[10px] text-text-muted">
                {singlePinConverted}/{singlePinAttempts} converted (
                {singlePinRate}%)
              </p>
              <div className="flex flex-col gap-1.5">
                {singlePinLeaves.map((l) => (
                  <LeaveItem
                    key={l.pins.join("-")}
                    pins={l.pins}
                    attempts={l.attempts}
                    converted={l.converted}
                    isSplitLeave={false}
                  />
                ))}
              </div>
            </div>
          )}

          {multiPinLeaves.length > 0 && (
            <div className="glass mb-4 p-4">
              <h3 className="mb-2 text-xs font-bold text-gold">
                Multi Pin Leaves
              </h3>
              <p className="mb-3 text-[10px] text-text-muted">
                {multiPinConverted}/{multiPinAttempts} converted ({multiPinRate}
                %)
              </p>
              <div className="flex flex-col gap-1.5">
                {multiPinLeaves.map((l) => (
                  <LeaveItem
                    key={l.pins.join("-")}
                    pins={l.pins}
                    attempts={l.attempts}
                    converted={l.converted}
                    isSplitLeave={false}
                  />
                ))}
              </div>
            </div>
          )}

          {splitLeaves.length > 0 && (
            <div className="glass p-4">
              <h3 className="mb-2 text-xs font-bold text-red">Split Leaves</h3>
              <p className="mb-3 text-[10px] text-text-muted">
                {splitConverted}/{splitAttempts} converted ({splitRate}%)
              </p>
              <div className="flex flex-col gap-1.5">
                {splitLeaves.map((l) => (
                  <LeaveItem
                    key={l.pins.join("-")}
                    pins={l.pins}
                    attempts={l.attempts}
                    converted={l.converted}
                    isSplitLeave={true}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
