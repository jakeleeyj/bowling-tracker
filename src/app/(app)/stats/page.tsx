export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase-server";
import type { GameWithSessionDate, FrameRow } from "@/lib/queries";

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

export default async function StatsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get user's games ordered by date
  const { data: games } = (await supabase
    .from("games")
    .select("*, sessions(session_date)")
    .eq("user_id", user?.id ?? "")
    .order("created_at", { ascending: true })) as {
    data: GameWithSessionDate[] | null;
  };

  // Get frames for detailed games
  const gameIds = games?.map((g) => g.id) ?? [];
  const { data: allFrames } = (await supabase
    .from("frames")
    .select("*")
    .in("game_id", gameIds.length > 0 ? gameIds : ["none"])) as {
    data: FrameRow[] | null;
  };

  const totalGames = games?.length ?? 0;

  if (totalGames === 0) {
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

  const scores = games?.map((g) => g.total_score) ?? [];
  const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const high = Math.max(...scores);
  const low = Math.min(...scores);

  // Strike and spare stats from detailed games
  const detailedGames = games?.filter((g) => g.entry_type === "detailed") ?? [];
  const totalStrikes = detailedGames.reduce(
    (sum, g) => sum + g.strike_count,
    0,
  );
  const totalSpares = detailedGames.reduce((sum, g) => sum + g.spare_count, 0);
  const cleanGames = detailedGames.filter((g) => g.is_clean).length;

  // Spare conversion rate
  const framesWithSpareOpportunity =
    allFrames?.filter((f) => !f.is_strike && f.frame_number <= 9) ?? [];
  const sparesConverted = framesWithSpareOpportunity.filter(
    (f) => f.is_spare,
  ).length;
  const spareRate =
    framesWithSpareOpportunity.length > 0
      ? Math.round((sparesConverted / framesWithSpareOpportunity.length) * 100)
      : 0;

  // Strike rate
  const totalFramesForStrikeCalc =
    allFrames?.filter((f) => f.frame_number <= 9).length ?? 0;
  const strikeRate =
    totalFramesForStrikeCalc > 0
      ? Math.round((totalStrikes / totalFramesForStrikeCalc) * 100)
      : 0;

  // Pin leave frequency (which pins are left standing most)
  const pinLeaveCount: Record<number, number> = {};
  allFrames
    ?.filter(
      (f) =>
        f.pins_remaining && Array.isArray(f.pins_remaining) && !f.is_strike,
    )
    .forEach((f) => {
      const pins = f.pins_remaining as number[];
      pins.forEach((pin) => {
        pinLeaveCount[pin] = (pinLeaveCount[pin] ?? 0) + 1;
      });
    });

  const maxLeaves = Math.max(...Object.values(pinLeaveCount), 1);

  // Spare streak (longest consecutive spares)
  let maxSpareStreak = 0;
  let currentStreak = 0;
  const sortedFrames = [...(allFrames ?? [])].sort((a, b) => {
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

  // Score chart - last 20 games
  const recentScores = scores.slice(-20);
  const chartMax = Math.max(...recentScores, 200);
  const chartMin = Math.min(...recentScores, 0);
  const chartRange = chartMax - chartMin || 1;

  return (
    <div>
      <h1 className="mb-6 text-xl font-extrabold">My Stats</h1>

      {/* Overview stats */}
      <div className="mb-4 grid grid-cols-2 gap-2">
        <div className="glass p-3 text-center">
          <div className="text-[10px] uppercase text-text-muted">Average</div>
          <div className="text-2xl font-extrabold">{avg}</div>
        </div>
        <div className="glass p-3 text-center">
          <div className="text-[10px] uppercase text-text-muted">High Game</div>
          <div className="text-2xl font-extrabold text-gold">{high}</div>
        </div>
        <div className="glass p-3 text-center">
          <div className="text-[10px] uppercase text-text-muted">Low Game</div>
          <div className="text-2xl font-extrabold">{low}</div>
        </div>
        <div className="glass p-3 text-center">
          <div className="text-[10px] uppercase text-text-muted">
            Clean Games
          </div>
          <div className="text-2xl font-extrabold text-green">{cleanGames}</div>
        </div>
      </div>

      {/* Score Trend */}
      <div className="glass mb-4 p-4">
        <h3 className="mb-3 text-xs font-bold text-text-secondary">
          Score Trend (Last {recentScores.length} games)
        </h3>
        <div className="flex h-32 items-end gap-[2px]">
          {recentScores.map((score, i) => {
            const height = ((score - chartMin) / chartRange) * 100;
            const isAboveAvg = score >= avg;

            return (
              <div key={i} className="group relative flex-1" title={`${score}`}>
                <div
                  className={`rounded-t transition-all ${isAboveAvg ? "bg-blue" : "bg-surface-light"}`}
                  style={{ height: `${Math.max(height, 4)}%` }}
                />
                <div className="pointer-events-none absolute -top-5 left-1/2 hidden -translate-x-1/2 text-[9px] font-bold group-hover:block">
                  {score}
                </div>
              </div>
            );
          })}
        </div>
        {/* Avg line label */}
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
            {totalStrikes} total strikes
          </div>
        </div>
        <div className="glass flex-1 p-4">
          <h3 className="mb-2 text-xs font-bold text-text-secondary">
            Spare %
          </h3>
          <div className="text-3xl font-extrabold text-gold">{spareRate}%</div>
          <div className="text-[10px] text-text-muted">
            {sparesConverted}/{framesWithSpareOpportunity.length} converted
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
    </div>
  );
}
