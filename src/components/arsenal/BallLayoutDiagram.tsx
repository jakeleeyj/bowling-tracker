"use client";

import {
  computeLayoutGeometry,
  projectToSphere,
  BALL_RADIUS_PX,
  INCH_PX,
  type PapPosition,
  type Handedness,
  type Point,
} from "@/lib/layoutGeometry";
import {
  dualAngleToVLS,
  dualAngleTo2LS,
  lightningArc,
  type DualAngleLayout,
} from "@/lib/layoutEngine";

const SIZE = BALL_RADIUS_PX * 2;
const PAD = 24;
const CENTER: Point = { x: BALL_RADIUS_PX, y: BALL_RADIUS_PX };

// All flat construction shapes are sampled and pushed through the sphere
// projection, so lines and arcs curve near the edge like on a real ball.
function toPath(samples: Point[]): string {
  return samples
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
}

function segment(a: Point, b: Point, n = 24): Point[] {
  return Array.from({ length: n + 1 }, (_, i) => ({
    x: a.x + ((b.x - a.x) * i) / n,
    y: a.y + ((b.y - a.y) * i) / n,
  }));
}

function arcSamples(
  c: Point,
  r: number,
  from: number,
  to: number,
  n = 32,
): Point[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = from + ((to - from) * i) / n;
    return { x: c.x + r * Math.cos(t), y: c.y + r * Math.sin(t) };
  });
}

function compassArc(c: Point, r: number, toward: Point, spread = 28): Point[] {
  const theta = Math.atan2(toward.y - c.y, toward.x - c.x);
  const s = (spread * Math.PI) / 180;
  return arcSamples(c, r, theta - s, theta + s);
}

function angleArc(vertex: Point, a: Point, b: Point, r = 26): Point[] {
  let ta = Math.atan2(a.y - vertex.y, a.x - vertex.x);
  let tb = Math.atan2(b.y - vertex.y, b.x - vertex.x);
  let diff = tb - ta;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  if (diff < 0) {
    [ta, tb] = [tb, ta];
    diff = -diff;
  }
  return arcSamples(vertex, r, ta, ta + diff, 16);
}

// Holes shrink toward the horizon like on a photographed ball.
function holeRadius(flat: Point, r: number): number {
  const d = Math.hypot(flat.x - CENTER.x, flat.y - CENTER.y);
  const arc = Math.min(
    ((d / INCH_PX) * (360 / 26.785) * Math.PI) / 180,
    Math.PI / 2,
  );
  return r * (0.35 + 0.65 * Math.cos(arc));
}

export type DiagramSystem = "dual" | "vls" | "2ls";

export default function BallLayoutDiagram({
  layout,
  system = "dual",
  pap,
  hand = "right",
  showThumb = true,
  span,
}: {
  layout: DualAngleLayout;
  system?: DiagramSystem;
  pap?: PapPosition;
  hand?: Handedness;
  showThumb?: boolean;
  span?: number;
}) {
  const g = computeLayoutGeometry(layout, pap, hand, !showThumb, span);
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

  const P = projectToSphere;
  const pin = P(g.pin);
  const pap2 = P(g.pap);
  const psa = P(g.psa);
  const grip = P(g.grip);
  const thumb = P(g.thumb);
  const fingers = g.fingers.map((f) => ({ flat: f, proj: P(f) }));
  const midlineTick: Point = { x: g.pap.x, y: g.grip.y };
  const tick = P(midlineTick);
  const pinNearGrip = Math.hypot(pin.x - grip.x, pin.y - grip.y) < 45;
  const mid = (a: Point, b: Point): Point => ({
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  });

  const reach = 7 * INCH_PX;

  return (
    <svg
      viewBox={`${-PAD} ${-PAD} ${SIZE + PAD * 2} ${SIZE + PAD * 2}`}
      className="mx-auto w-full max-w-[300px]"
      role="img"
      aria-label={`Layout diagram: ${layout.drillingAngle}° drilling angle, ${layout.pinToPap} inch pin to PAP, ${layout.valAngle}° VAL angle`}
    >
      <defs>
        <radialGradient id="ball-shade" cx="38%" cy="30%" r="75%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.16)" />
          <stop offset="45%" stopColor="rgba(255,255,255,0.03)" />
          <stop offset="85%" stopColor="rgba(0,0,0,0.18)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.38)" />
        </radialGradient>
      </defs>

      {/* ball */}
      <circle
        cx={CENTER.x}
        cy={CENTER.y}
        r={BALL_RADIUS_PX}
        fill={surface}
        stroke="var(--color-border-light)"
        strokeWidth={2}
      />
      <circle
        cx={CENTER.x}
        cy={CENTER.y}
        r={BALL_RADIUS_PX}
        fill="url(#ball-shade)"
      />

      {/* midline through the bridge reference */}
      <path
        d={toPath(
          segment(
            { x: CENTER.x - reach, y: g.grip.y },
            { x: CENTER.x + reach, y: g.grip.y },
            40,
          ).map(P),
        )}
        fill="none"
        stroke={muted}
        strokeWidth={1}
        strokeDasharray="4 4"
      />

      {/* VAL — used by Dual Angle and VLS; 2LS is a distance-only system */}
      {system !== "2ls" && (
        <>
          <path
            d={toPath(
              segment(
                { x: g.pap.x, y: CENTER.y - reach },
                { x: g.pap.x, y: CENTER.y + reach },
                40,
              ).map(P),
            )}
            fill="none"
            stroke={gold}
            strokeWidth={1.5}
            strokeDasharray="6 4"
          />
          <text
            x={P({ x: g.pap.x, y: CENTER.y - reach }).x + 6}
            y={Math.max(P({ x: g.pap.x, y: CENTER.y - reach }).y, 12) + 14}
            fontSize={11}
            fill={gold}
          >
            VAL
          </text>
        </>
      )}

      {/* grip holes */}
      {fingers.map((f, i) => (
        <circle
          key={i}
          cx={f.proj.x}
          cy={f.proj.y}
          r={holeRadius(f.flat, 9)}
          fill="none"
          stroke={muted}
          strokeWidth={1.5}
        />
      ))}
      {showThumb && (
        <circle
          cx={thumb.x}
          cy={thumb.y}
          r={holeRadius(g.thumb, 12)}
          fill="none"
          stroke={muted}
          strokeWidth={1.5}
        />
      )}
      <circle cx={grip.x} cy={grip.y} r={2.5} fill={muted} />
      <text x={grip.x - 14} y={grip.y + 16} fontSize={10} fill={muted}>
        {showThumb ? "grip" : "bridge"}
      </text>

      {/* pin-to-PAP line — line 1 in every system */}
      <path
        d={toPath(segment(g.pap, g.pin).map(P))}
        fill="none"
        stroke={blue}
        strokeWidth={2}
      />
      <text
        x={mid(pap2, pin).x + 8}
        y={mid(pap2, pin).y}
        fontSize={11}
        fill={blue}
      >
        {layout.pinToPap}&quot;
      </text>

      {/* VLS construction: pin-to-PAP and PSA-to-PAP arcs cross at the PAP;
          the buffer arc circles the pin and the VAL is drawn tangent to it. */}
      {system === "vls" && (
        <>
          <g opacity={0.6} fill="none">
            <path
              d={toPath(
                compassArc(g.pin, layout.pinToPap * INCH_PX, g.pap).map(P),
              )}
              stroke={blue}
              strokeWidth={1}
              strokeDasharray="3 4"
            />
            <path
              d={toPath(
                compassArc(g.psa, twoLS.psaToPap * INCH_PX, g.pap).map(P),
              )}
              stroke={purple}
              strokeWidth={1}
              strokeDasharray="3 4"
            />
            <path
              d={toPath(
                arcSamples(
                  g.pin,
                  Math.abs(vls.pinBuffer) * INCH_PX,
                  0,
                  Math.PI * 2,
                  48,
                ).map(P),
              )}
              stroke={gold}
              strokeWidth={1}
              strokeDasharray="3 4"
            />
          </g>
          <path
            d={toPath(
              segment(
                { x: g.pin.x, y: g.pin.y },
                { x: g.pap.x, y: g.pin.y },
              ).map(P),
            )}
            fill="none"
            stroke={gold}
            strokeWidth={1.5}
            strokeDasharray="2 3"
          />
          <text
            x={mid(pin, P({ x: g.pap.x, y: g.pin.y })).x - 8}
            y={pin.y - 8}
            fontSize={10}
            fill={gold}
          >
            {vls.pinBuffer}&quot;
          </text>
        </>
      )}

      {/* pin→PSA baseline — dual angle's construction line only */}
      {system === "dual" && (
        <path
          d={toPath(segment(g.pin, g.psa).map(P))}
          fill="none"
          stroke={purple}
          strokeWidth={1.5}
          strokeDasharray="3 3"
        />
      )}
      {/* CG — on the pin→PSA baseline */}
      <circle
        cx={P(g.cg).x}
        cy={P(g.cg).y}
        r={3}
        fill="none"
        stroke={muted}
        strokeWidth={1.5}
      />
      <text x={P(g.cg).x + 6} y={P(g.cg).y + 4} fontSize={10} fill={muted}>
        CG
      </text>
      <circle cx={psa.x} cy={psa.y} r={4} fill={purple} />
      <text x={psa.x + 7} y={psa.y + 4} fontSize={11} fill={purple}>
        PSA
      </text>
      {system === "dual" && (
        <>
          <path
            d={toPath(angleArc(g.pin, g.psa, g.pap).map(P))}
            fill="none"
            stroke={purple}
            strokeWidth={1.5}
          />
          <text
            x={mid(pin, psa).x + 8}
            y={mid(pin, psa).y - 6}
            fontSize={10}
            fill={purple}
          >
            {layout.drillingAngle}°
          </text>
        </>
      )}

      {/* PSA-to-PAP arc — part of both the VLS and 2LS specs */}
      {system !== "dual" && (
        <>
          <path
            d={toPath(segment(g.psa, g.pap).map(P))}
            fill="none"
            stroke={purple}
            strokeWidth={1.5}
          />
          <text
            x={mid(psa, pap2).x + 6}
            y={mid(psa, pap2).y + 14}
            fontSize={10}
            fill={purple}
          >
            {twoLS.psaToPap}&quot;
          </text>
        </>
      )}

      {/* Dual Angle & VLS: locate the grip from the PAP — vertical PAP
          component down the VAL, then back along the midline to the bridge. */}
      {system !== "2ls" && (
        <>
          {papForCog.up !== 0 && (
            <>
              <path
                d={toPath(segment(g.pap, midlineTick).map(P))}
                fill="none"
                stroke={gold}
                strokeWidth={1}
                strokeDasharray="2 3"
              />
              <text
                x={mid(pap2, tick).x + 5}
                y={mid(pap2, tick).y + 3}
                fontSize={10}
                fill={gold}
              >
                {Math.abs(papForCog.up)}&quot; {papForCog.up < 0 ? "↓" : "↑"}
              </text>
            </>
          )}
          <path
            d={toPath(segment(midlineTick, g.grip).map(P))}
            fill="none"
            stroke={gold}
            strokeWidth={1}
            strokeDasharray="2 3"
          />
          <text
            x={mid(tick, grip).x - 10}
            y={grip.y + 14}
            fontSize={10}
            fill={gold}
          >
            {papForCog.over}&quot; {hand === "left" ? "→" : "←"}
          </text>
        </>
      )}

      {/* 2LS construction: compass swipes crossing at the PAP and at the
          bridge center, plus the PAP location guides. */}
      {system === "2ls" && (
        <>
          <g opacity={0.6} fill="none">
            <path
              d={toPath(
                compassArc(g.pin, twoLS.pinToPap * INCH_PX, g.pap).map(P),
              )}
              stroke={blue}
              strokeWidth={1}
              strokeDasharray="3 4"
            />
            <path
              d={toPath(
                compassArc(g.psa, twoLS.psaToPap * INCH_PX, g.pap).map(P),
              )}
              stroke={purple}
              strokeWidth={1}
              strokeDasharray="3 4"
            />
            <path
              d={toPath(
                compassArc(g.pin, twoLS.pinToCog * INCH_PX, g.grip).map(P),
              )}
              stroke={green}
              strokeWidth={1}
              strokeDasharray="3 4"
            />
            <path
              d={toPath(
                compassArc(
                  g.pap,
                  lightningArc(papForCog) * INCH_PX,
                  g.grip,
                ).map(P),
              )}
              stroke={gold}
              strokeWidth={1}
              strokeDasharray="3 4"
            />
          </g>
          <path
            d={toPath(segment(g.grip, midlineTick).map(P))}
            fill="none"
            stroke={gold}
            strokeWidth={1}
            strokeDasharray="2 3"
          />
          <path
            d={toPath(segment(midlineTick, g.pap).map(P))}
            fill="none"
            stroke={gold}
            strokeWidth={1}
            strokeDasharray="2 3"
          />
          <text
            x={mid(grip, tick).x - 10}
            y={grip.y - 6}
            fontSize={10}
            fill={gold}
          >
            {papForCog.over}&quot; {hand === "left" ? "←" : "→"}
          </text>
          {papForCog.up !== 0 && (
            <text
              x={mid(tick, pap2).x + 5}
              y={mid(tick, pap2).y + 3}
              fontSize={10}
              fill={gold}
            >
              {Math.abs(papForCog.up)}&quot; {papForCog.up < 0 ? "↓" : "↑"}
            </text>
          )}
          <path
            d={toPath(segment(g.pin, g.grip).map(P))}
            fill="none"
            stroke={green}
            strokeWidth={1.5}
            strokeDasharray="5 3"
          />
          <text
            x={mid(pin, grip).x - 26}
            y={mid(pin, grip).y - 6}
            fontSize={10}
            fill={green}
          >
            {twoLS.pinToCog}&quot;
          </text>
        </>
      )}

      {/* VAL angle at the PAP — dual angle only */}
      {system === "dual" && (
        <>
          <path
            d={toPath(
              angleArc(g.pap, g.pin, { x: g.pap.x, y: g.pap.y - 40 }).map(P),
            )}
            fill="none"
            stroke={gold}
            strokeWidth={1.5}
          />
          <text x={pap2.x - 34} y={pap2.y - 12} fontSize={10} fill={gold}>
            {layout.valAngle}°
          </text>
        </>
      )}

      {/* pin — label flips above the dot when it sits close to the grip */}
      <circle cx={pin.x} cy={pin.y} r={5} fill={red} />
      <text
        x={pinNearGrip ? pin.x - 10 : pin.x - 26}
        y={pinNearGrip ? pin.y - 10 : pin.y + 4}
        fontSize={11}
        fill={red}
      >
        pin
      </text>

      {/* PAP */}
      <circle cx={pap2.x} cy={pap2.y} r={5} fill={blue} />
      <text x={pap2.x + 9} y={pap2.y + 4} fontSize={11} fill={blue}>
        PAP
      </text>
    </svg>
  );
}
