"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import {
  computeLayoutGeometry,
  BALL_RADIUS_PX,
  INCH_PX,
  type PapPosition,
  type Handedness,
  type Point,
} from "@/lib/layoutGeometry";
import {
  dualAngleTo2LS,
  dualAngleToVLS,
  lightningArc,
  type DualAngleLayout,
} from "@/lib/layoutEngine";
import type { DiagramSystem } from "@/components/arsenal/BallLayoutDiagram";

// WebGL colors can't read CSS variables — these mirror the globals.css tokens.
const COLORS = {
  blue: 0x3b82f6,
  purple: 0x8b5cf6,
  gold: 0xf59e0b,
  green: 0x22c55e,
  red: 0xef4444,
  muted: 0x64748b,
  ball: 0x25324a,
};

const CENTER: Point = { x: BALL_RADIUS_PX, y: BALL_RADIUS_PX };
const DEG_PER_INCH = 360 / 26.785;

// Flat layout coordinates encode surface-arc offsets from the ball-face
// center; lift them onto the unit sphere (front pole faces the camera).
function toSphere(p: Point, lift = 1.004): THREE.Vector3 {
  const dx = p.x - CENTER.x;
  const dy = p.y - CENTER.y;
  const flat = Math.hypot(dx, dy);
  const arc = Math.min(
    ((flat / INCH_PX) * DEG_PER_INCH * Math.PI) / 180,
    Math.PI * 0.98,
  );
  if (flat === 0) return new THREE.Vector3(0, 0, lift);
  const ux = dx / flat;
  const uy = dy / flat;
  return new THREE.Vector3(
    Math.sin(arc) * ux * lift,
    -Math.sin(arc) * uy * lift,
    Math.cos(arc) * lift,
  );
}

function segment(a: Point, b: Point, n = 32): Point[] {
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
  n = 48,
): Point[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = from + ((to - from) * i) / n;
    return { x: c.x + r * Math.cos(t), y: c.y + r * Math.sin(t) };
  });
}

function compassArc(c: Point, r: number, toward: Point, spread = 28): Point[] {
  const theta = Math.atan2(toward.y - c.y, toward.x - c.x);
  const s = (spread * Math.PI) / 180;
  return arcSamples(c, r, theta - s, theta + s, 24);
}

function line(points: Point[], color: number, dashed = false): THREE.Line {
  const geometry = new THREE.BufferGeometry().setFromPoints(
    points.map((p) => toSphere(p)),
  );
  const material = dashed
    ? new THREE.LineDashedMaterial({ color, dashSize: 0.045, gapSize: 0.035 })
    : new THREE.LineBasicMaterial({ color });
  const l = new THREE.Line(geometry, material);
  if (dashed) l.computeLineDistances();
  return l;
}

function dot(p: Point, color: number, size = 0.035): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(size, 12, 12),
    new THREE.MeshBasicMaterial({ color }),
  );
  mesh.position.copy(toSphere(p, 1.005));
  return mesh;
}

// Billboard text label from a canvas texture
function makeLabel(text: string, color: string): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.font = "bold 40px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.9)";
  ctx.shadowBlur = 8;
  ctx.fillStyle = color;
  ctx.fillText(text, 128, 32);
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, depthTest: false }),
  );
  sprite.scale.set(0.5, 0.125, 1);
  return sprite;
}

function labelAt(p: Point, text: string, color: string): THREE.Sprite {
  const sprite = makeLabel(text, color);
  sprite.position.copy(toSphere(p, 1.09));
  return sprite;
}

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function hole(p: Point, radiusInches: number): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.CircleGeometry(radiusInches / 4.295, 24),
    new THREE.MeshBasicMaterial({ color: 0x0a0e1a, side: THREE.DoubleSide }),
  );
  const pos = toSphere(p, 1.002);
  mesh.position.copy(pos);
  mesh.lookAt(pos.clone().multiplyScalar(2));
  return mesh;
}

export default function Ball3D({
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
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const g = computeLayoutGeometry(layout, pap, hand, !showThumb, span);
    const papForCog = pap ?? { over: 4.5, up: 0 };
    const twoLS = dualAngleTo2LS(layout, papForCog);
    const vls = dualAngleToVLS(layout);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 10);
    camera.position.set(0, 0, 4.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(-2, 3, 4);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x93b4ff, 0.5);
    rim.position.set(3, -2, -2);
    scene.add(rim);

    const group = new THREE.Group();
    scene.add(group);

    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(1, 64, 64),
      new THREE.MeshStandardMaterial({
        color: COLORS.ball,
        roughness: 0.32,
        metalness: 0.1,
      }),
    );
    group.add(ball);

    const reach = 7 * INCH_PX;

    // midline
    group.add(
      line(
        segment(
          { x: CENTER.x - reach, y: g.grip.y },
          { x: CENTER.x + reach, y: g.grip.y },
          48,
        ),
        COLORS.muted,
        true,
      ),
    );

    // VAL (not part of 2LS)
    if (system !== "2ls") {
      group.add(
        line(
          segment(
            { x: g.pap.x, y: CENTER.y - reach },
            { x: g.pap.x, y: CENTER.y + reach },
            48,
          ),
          COLORS.gold,
          true,
        ),
      );
    }

    // pin-to-PAP
    group.add(line(segment(g.pap, g.pin), COLORS.blue));
    // pin-to-PSA
    group.add(line(segment(g.pin, g.psa), COLORS.purple, true));

    if (system !== "dual") {
      group.add(line(segment(g.psa, g.pap), COLORS.purple));
    }

    if (system === "vls") {
      group.add(
        line(
          compassArc(g.pin, layout.pinToPap * INCH_PX, g.pap),
          COLORS.blue,
          true,
        ),
        line(
          compassArc(g.psa, twoLS.psaToPap * INCH_PX, g.pap),
          COLORS.purple,
          true,
        ),
        line(
          arcSamples(
            g.pin,
            Math.abs(vls.pinBuffer) * INCH_PX,
            0,
            Math.PI * 2,
            64,
          ),
          COLORS.gold,
          true,
        ),
      );
    }

    if (system === "2ls") {
      group.add(
        line(
          compassArc(g.pin, twoLS.pinToPap * INCH_PX, g.pap),
          COLORS.blue,
          true,
        ),
        line(
          compassArc(g.psa, twoLS.psaToPap * INCH_PX, g.pap),
          COLORS.purple,
          true,
        ),
        line(
          compassArc(g.pin, twoLS.pinToCog * INCH_PX, g.grip),
          COLORS.green,
          true,
        ),
        line(
          compassArc(g.pap, lightningArc(papForCog) * INCH_PX, g.grip),
          COLORS.gold,
          true,
        ),
        line(segment(g.pin, g.grip), COLORS.green, true),
      );
    }

    // PAP locator guides
    const tick: Point = { x: g.pap.x, y: g.grip.y };
    group.add(
      line(segment(g.grip, tick), COLORS.gold, true),
      line(segment(tick, g.pap), COLORS.gold, true),
    );

    // holes (real proportions: fingers ~7/8" dia, thumb ~1 1/8")
    group.add(hole(g.fingers[0], 0.44), hole(g.fingers[1], 0.44));
    if (showThumb) group.add(hole(g.thumb, 0.56));

    // measurement labels
    const HEX = {
      blue: "#60a5fa",
      purple: "#a78bfa",
      gold: "#fbbf24",
      green: "#4ade80",
    };
    group.add(labelAt(midpoint(g.pin, g.pap), `${layout.pinToPap}"`, HEX.blue));
    if (system === "dual") {
      group.add(
        labelAt(midpoint(g.pin, g.psa), `${layout.drillingAngle}°`, HEX.purple),
        labelAt(
          { x: g.pap.x - 20, y: g.pap.y - 24 },
          `${layout.valAngle}°`,
          HEX.gold,
        ),
      );
    }
    if (system !== "dual") {
      group.add(
        labelAt(midpoint(g.psa, g.pap), `${twoLS.psaToPap}"`, HEX.purple),
      );
    }
    if (system === "vls") {
      group.add(
        labelAt(
          midpoint(g.pin, { x: g.pap.x, y: g.pin.y }),
          `${vls.pinBuffer}"`,
          HEX.gold,
        ),
      );
    }
    if (system === "2ls") {
      group.add(
        labelAt(midpoint(g.pin, g.grip), `${twoLS.pinToCog}"`, HEX.green),
      );
    }
    if (papForCog.up !== 0) {
      group.add(
        labelAt(
          midpoint({ x: g.pap.x, y: g.grip.y }, g.pap),
          `${Math.abs(papForCog.up)}" ${papForCog.up < 0 ? "↓" : "↑"}`,
          HEX.gold,
        ),
      );
    }
    group.add(
      labelAt(
        midpoint(g.grip, { x: g.pap.x, y: g.grip.y }),
        `${papForCog.over}"`,
        HEX.gold,
      ),
    );

    // markers
    group.add(
      dot(g.pin, COLORS.red),
      dot(g.pap, COLORS.blue),
      dot(g.psa, COLORS.purple, 0.028),
      dot(g.grip, COLORS.muted, 0.02),
    );

    group.rotation.set(0.15, -0.25, 0);

    let width = 0;
    function resize() {
      if (!container) return;
      const w = container.clientWidth;
      if (w === width || w === 0) return;
      width = w;
      const h = w;
      renderer.setSize(w, h);
      camera.aspect = 1;
      camera.updateProjectionMatrix();
      render();
    }

    function render() {
      renderer.render(scene, camera);
    }

    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();

    // drag to rotate
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    function onDown(e: PointerEvent) {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      renderer.domElement.setPointerCapture(e.pointerId);
    }
    function onMove(e: PointerEvent) {
      if (!dragging) return;
      group.rotation.y += (e.clientX - lastX) * 0.008;
      group.rotation.x += (e.clientY - lastY) * 0.008;
      group.rotation.x = Math.max(-1.4, Math.min(1.4, group.rotation.x));
      lastX = e.clientX;
      lastY = e.clientY;
      render();
    }
    function onUp() {
      dragging = false;
    }
    const el = renderer.domElement;
    el.style.touchAction = "none";
    el.style.cursor = "grab";
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);

    return () => {
      observer.disconnect();
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      renderer.dispose();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Line) {
          obj.geometry.dispose();
          const m = obj.material as THREE.Material | THREE.Material[];
          (Array.isArray(m) ? m : [m]).forEach((mat) => mat.dispose());
        }
      });
      container.removeChild(el);
    };
  }, [layout, system, pap, hand, showThumb, span]);

  return (
    <div>
      <div ref={containerRef} className="mx-auto w-full max-w-[300px]" />
      <div className="mt-1 flex items-center justify-center gap-3 text-[10px] text-text-muted">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-red" /> pin
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-blue" /> PAP
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-purple" /> PSA
        </span>
        <span>· drag to rotate</span>
      </div>
    </div>
  );
}
