"use client";

import { useState } from "react";
import type { OverviewStats, LeaveStats } from "@/lib/queries";

type Tab = "overview" | "spares";

function TrendChart({
  values,
  avg,
  color = "var(--color-blue)",
  suffix = "",
  highlights,
}: {
  values: number[];
  avg: number;
  color?: string;
  suffix?: string;
  highlights?: boolean[];
}) {
  if (values.length === 0) return null;

  // Long ranges (Lifetime): bucket into averaged points so the line stays
  // readable instead of rendering hundreds of jittery dots.
  const MAX_POINTS = 40;
  const bucketSize = Math.ceil(values.length / MAX_POINTS);
  const isBucketed = bucketSize > 1;
  if (isBucketed) {
    const bucketed: number[] = [];
    for (let i = 0; i < values.length; i += bucketSize) {
      const chunk = values.slice(i, i + bucketSize);
      bucketed.push(
        Math.round(chunk.reduce((a, b) => a + b, 0) / chunk.length),
      );
    }
    values = bucketed;
    highlights = undefined;
  }

  const width = 360;
  const height = 160;
  const padding = { top: 20, right: 12, bottom: 12, left: 12 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const yMin = Math.floor(Math.min(rawMin, avg) / 10) * 10 - 5;
  const yMax = Math.ceil(Math.max(rawMax, avg) / 10) * 10 + 5;
  const yRange = yMax - yMin || 1;

  const toX = (i: number) =>
    padding.left +
    (values.length === 1 ? chartW / 2 : (i / (values.length - 1)) * chartW);
  const toY = (v: number) =>
    padding.top + chartH - ((v - yMin) / yRange) * chartH;

  const points = values.map((s, i) => `${toX(i)},${toY(s)}`);
  const linePath = `M${points.join("L")}`;
  const avgY = toY(avg);

  const showValueLabels =
    values.length <= 10 &&
    (values.length <= 1 || chartW / (values.length - 1) > 25);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
      {[0.25, 0.5, 0.75].map((pct) => (
        <line
          key={pct}
          x1={padding.left}
          y1={padding.top + chartH * (1 - pct)}
          x2={width - padding.right}
          y2={padding.top + chartH * (1 - pct)}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={0.5}
        />
      ))}

      <line
        x1={padding.left}
        y1={avgY}
        x2={width - padding.right}
        y2={avgY}
        stroke={color}
        strokeWidth={0.75}
        strokeDasharray="4 3"
        opacity={0.4}
      />
      <text
        x={padding.left + 2}
        y={avgY - 5}
        fontSize={7}
        fill={color}
        opacity={0.7}
      >
        avg {avg}
        {suffix}
      </text>

      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {isBucketed && (
        <text
          x={width - padding.right}
          y={padding.top - 8}
          textAnchor="end"
          fontSize={7}
          fill="var(--color-text-muted)"
        >
          each point = avg of {bucketSize} games
        </text>
      )}

      {values.map((s, i) => {
        const isHighlighted = highlights?.[i] ?? false;
        const dotColor = isHighlighted
          ? "var(--color-green)"
          : s >= avg
            ? color
            : "var(--color-surface-light)";
        const dotStroke = isHighlighted
          ? "var(--color-green)"
          : s >= avg
            ? color
            : "var(--color-text-muted)";
        return (
          <g key={i}>
            <circle
              cx={toX(i)}
              cy={toY(s)}
              r={3}
              fill={dotColor}
              stroke={dotStroke}
              strokeWidth={1}
            />
            {showValueLabels && (
              <text
                x={toX(i)}
                y={toY(s) - 8}
                textAnchor="middle"
                fontSize={7}
                fontWeight="bold"
                fill={
                  isHighlighted
                    ? "var(--color-green)"
                    : "var(--color-text-primary)"
                }
              >
                {s}
                {suffix}
              </text>
            )}
          </g>
        );
      })}
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
            <span className="text-[10px] font-semibold text-red">Split</span>
          )}
        </div>
        <p className="text-[10px] text-text-muted tabular-nums">
          {converted}/{attempts} converted
        </p>
      </div>
      <span
        className={`text-sm font-bold tabular-nums ${rate === 100 ? "text-green" : rate >= 50 ? "text-gold" : "text-text-secondary"}`}
      >
        {rate}%
      </span>
    </div>
  );
}

interface Props {
  overview: OverviewStats;
  leaves: LeaveStats;
}

export default function StatsContent({ overview, leaves }: Props) {
  const [tab, setTab] = useState<Tab>("overview");

  const totalGames = overview.total_games ?? 0;

  if (totalGames === 0) {
    return (
      <div className="glass flex flex-col items-center px-6 py-10 text-center">
        <p className="text-sm font-semibold">No games in this range</p>
        <p className="mt-1 text-xs text-text-muted">
          Change the filter or log a game
        </p>
      </div>
    );
  }

  const {
    avg = 0,
    high = 0,
    low = 0,
    detailed_games = 0,
    clean_games = 0,
    clean_rate = 0,
    strikes = 0,
    total_frames_played = 0,
    strike_rate = 0,
    spare_opportunities = 0,
    spares_converted = 0,
    spare_rate = 0,
    first_ball_frames = 0,
    pocket_hits = 0,
    pocket_rate = 0,
    doubles = 0,
    double_opportunities = 0,
    double_rate = 0,
    spare_conv_trend = [],
    scores = [],
    clean_flags = [],
  } = overview;

  const {
    total_spare_opportunities = 0,
    single_pin = { attempts: 0, converted: 0, rate: 0 },
    multi_pin = { attempts: 0, converted: 0, rate: 0 },
    splits = { attempts: 0, converted: 0, rate: 0 },
    single_pin_leaves = [],
    multi_pin_leaves = [],
    split_leaves = [],
    practice_targets = [],
    most_missed = [],
  } = leaves;

  return (
    <div>
      {/* Tabs */}
      <div className="relative mb-5 flex h-11 rounded-lg bg-surface-light p-[3px]">
        <span
          aria-hidden
          className={`absolute inset-y-[3px] left-[3px] w-[calc(50%-3px)] rounded-md bg-blue shadow-sm transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] ${tab === "spares" ? "translate-x-full" : ""}`}
        />
        <button
          onClick={() => setTab("overview")}
          aria-pressed={tab === "overview"}
          className={`relative flex-1 rounded-md text-[13px] font-semibold transition-colors duration-200 ${
            tab === "overview" ? "text-white" : "text-text-muted"
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setTab("spares")}
          aria-pressed={tab === "spares"}
          className={`relative flex-1 rounded-md text-[13px] font-semibold transition-colors duration-200 ${
            tab === "spares" ? "text-white" : "text-text-muted"
          }`}
        >
          Spares
        </button>
      </div>

      {totalGames === 0 ? (
        <div className="glass flex flex-col items-center px-6 py-10 text-center">
          <p className="text-sm font-semibold">No games in this range</p>
          <p className="mt-1 text-xs text-text-muted">
            Change the filter or log a game
          </p>
        </div>
      ) : tab === "overview" ? (
        <>
          {/* Overview stats */}
          <div className="mb-5 grid grid-cols-2 gap-2">
            <div className="glass px-3 py-3.5 text-center">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                Average
              </div>
              <div className="mt-1.5 text-2xl leading-none font-extrabold tabular-nums">
                {avg}
              </div>
            </div>
            <div className="glass px-3 py-3.5 text-center">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                High game
              </div>
              <div className="mt-1.5 text-2xl leading-none font-extrabold tabular-nums text-gold">
                {high}
              </div>
            </div>
            <div className="glass px-3 py-3.5 text-center">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                Low game
              </div>
              <div className="mt-1.5 text-2xl leading-none font-extrabold tabular-nums">
                {low}
              </div>
            </div>
            <div className="glass px-3 py-3.5 text-center">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                Clean games
              </div>
              <div className="mt-1.5 text-2xl leading-none font-extrabold tabular-nums text-green">
                {clean_games}
              </div>
            </div>
          </div>

          {/* Score trend */}
          <div className="glass mb-5 p-4">
            <h2 className="mb-2 text-sm font-bold text-text-secondary">
              Score trend
            </h2>
            <TrendChart values={scores} avg={avg} highlights={clean_flags} />
          </div>

          {/* Strike & Spare rates */}
          <div className="mb-5 grid grid-cols-2 gap-2">
            <div className="glass px-3 py-3.5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                Strike %
              </div>
              <div className="mt-1.5 text-2xl leading-none font-extrabold tabular-nums text-green">
                {strike_rate}%
              </div>
              <div className="mt-1.5 text-[10px] text-text-muted tabular-nums">
                {strikes}/{total_frames_played}
              </div>
            </div>
            <div className="glass px-3 py-3.5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                Spare %
              </div>
              <div className="mt-1.5 text-2xl leading-none font-extrabold tabular-nums text-gold">
                {spare_rate}%
              </div>
              <div className="mt-1.5 text-[10px] text-text-muted tabular-nums">
                {spares_converted}/{spare_opportunities}
              </div>
            </div>
            <div className="glass px-3 py-3.5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                Double %
              </div>
              <div className="mt-1.5 text-2xl leading-none font-extrabold tabular-nums text-green">
                {double_rate}%
              </div>
              <div className="mt-1.5 text-[10px] text-text-muted tabular-nums">
                {doubles}/{double_opportunities} back-to-back
              </div>
            </div>
            <div className="glass px-3 py-3.5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                Pocket %
              </div>
              <div className="mt-1.5 text-2xl leading-none font-extrabold tabular-nums text-blue">
                {pocket_rate}%
              </div>
              <div className="mt-1.5 text-[10px] text-text-muted tabular-nums">
                {pocket_hits}/{first_ball_frames} first balls
              </div>
            </div>
          </div>

          {/* Clean Rate */}
          <div className="glass px-3 py-3.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              Clean rate
            </div>
            <div className="mt-1.5 text-2xl leading-none font-extrabold tabular-nums text-green">
              {clean_rate}%
            </div>
            <div className="mt-1.5 text-[10px] text-text-muted tabular-nums">
              {clean_games}/{detailed_games} games
            </div>
          </div>
        </>
      ) : /* SPARES TAB */
      total_spare_opportunities === 0 ? (
        <div className="glass flex flex-col items-center px-6 py-10 text-center">
          <p className="text-sm font-semibold">No spare data yet</p>
          <p className="mt-1 text-xs text-text-muted">
            Log games with detailed entry to fill this
          </p>
        </div>
      ) : (
        <>
          {/* Spare Conversion Rate */}
          <div className="glass mb-4 px-3 py-3.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              Spare conversion
            </div>
            <div
              className={`mt-1.5 text-2xl leading-none font-extrabold tabular-nums ${spare_rate >= 50 ? "text-gold" : "text-text-primary"}`}
            >
              {spare_rate}%
            </div>
            <div className="mt-1.5 text-[10px] text-text-muted tabular-nums">
              {leaves.total_spares_converted}/{total_spare_opportunities}{" "}
              attempts
            </div>
          </div>

          {/* Practice these */}
          {most_missed.length > 0 && (
            <div className="glass mb-4 border border-gold/20 p-4">
              <h2 className="mb-2 text-sm font-bold text-gold">
                Practice these
              </h2>
              <p className="mb-3 text-[10px] text-text-muted">
                Your most missed leaves
              </p>
              <div className="flex flex-col gap-1.5">
                {most_missed.map((l) => (
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

          {/* Spare conversion trend */}
          {spare_conv_trend.length > 1 && (
            <div className="glass mb-4 p-4">
              <h2 className="mb-2 text-sm font-bold text-text-secondary">
                Spare conversion trend
              </h2>
              <TrendChart
                values={spare_conv_trend}
                avg={spare_rate}
                color="var(--color-gold)"
                suffix="%"
              />
            </div>
          )}

          {/* Spare breakdown Summary */}
          {total_spare_opportunities > 0 && (
            <div className="glass mb-4 p-4">
              <h2 className="mb-3 text-sm font-bold text-text-secondary">
                Spare breakdown
              </h2>
              <div className="flex flex-col gap-2.5">
                {[
                  {
                    label: "Single pin",
                    attempts: single_pin.attempts,
                    converted: single_pin.converted,
                    rate: single_pin.rate,
                    textColor: "text-green",
                    barColor: "bg-green",
                  },
                  {
                    label: "Multi pin",
                    attempts: multi_pin.attempts,
                    converted: multi_pin.converted,
                    rate: multi_pin.rate,
                    textColor: "text-gold",
                    barColor: "bg-gold",
                  },
                  {
                    label: "Splits",
                    attempts: splits.attempts,
                    converted: splits.converted,
                    rate: splits.rate,
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
                          <p className="text-[10px] text-text-muted tabular-nums">
                            {converted}/{attempts} converted
                          </p>
                        </div>
                        <span
                          className={`text-lg font-extrabold tabular-nums ${textColor}`}
                        >
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
          {single_pin_leaves.length > 0 && (
            <div className="glass mb-4 p-4">
              <h2 className="mb-2 text-sm font-bold text-green">
                Single pin leaves
              </h2>
              <p className="mb-3 text-[10px] text-text-muted tabular-nums">
                {single_pin.converted}/{single_pin.attempts} converted (
                {single_pin.rate}%)
              </p>
              <div className="flex flex-col gap-1.5">
                {single_pin_leaves.map((l) => (
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

          {multi_pin_leaves.length > 0 && (
            <div className="glass mb-4 p-4">
              <h2 className="mb-2 text-sm font-bold text-gold">
                Multi pin leaves
              </h2>
              <p className="mb-3 text-[10px] text-text-muted tabular-nums">
                {multi_pin.converted}/{multi_pin.attempts} converted (
                {multi_pin.rate}%)
              </p>
              <div className="flex flex-col gap-1.5">
                {multi_pin_leaves.map((l) => (
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

          {split_leaves.length > 0 && (
            <div className="glass p-4">
              <h2 className="mb-2 text-sm font-bold text-red">Split leaves</h2>
              <p className="mb-3 text-[10px] text-text-muted tabular-nums">
                {splits.converted}/{splits.attempts} converted ({splits.rate}%)
              </p>
              <div className="flex flex-col gap-1.5">
                {split_leaves.map((l) => (
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
