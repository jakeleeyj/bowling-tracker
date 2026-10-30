interface ScoreSparklineProps {
  scores: number[];
}

const WIDTH = 300;
const HEIGHT = 36;
const PAD = 3;

// Oldest to newest, left to right. Needs at least two games to draw a line.
export default function ScoreSparkline({ scores }: ScoreSparklineProps) {
  if (scores.length < 2) return null;

  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const span = max - min || 1;
  const step = WIDTH / (scores.length - 1);
  const points = scores.map((s, i) => [
    i * step,
    PAD + (1 - (s - min) / span) * (HEIGHT - PAD * 2),
  ]);
  const lastY = points[points.length - 1][1];

  return (
    <div className="border-t border-border-light px-3.5 pt-3 pb-2.5">
      <div className="mb-2 flex justify-between text-[11px] text-text-muted">
        <span>Last {scores.length}</span>
        <span className="tabular-nums">{scores[scores.length - 1]}</span>
      </div>
      <div className="relative">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          preserveAspectRatio="none"
          className="block h-9 w-full overflow-visible"
          role="img"
          aria-label={`Last ${scores.length} games: ${scores.join(", ")}`}
        >
          <polyline
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            className="text-text-primary"
            points={points.map(([x, y]) => `${x},${y}`).join(" ")}
          />
        </svg>
        <span
          aria-hidden
          className="absolute -right-[3px] size-1.5 -translate-y-1/2 rounded-full bg-blue"
          style={{ top: lastY }}
        />
      </div>
    </div>
  );
}
