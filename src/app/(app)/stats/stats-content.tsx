"use client";

import { useState } from "react";
import type { OverviewStats, LeaveStats } from "@/lib/queries";

type Tab = "overview" | "spares";

function TrendChart({
  values,
  avg,
  color = "#3b82f6",
  suffix = "",
}: {
  values: number[];
  avg: number;
  color?: string;
  suffix?: string;
}) {
  if (values.length === 0) return null;

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

      {values.map((s, i) => (
        <g key={i}>
          <circle
            cx={toX(i)}
            cy={toY(s)}
            r={3}
            fill={s >= avg ? color : "#334155"}
            stroke={s >= avg ? color : "#64748b"}
            strokeWidth={1}
          />
          {showValueLabels && (
            <text
              x={toX(i)}
              y={toY(s) - 8}
              textAnchor="middle"
              fontSize={7}
              fontWeight="bold"
              fill="#e2e8f0"
            >
              {s}
              {suffix}
            </text>
          )}
        </g>
      ))}
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

interface Props {
  overview: OverviewStats;
  leaves: LeaveStats;
}

export default function StatsContent({ overview, leaves }: Props) {
  const [tab, setTab] = useState<Tab>("overview");

  const totalGames = overview.total_games ?? 0;

  if (totalGames === 0) {
    return (
      <div className="glass p-8 text-center">
        <p className="text-sm text-text-muted">No games in this range.</p>
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
  } = leaves;

  return (
    <div>
      {/* Tabs */}
      <div className="mb-5 flex rounded-lg bg-surface-light p-[3px]">
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

      {totalGames === 0 ? (
        <div className="glass p-8 text-center">
          <p className="text-sm text-text-muted">No games in this range.</p>
        </div>
      ) : tab === "overview" ? (
        <>
          {/* Overview stats */}
          <div className="mb-5 grid grid-cols-2 gap-2">
            <div className="glass p-3 text-center">
              <div className="text-[10px] uppercase tracking-wide text-text-muted">
                Average
              </div>
              <div className="text-2xl font-extrabold">{avg}</div>
            </div>
            <div className="glass p-3 text-center">
              <div className="text-[10px] uppercase tracking-wide text-text-muted">
                High Game
              </div>
              <div className="text-2xl font-extrabold text-gold">{high}</div>
            </div>
            <div className="glass p-3 text-center">
              <div className="text-[10px] uppercase tracking-wide text-text-muted">
                Low Game
              </div>
              <div className="text-2xl font-extrabold">{low}</div>
            </div>
            <div className="glass p-3 text-center">
              <div className="text-[10px] uppercase tracking-wide text-text-muted">
                Clean Games
              </div>
              <div className="text-2xl font-extrabold text-green">
                {clean_games}
              </div>
            </div>
          </div>

          {/* Score Trend */}
          <div className="glass mb-5 p-4">
            <h3 className="mb-2 text-xs font-bold text-text-secondary">
              Score Trend
            </h3>
            <TrendChart values={scores} avg={avg} />
          </div>

          {/* Strike & Spare rates */}
          <div className="mb-5 grid grid-cols-2 gap-2">
            <div className="glass p-3">
              <div className="text-[10px] uppercase tracking-wide text-text-muted">
                Strike %
              </div>
              <div className="text-2xl font-extrabold text-green">
                {strike_rate}%
              </div>
              <div className="text-[10px] text-text-muted">
                {strikes}/{total_frames_played}
              </div>
            </div>
            <div className="glass p-3">
              <div className="text-[10px] uppercase tracking-wide text-text-muted">
                Spare %
              </div>
              <div className="text-2xl font-extrabold text-gold">
                {spare_rate}%
              </div>
              <div className="text-[10px] text-text-muted">
                {spares_converted}/{spare_opportunities}
              </div>
            </div>
            <div className="glass p-3">
              <div className="text-[10px] uppercase tracking-wide text-text-muted">
                Double %
              </div>
              <div className="text-2xl font-extrabold text-green">
                {double_rate}%
              </div>
              <div className="text-[10px] text-text-muted">
                {doubles}/{double_opportunities} back-to-back
              </div>
            </div>
            <div className="glass p-3">
              <div className="text-[10px] uppercase tracking-wide text-text-muted">
                Pocket %
              </div>
              <div className="text-2xl font-extrabold text-blue">
                {pocket_rate}%
              </div>
              <div className="text-[10px] text-text-muted">
                {pocket_hits}/{first_ball_frames} first balls
              </div>
            </div>
          </div>

          {/* Clean Rate */}
          <div className="glass p-4">
            <div className="text-[10px] uppercase text-text-muted">
              Clean Rate
            </div>
            <div className="text-2xl font-extrabold text-green">
              {clean_rate}%
            </div>
            <div className="text-[10px] text-text-muted">
              {clean_games}/{detailed_games} games
            </div>
          </div>
        </>
      ) : /* SPARES TAB */
      total_spare_opportunities === 0 ? (
        <div className="glass p-8 text-center">
          <p className="text-sm text-text-muted">
            Log games with detailed entry to see spare stats.
          </p>
        </div>
      ) : (
        <>
          {/* Spare Conversion Rate */}
          <div className="glass mb-4 p-4">
            <div className="text-[10px] uppercase text-text-muted">
              Spare Conversion
            </div>
            <div
              className={`text-2xl font-extrabold ${spare_rate >= 50 ? "text-gold" : "text-text-primary"}`}
            >
              {spare_rate}%
            </div>
            <div className="text-[10px] text-text-muted">
              {leaves.total_spares_converted}/{total_spare_opportunities}{" "}
              attempts
            </div>
          </div>

          {/* Practice These */}
          {practice_targets.length > 0 && (
            <div className="glass mb-4 border border-gold/20 p-4">
              <h3 className="mb-2 text-xs font-bold text-gold">
                Practice These
              </h3>
              <p className="mb-3 text-[10px] text-text-muted">
                Your most missed leaves — focus here to improve
              </p>
              <div className="flex flex-col gap-1.5">
                {practice_targets.map((l) => (
                  <LeaveItem
                    key={l.pins.join("-")}
                    pins={l.pins}
                    attempts={l.attempts}
                    converted={l.converted}
                    isSplitLeave={l.category === "split"}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Spare Conversion Trend */}
          {spare_conv_trend.length > 1 && (
            <div className="glass mb-4 p-4">
              <h3 className="mb-2 text-xs font-bold text-text-secondary">
                Spare Conversion Trend
              </h3>
              <TrendChart
                values={spare_conv_trend}
                avg={spare_rate}
                color="#f59e0b"
                suffix="%"
              />
            </div>
          )}

          {/* Spare Breakdown Summary */}
          {total_spare_opportunities > 0 && (
            <div className="glass mb-4 p-4">
              <h3 className="mb-3 text-xs font-bold text-text-secondary">
                Spare Breakdown
              </h3>
              <div className="flex flex-col gap-2.5">
                {[
                  {
                    label: "Single Pin",
                    attempts: single_pin.attempts,
                    converted: single_pin.converted,
                    rate: single_pin.rate,
                    textColor: "text-green",
                    barColor: "bg-green",
                  },
                  {
                    label: "Multi Pin",
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
          {single_pin_leaves.length > 0 && (
            <div className="glass mb-4 p-4">
              <h3 className="mb-2 text-xs font-bold text-green">
                Single Pin Leaves
              </h3>
              <p className="mb-3 text-[10px] text-text-muted">
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
              <h3 className="mb-2 text-xs font-bold text-gold">
                Multi Pin Leaves
              </h3>
              <p className="mb-3 text-[10px] text-text-muted">
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
              <h3 className="mb-2 text-xs font-bold text-red">Split Leaves</h3>
              <p className="mb-3 text-[10px] text-text-muted">
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
