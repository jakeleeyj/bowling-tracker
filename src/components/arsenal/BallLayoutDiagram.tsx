"use client";

import {
  computeLayoutGeometry,
  BALL_RADIUS_PX,
  type PapPosition,
  type Handedness,
} from "@/lib/layoutGeometry";
import {
  dualAngleToVLS,
  dualAngleTo2LS,
  type DualAngleLayout,
} from "@/lib/layoutEngine";

const SIZE = BALL_RADIUS_PX * 2;
const PAD = 24;

export type DiagramSystem = "dual" | "vls" | "2ls";

export default function BallLayoutDiagram({
  layout,
  system = "dual",
  pap,
  hand = "right",
  showThumb = true,
}: {
  layout: DualAngleLayout;
  system?: DiagramSystem;
  pap?: PapPosition;
  hand?: Handedness;
  showThumb?: boolean;
}) {
  const g = computeLayoutGeometry(layout, pap, hand);
  const blue = "var(--color-blue)";
  const purple = "var(--color-purple)";
  const gold = "var(--color-gold)";
  const green = "var(--color-green)";
  const red = "var(--color-red)";
  const muted = "var(--color-text-muted)";
  const surface = "var(--color-surface-light)";

  const vls = dualAngleToVLS(layout);
  const papForCog = pap ?? { over: 4.5, up: 0 };
  const twoLS = dualAngleTo2LS(layout, papForCog);
  const showPsa = true;
  const pinNearGrip = Math.hypot(g.pin.x - g.grip.x, g.pin.y - g.grip.y) < 45;

  return (
    <svg
      viewBox={`${-PAD} ${-PAD} ${SIZE + PAD * 2} ${SIZE + PAD * 2}`}
      className="mx-auto w-full max-w-[300px]"
      role="img"
      aria-label={`Layout diagram: ${layout.drillingAngle}° drilling angle, ${layout.pinToPap} inch pin to PAP, ${layout.valAngle}° VAL angle`}
    >
      <defs>
        <clipPath id="ball-face">
          <circle cx={g.center.x} cy={g.center.y} r={BALL_RADIUS_PX - 2} />
        </clipPath>
      </defs>

      {/* ball */}
      <circle
        cx={g.center.x}
        cy={g.center.y}
        r={BALL_RADIUS_PX}
        fill={surface}
        stroke="var(--color-border-light)"
        strokeWidth={2}
      />

      {/* midline through grip center and PAP */}
      <line
        x1={g.center.x - BALL_RADIUS_PX + 12}
        y1={g.grip.y}
        x2={g.center.x + BALL_RADIUS_PX - 12}
        y2={g.grip.y}
        stroke={muted}
        strokeWidth={1}
        strokeDasharray="4 4"
      />
      {/* VAL — used by Dual Angle and VLS; 2LS is a distance-only system */}
      {system !== "2ls" && (
        <>
          <line
            x1={g.valTop.x}
            y1={g.valTop.y}
            x2={g.valBottom.x}
            y2={g.valBottom.y}
            stroke={gold}
            strokeWidth={1.5}
            strokeDasharray="6 4"
          />
          <text
            x={g.valTop.x + 6}
            y={g.valTop.y + 16}
            fontSize={11}
            fill={gold}
          >
            VAL
          </text>
        </>
      )}

      {/* grip holes — clipped at the silhouette; on a real ball they wrap around */}
      <g clipPath="url(#ball-face)">
        {g.fingers.map((f, i) => (
          <circle
            key={i}
            cx={f.x}
            cy={f.y}
            r={9}
            fill="none"
            stroke={muted}
            strokeWidth={1.5}
          />
        ))}
        {showThumb && (
          <circle
            cx={g.thumb.x}
            cy={g.thumb.y}
            r={12}
            fill="none"
            stroke={muted}
            strokeWidth={1.5}
          />
        )}
      </g>
      <circle cx={g.grip.x} cy={g.grip.y} r={2.5} fill={muted} />
      <text x={g.grip.x - 8} y={g.grip.y + 16} fontSize={10} fill={muted}>
        grip
      </text>

      {/* pin-to-PAP line — line 1 in every system */}
      <line
        x1={g.pap.x}
        y1={g.pap.y}
        x2={g.pin.x}
        y2={g.pin.y}
        stroke={blue}
        strokeWidth={2}
      />
      <text
        x={(g.pap.x + g.pin.x) / 2 + 8}
        y={(g.pap.y + g.pin.y) / 2}
        fontSize={11}
        fill={blue}
      >
        {layout.pinToPap}&quot;
      </text>

      {/* VLS: pin buffer — distance from the pin to the VAL */}
      {system === "vls" && (
        <>
          <line
            x1={g.pin.x}
            y1={g.pin.y}
            x2={g.pap.x}
            y2={g.pin.y}
            stroke={gold}
            strokeWidth={1.5}
            strokeDasharray="2 3"
          />
          <text
            x={(g.pin.x + g.pap.x) / 2 - 8}
            y={g.pin.y - 8}
            fontSize={10}
            fill={gold}
          >
            {vls.pinBuffer}&quot;
          </text>
        </>
      )}

      {/* PSA */}
      {showPsa && (
        <>
          <line
            x1={g.pin.x}
            y1={g.pin.y}
            x2={g.psa.x}
            y2={g.psa.y}
            stroke={purple}
            strokeWidth={1.5}
            strokeDasharray="3 3"
          />
          <circle cx={g.psa.x} cy={g.psa.y} r={4} fill={purple} />
          <text x={g.psa.x + 7} y={g.psa.y + 4} fontSize={11} fill={purple}>
            PSA
          </text>
          {system === "dual" && (
            <text
              x={(g.pin.x + g.psa.x) / 2 + 8}
              y={(g.pin.y + g.psa.y) / 2 - 6}
              fontSize={10}
              fill={purple}
            >
              {layout.drillingAngle}°
            </text>
          )}
        </>
      )}

      {/* PSA-to-PAP arc — part of both the VLS and 2LS specs */}
      {system !== "dual" && (
        <>
          <line
            x1={g.psa.x}
            y1={g.psa.y}
            x2={g.pap.x}
            y2={g.pap.y}
            stroke={purple}
            strokeWidth={1.5}
          />
          <text
            x={(g.psa.x + g.pap.x) / 2 + 6}
            y={(g.psa.y + g.pap.y) / 2 + 14}
            fontSize={10}
            fill={purple}
          >
            {twoLS.psaToPap}&quot;
          </text>
        </>
      )}

      {/* 2LS: pin-to-COG arc (line 3) */}
      {system === "2ls" && (
        <>
          <line
            x1={g.pin.x}
            y1={g.pin.y}
            x2={g.grip.x}
            y2={g.grip.y}
            stroke={green}
            strokeWidth={1.5}
            strokeDasharray="5 3"
          />
          <text
            x={(g.pin.x + g.grip.x) / 2 - 26}
            y={(g.pin.y + g.grip.y) / 2 - 6}
            fontSize={10}
            fill={green}
          >
            {twoLS.pinToCog}&quot;
          </text>
        </>
      )}

      {/* VAL angle label at the PAP — dual angle only */}
      {system === "dual" && (
        <text x={g.pap.x - 34} y={g.pap.y - 12} fontSize={10} fill={gold}>
          {layout.valAngle}°
        </text>
      )}

      {/* pin — label flips above the dot when it sits close to the grip */}
      <circle cx={g.pin.x} cy={g.pin.y} r={5} fill={red} />
      <text
        x={pinNearGrip ? g.pin.x - 10 : g.pin.x - 26}
        y={pinNearGrip ? g.pin.y - 10 : g.pin.y + 4}
        fontSize={11}
        fill={red}
      >
        pin
      </text>

      {/* PAP */}
      <circle cx={g.pap.x} cy={g.pap.y} r={5} fill={blue} />
      <text x={g.pap.x + 9} y={g.pap.y + 4} fontSize={11} fill={blue}>
        PAP
      </text>
    </svg>
  );
}
