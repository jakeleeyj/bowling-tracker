"use client";

import type { BallDraft } from "@/components/arsenal/DrillingSpecsForm";
import { formatMeasure, parseMeasure } from "@/lib/flightAnalysis";

// Graphical drilling chart: finger holes with sizes, pitch arrows, bridge
// and span — the way a pro shop's drill sheet lays it out.

function PitchChip({
  x,
  y,
  lateral,
  forward,
  lateralFlip = false,
}: {
  x: number;
  y: number;
  lateral: string | undefined;
  forward: string | undefined;
  lateralFlip?: boolean;
}) {
  const lat = parseMeasure(lateral ?? "");
  const fwd = parseMeasure(forward ?? "");
  if (!Number.isFinite(lat) && !Number.isFinite(fwd)) return null;
  const items: string[] = [];
  if (Number.isFinite(lat) && lat !== 0)
    items.push(
      `${lat > 0 !== lateralFlip ? "→" : "←"} ${formatMeasure(Math.abs(lat))}"`,
    );
  if (Number.isFinite(fwd) && fwd !== 0)
    items.push(`${fwd > 0 ? "↑" : "↓"} ${formatMeasure(Math.abs(fwd))}"`);
  if (items.length === 0) return null;
  return (
    <text
      x={x}
      y={y}
      fontSize={11}
      fill="var(--color-text-secondary)"
      textAnchor="middle"
    >
      {items.join("  ")}
    </text>
  );
}

function Hole({
  cx,
  cy,
  r,
  size,
}: {
  cx: number;
  cy: number;
  r: number;
  size: string | undefined;
}) {
  return (
    <>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="var(--color-base)"
        stroke="var(--color-border-light)"
        strokeWidth={5}
      />
      <text
        x={cx}
        y={cy + 4}
        fontSize={12}
        fontWeight={700}
        fill="var(--color-text-primary)"
        textAnchor="middle"
      >
        {size?.trim() ? size : "—"}
      </text>
    </>
  );
}

export default function GripChart({
  draft,
  maxWidth = 300,
}: {
  draft: BallDraft;
  maxWidth?: number;
}) {
  const W = 300;
  const fingerY = 62;
  const fingerR = 34;
  const thumbR = 42;
  const fingerDX = 52;
  const thumbY = draft.no_thumb ? 0 : 210;
  const H = draft.no_thumb ? 130 : 280;
  const cx = W / 2;
  const span = draft.span?.trim();

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="mx-auto w-full"
      style={{ maxWidth }}
      role="img"
      aria-label="Grip drilling chart"
    >
      {/* finger pitch chips — right finger falls back to the left values */}
      <PitchChip
        x={cx - fingerDX}
        y={16}
        lateral={draft.finger_pitch_lateral}
        forward={draft.finger_pitch_forward}
        lateralFlip
      />
      <PitchChip
        x={cx + fingerDX}
        y={16}
        lateral={
          draft.finger_pitch_lateral_2?.trim()
            ? draft.finger_pitch_lateral_2
            : draft.finger_pitch_lateral
        }
        forward={
          draft.finger_pitch_forward_2?.trim()
            ? draft.finger_pitch_forward_2
            : draft.finger_pitch_forward
        }
      />

      {/* finger holes */}
      <Hole
        cx={cx - fingerDX}
        cy={fingerY}
        r={fingerR}
        size={draft.finger_size}
      />
      <Hole
        cx={cx + fingerDX}
        cy={fingerY}
        r={fingerR}
        size={
          draft.finger_size_2?.trim() ? draft.finger_size_2 : draft.finger_size
        }
      />

      {/* bridge */}
      <line
        x1={cx - fingerDX + fingerR}
        y1={fingerY}
        x2={cx + fingerDX - fingerR}
        y2={fingerY}
        stroke="var(--color-text-muted)"
        strokeWidth={1}
        strokeDasharray="3 3"
      />
      <text
        x={cx}
        y={fingerY + 34}
        fontSize={11}
        fill="var(--color-text-secondary)"
        textAnchor="middle"
      >
        ¼&quot; bridge
      </text>

      {!draft.no_thumb && (
        <>
          {/* span lines */}
          <line
            x1={cx - fingerDX}
            y1={fingerY + fingerR}
            x2={cx - 12}
            y2={thumbY - thumbR + 6}
            stroke="var(--color-text-muted)"
            strokeWidth={1}
            strokeDasharray="4 3"
          />
          <line
            x1={cx + fingerDX}
            y1={fingerY + fingerR}
            x2={cx + 12}
            y2={thumbY - thumbR + 6}
            stroke="var(--color-text-muted)"
            strokeWidth={1}
            strokeDasharray="4 3"
          />
          <text
            x={cx - 78}
            y={(fingerY + thumbY) / 2 + 6}
            fontSize={12}
            fontWeight={600}
            fill="var(--color-text-primary)"
            textAnchor="middle"
          >
            {span ? `${span}"` : "—"}
          </text>
          <text
            x={cx + 78}
            y={(fingerY + thumbY) / 2 + 6}
            fontSize={12}
            fontWeight={600}
            fill="var(--color-text-primary)"
            textAnchor="middle"
          >
            {span ? `${span}"` : "—"}
          </text>

          {/* thumb */}
          <Hole cx={cx} cy={thumbY} r={thumbR} size={draft.thumb_size} />
          <PitchChip
            x={cx}
            y={thumbY + thumbR + 20}
            lateral={draft.thumb_pitch_lateral}
            forward={draft.thumb_pitch_forward}
          />
        </>
      )}
    </svg>
  );
}
