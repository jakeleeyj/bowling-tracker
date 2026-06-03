"use client";

import { type MinigameState, TOTAL_FRAMES } from "@/lib/minigame";

interface Props {
  state: MinigameState;
  playerId: string;
  gameIndex: number;
  currentFrame: number;
  onFrameTap: (frameIndex: number) => void;
}

interface FrameCell {
  strikes: number;
  spares: number;
  cornerMade: number;
  cornerMissed: number;
  points: number;
}

// Build a per-frame breakdown for this player + game from the event log.
function buildFrames(
  state: MinigameState,
  playerId: string,
  gameIndex: number,
): FrameCell[] {
  const cells: FrameCell[] = Array.from({ length: TOTAL_FRAMES }, () => ({
    strikes: 0,
    spares: 0,
    cornerMade: 0,
    cornerMissed: 0,
    points: 0,
  }));
  for (const e of state.events) {
    if (e.playerId !== playerId || e.gameIndex !== gameIndex) continue;
    if (e.frameIndex < 0 || e.frameIndex >= TOTAL_FRAMES) continue;
    const c = cells[e.frameIndex];
    if (e.type === "strike") c.strikes++;
    else if (e.type === "spare") c.spares++;
    else if (e.type === "cornerMade") c.cornerMade++;
    else if (e.type === "cornerMissed") c.cornerMissed++;
    c.points += e.points;
  }
  return cells;
}

function Glyph({
  char,
  count,
  className,
}: {
  char: string;
  count: number;
  className: string;
}) {
  if (count === 0) return null;
  return (
    <span className={`font-bold ${className}`}>
      {char}
      {count > 1 ? <span className="text-[7px]">{count}</span> : null}
    </span>
  );
}

export default function MinigameScorecard({
  state,
  playerId,
  gameIndex,
  currentFrame,
  onFrameTap,
}: Props) {
  const cells = buildFrames(state, playerId, gameIndex);
  const cumulative: number[] = [];
  cells.reduce((sum, c) => {
    const next = sum + c.points;
    cumulative.push(next);
    return next;
  }, 0);
  const lastFrameWithEvents = cells.reduce(
    (max, c, i) =>
      c.strikes || c.spares || c.cornerMade || c.cornerMissed ? i : max,
    -1,
  );

  return (
    <div className="glass overflow-hidden rounded-lg">
      <table className="w-full table-fixed border-collapse text-center">
        <thead>
          <tr>
            {cells.map((_, i) => (
              <th
                key={i}
                style={{ width: "10%" }}
                className="border border-border py-[2px] text-[8px] font-normal text-text-muted"
              >
                {i + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Marks */}
          <tr className="h-[24px]">
            {cells.map((c, i) => {
              const has =
                c.strikes || c.spares || c.cornerMade || c.cornerMissed;
              return (
                <td
                  key={i}
                  onClick={() => onFrameTap(i)}
                  className={`cursor-pointer border border-border align-middle text-[10px] leading-none ${
                    i === currentFrame ? "bg-blue/15" : "active:bg-blue/5"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-center gap-x-0.5">
                    <Glyph char="X" count={c.strikes} className="text-blue" />
                    <Glyph char="/" count={c.spares} className="text-purple" />
                    <Glyph
                      char="◎"
                      count={c.cornerMade}
                      className="text-green"
                    />
                    <Glyph
                      char="−"
                      count={c.cornerMissed}
                      className="text-red"
                    />
                    {!has && i === currentFrame ? (
                      <span className="animate-pulse text-blue">_</span>
                    ) : null}
                  </div>
                </td>
              );
            })}
          </tr>
          {/* Cumulative points */}
          <tr className="h-[20px]">
            {cells.map((_, i) => {
              const show = i <= lastFrameWithEvents;
              return (
                <td
                  key={i}
                  className="border border-border text-[10px] font-bold tabular-nums text-text-primary"
                >
                  {show ? (
                    cumulative[i]
                  ) : (
                    <span className="text-text-muted/40">·</span>
                  )}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
