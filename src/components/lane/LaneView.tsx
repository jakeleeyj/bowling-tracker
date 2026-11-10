import type { ShotStats } from "@/lib/lane/shotStats";

// Top-down lane: 6 units per board, 10 per foot, pin deck on top
const BOARD = 6;
const FOOT = 10;
const LANE_W = 39 * BOARD;
const LANE_H = 60 * FOOT;
const DECK = 64;
const x = (board: number) => (39.5 - board) * BOARD;
const y = (feet: number) => DECK + LANE_H - feet * FOOT;

// Pins 12 in apart (11.26 boards), rows 10.4 in apart
const PIN_GAP = 11.26 / 2;
const PINS = [
  [0, 0],
  [-1, 1],
  [1, 1],
  [-2, 2],
  [0, 2],
  [2, 2],
  [-3, 3],
  [-1, 3],
  [1, 3],
  [3, 3],
].map(([col, row]) => ({ board: 20 + col * PIN_GAP, row }));
// Arrows form a V pointing at the pins, 13 to 16 ft out
const ARROWS = [5, 10, 15, 20, 25, 30, 35].map((b) => ({
  board: b,
  feet: 16 - Math.abs(b - 20) / 5,
}));
const DOTS = [3, 5, 8, 11, 14, 26, 29, 32, 35, 37];
const RANGE_FINDERS = [
  { board: 15, from: 33 },
  { board: 25, from: 33 },
  { board: 10, from: 38 },
  { board: 30, from: 38 },
];

function line(stats: ShotStats, from: number, to: number) {
  const pts: string[] = [];
  for (let f = from; f < to; f += 0.5) {
    pts.push(`${x(stats.boardAt(f)).toFixed(1)},${y(f).toFixed(1)}`);
  }
  pts.push(`${x(stats.boardAt(to)).toFixed(1)},${y(to).toFixed(1)}`);
  return pts.join(" ");
}

export default function LaneView({ stats }: { stats: ShotStats }) {
  const seenFrom = Math.max(0, stats.path[0].feet);
  const seenTo = Math.min(60, Math.max(...stats.path.map((p) => p.feet)));
  const markers = [
    { feet: 0, board: stats.releaseBoard, color: "fill-green" },
    { feet: 15, board: stats.arrowsBoard, color: "fill-gold" },
    {
      feet: stats.breakpointFeet,
      board: stats.breakpointBoard,
      color: "fill-purple",
    },
    { feet: 60, board: stats.entryBoard, color: "fill-pink" },
  ];

  return (
    <svg
      viewBox={`-14 0 ${LANE_W + 28} ${DECK + LANE_H + 8}`}
      role="img"
      aria-label="Ball path down the lane"
      className="h-auto w-full"
    >
      <rect
        x={-14}
        width={LANE_W + 28}
        height={DECK + LANE_H + 8}
        rx={8}
        className="fill-base"
      />
      <rect
        x={-10}
        y={DECK - 4}
        width={10}
        height={LANE_H + 4}
        rx={5}
        className="fill-surface"
      />
      <rect
        x={LANE_W}
        y={DECK - 4}
        width={10}
        height={LANE_H + 4}
        rx={5}
        className="fill-surface"
      />
      <rect
        y={DECK}
        width={LANE_W}
        height={LANE_H}
        className="fill-surface-light"
      />
      <defs>
        <pattern
          id="lane-boards"
          width={BOARD}
          height={10}
          patternUnits="userSpaceOnUse"
        >
          <line x1={0} x2={0} y2={10} className="stroke-text-primary/10" />
        </pattern>
      </defs>
      <rect
        x={BOARD}
        y={DECK}
        width={LANE_W - BOARD}
        height={LANE_H}
        fill="url(#lane-boards)"
      />
      {ARROWS.map((a) => (
        <path
          key={a.board}
          d={`M${x(a.board)} ${y(a.feet) - 8}l-3 12h6z`}
          className="fill-text-primary/50"
        />
      ))}
      {DOTS.map((b) => (
        <circle
          key={b}
          cx={x(b)}
          cy={y(7)}
          r={1.5}
          className="fill-text-primary/40"
        />
      ))}
      {RANGE_FINDERS.map((r) => (
        <rect
          key={r.board}
          x={x(r.board) - 1.5}
          y={y(r.from + 3)}
          width={3}
          height={3 * FOOT}
          rx={1.5}
          className="fill-text-primary/30"
        />
      ))}
      <line
        x2={LANE_W}
        y1={y(0)}
        y2={y(0)}
        strokeWidth={2}
        className="stroke-text-muted"
      />
      <rect y={4} width={LANE_W} height={DECK - 4} className="fill-surface" />
      {PINS.map((p, i) => (
        <circle
          key={i}
          cx={x(p.board)}
          cy={y(60) - 10 - p.row * 12}
          r={6}
          className="fill-text-primary/80"
        />
      ))}
      {/* Faint where the camera couldn't see the ball */}
      <polyline
        points={line(stats, 0, seenFrom)}
        fill="none"
        strokeWidth={4}
        strokeLinecap="round"
        className="stroke-blue/40"
      />
      <polyline
        points={line(stats, seenTo, 60)}
        fill="none"
        strokeWidth={4}
        strokeLinecap="round"
        className="stroke-blue/40"
      />
      <polyline
        points={line(stats, seenFrom, seenTo)}
        fill="none"
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-blue"
      />
      {markers.map((m) => (
        <circle
          key={m.color}
          cx={x(m.board)}
          cy={y(m.feet)}
          r={6}
          strokeWidth={2}
          className={`${m.color} stroke-base`}
        />
      ))}
    </svg>
  );
}
