"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, RefreshCw } from "lucide-react";
import { useLaneCamera } from "@/hooks/useLaneCamera";
import CalibrationOverlay from "@/components/lane/CalibrationOverlay";
import PathOverlay from "@/components/lane/PathOverlay";
import ShotResult from "@/components/lane/ShotResult";
import {
  computeHomography,
  pixelToLane,
  type Calibration,
  type Pt,
} from "@/lib/lane/geometry";
import { BallDetector } from "@/lib/lane/ballDetector";
import { ShotSession } from "@/lib/lane/shotSession";
import type { ShotStats } from "@/lib/lane/shotStats";

type Phase = "start" | "calibrate" | "live" | "result";

export default function LaneTracker() {
  const [phase, setPhase] = useState<Phase>("start");
  const [frameSize, setFrameSize] = useState({ w: 320, h: 240 });
  const [livePath, setLivePath] = useState<Pt[]>([]);
  const [result, setResult] = useState<ShotStats | null>(null);
  const [resultPath, setResultPath] = useState<Pt[]>([]);
  const [calibrationError, setCalibrationError] = useState(false);

  const homographyRef = useRef<number[] | null>(null);
  const detectorRef = useRef<BallDetector | null>(null);
  const sessionRef = useRef(new ShotSession());
  const pixelPathRef = useRef<Pt[]>([]);
  const phaseRef = useRef(phase);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const onFrame = useCallback(
    (gray: Uint8ClampedArray, tMs: number, w: number, h: number) => {
      if (!detectorRef.current) {
        detectorRef.current = new BallDetector(w, h);
        setFrameSize({ w, h });
      }
      const hit = detectorRef.current.detect(gray);
      if (phaseRef.current !== "live" || !homographyRef.current) return;

      const lane = hit ? pixelToLane(homographyRef.current, hit) : null;
      if (hit && lane) pixelPathRef.current.push({ x: hit.x, y: hit.y });
      const event = sessionRef.current.onFrame(lane, tMs);

      if (event.type === "tracking") {
        setLivePath([...pixelPathRef.current]);
      } else if (event.type === "complete") {
        setResult(event.stats);
        setResultPath([...pixelPathRef.current]);
        pixelPathRef.current = [];
        setLivePath([]);
        setPhase("result");
      } else if (event.type === "discarded") {
        pixelPathRef.current = [];
        setLivePath([]);
      }
    },
    [],
  );

  const { videoRef, status, start } = useLaneCamera(onFrame);

  async function begin() {
    await start();
    setPhase("calibrate");
  }

  function handleCalibrated(cal: Calibration) {
    try {
      homographyRef.current = computeHomography(cal);
      setCalibrationError(false);
      setPhase("live");
    } catch {
      homographyRef.current = null;
      setCalibrationError(true);
      setPhase("calibrate");
    }
  }

  if (phase === "start") {
    return (
      <div className="glass flex flex-col items-center gap-4 p-6 text-center">
        <p className="text-sm text-text-muted">
          Put your phone on a tripod behind the approach, framing the whole
          lane from foul line to pins. Keep the screen on while tracking.
        </p>
        <button
          onClick={begin}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue to-blue-dark px-6 py-3 text-base font-bold text-white shadow-lg shadow-blue/25 active:scale-[0.97]"
        >
          <Camera size={18} /> Start camera
        </button>
        {status === "denied" && (
          <p className="text-xs text-red-400">
            Camera access was denied. Allow it in Settings → Safari → Camera,
            then try again.
          </p>
        )}
        {status === "error" && (
          <p className="text-xs text-red-400">
            Couldn&apos;t start the camera. Close other camera apps and retry.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <video
        ref={videoRef}
        playsInline
        muted
        className="w-full"
        aria-label="Live lane camera"
      />
      {phase === "calibrate" && (
        <>
          <CalibrationOverlay
            width={frameSize.w}
            height={frameSize.h}
            onDone={handleCalibrated}
          />
          {calibrationError && (
            <div className="absolute inset-x-3 top-3 rounded-xl bg-red-500/80 px-3 py-2 text-center text-xs font-semibold text-white">
              Those points don&apos;t form a valid lane. Try again.
            </div>
          )}
        </>
      )}
      {phase === "live" && (
        <>
          <PathOverlay points={livePath} width={frameSize.w} height={frameSize.h} />
          <div className="absolute left-3 top-3 rounded-full bg-black/50 px-3 py-1 text-xs font-semibold text-white">
            Tracking — bowl when ready
          </div>
          <button
            onClick={() => setPhase("calibrate")}
            aria-label="Re-calibrate"
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white"
          >
            <RefreshCw size={16} />
          </button>
        </>
      )}
      {phase === "result" && result && (
        <>
          <PathOverlay points={resultPath} width={frameSize.w} height={frameSize.h} />
          <ShotResult
            stats={result}
            onNext={() => {
              setResult(null);
              setPhase("live");
            }}
          />
        </>
      )}
    </div>
  );
}
