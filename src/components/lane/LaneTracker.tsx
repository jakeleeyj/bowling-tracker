"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, RefreshCw, Upload } from "lucide-react";
import { useLaneCamera } from "@/hooks/useLaneCamera";
import CalibrationOverlay from "@/components/lane/CalibrationOverlay";
import PathOverlay from "@/components/lane/PathOverlay";
import ReplayPlayer from "@/components/lane/ReplayPlayer";
import ShotResult from "@/components/lane/ShotResult";
import {
  computeHomography,
  pixelToLane,
  type Calibration,
  type Pt,
} from "@/lib/lane/geometry";
import { BallDetector, toGrayscale } from "@/lib/lane/ballDetector";
import { medianPlate, suggestLaneEdges } from "@/lib/lane/edgeDetect";
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
  const [calibrationAttempt, setCalibrationAttempt] = useState(0);
  const [frameReady, setFrameReady] = useState(false);
  const [replayBlob, setReplayBlob] = useState<Blob | null>(null);
  // File mode: temporarily hide the result to watch the rest of the video
  const [watching, setWatching] = useState(false);
  const frameSizeRef = useRef({ w: 0, h: 0 });
  const [detecting, setDetecting] = useState(false);
  const [detectMsg, setDetectMsg] = useState<string | null>(null);

  const homographyRef = useRef<number[] | null>(null);
  const detectorRef = useRef<BallDetector | null>(null);
  const sessionRef = useRef(new ShotSession());
  const pixelPathRef = useRef<Pt[]>([]);
  const phaseRef = useRef(phase);
  const getReplayBlobRef = useRef<() => Blob | null>(() => null);
  const laneQuadRef = useRef<Pt[] | null>(null);
  const [lastCalPoints, setLastCalPoints] = useState<Pt[] | undefined>(
    undefined,
  );

  const changePhase = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const resetTracking = useCallback(() => {
    sessionRef.current = new ShotSession();
    // Recreate the detector: its background model re-seeds from the next
    // frame, so re-running a video (or re-calibrating) starts clean.
    detectorRef.current = null;
    pixelPathRef.current = [];
    setLivePath([]);
  }, []);

  const onFrame = useCallback(
    (gray: Uint8ClampedArray, tMs: number, w: number, h: number) => {
      if (
        !detectorRef.current ||
        frameSizeRef.current.w !== w ||
        frameSizeRef.current.h !== h
      ) {
        frameSizeRef.current = { w, h };
        detectorRef.current = new BallDetector(w, h);
        if (laneQuadRef.current) {
          detectorRef.current.setLaneMask(laneQuadRef.current);
        }
        setFrameSize({ w, h });
        setFrameReady(true);
      }
      const hit = detectorRef.current.detect(gray);
      if (phaseRef.current !== "live" || !homographyRef.current) return;

      const lane = hit ? pixelToLane(homographyRef.current, hit) : null;
      const event = sessionRef.current.onFrame(lane, tMs, hit?.trackId);

      if (event.type === "tracking") {
        if (hit) pixelPathRef.current.push({ x: hit.x, y: hit.y });
        setLivePath([...pixelPathRef.current]);
      } else if (event.type === "complete") {
        // File mode: keep the video playing so the pin hit stays visible;
        // the result renders on top.
        setResult(event.stats);
        setResultPath([...pixelPathRef.current]);
        setReplayBlob(getReplayBlobRef.current());
        pixelPathRef.current = [];
        setLivePath([]);
        changePhase("result");
      } else if (event.type === "discarded") {
        pixelPathRef.current = [];
        setLivePath([]);
      }
    },
    [changePhase],
  );

  const {
    videoRef,
    status,
    start,
    startFile,
    playFile,
    restartFile,
    isFileMode,
    fileEnded,
    stop,
    getReplayBlob,
    debug,
  } = useLaneCamera(onFrame);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    getReplayBlobRef.current = getReplayBlob;
  }, [getReplayBlob]);

  async function begin() {
    const ok = await start();
    if (ok) changePhase("calibrate");
  }

  async function beginFile(file: File) {
    stop(); // clear any camera stream or previously loaded video
    setResult(null);
    setReplayBlob(null);
    setWatching(false);
    resetTracking();
    const ok = await startFile(file);
    if (ok) changePhase("calibrate");
  }

  // BETA: sample frames across the video, median them into a clean plate
  // (the bowler and ball vanish), and look for the dark gutter lines. Any
  // confidently found corner pre-places its handle; the rest stay put.
  async function autoDetectCorners() {
    const video = videoRef.current;
    if (!video || !isFileMode() || detecting) return;
    setDetecting(true);
    setDetectMsg(null);
    try {
      video.pause();
      const t0 = video.currentTime;
      const w = frameSizeRef.current.w || 320;
      const h = frameSizeRef.current.h || 240;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw new Error("canvas 2d unavailable");

      const frames: Uint8ClampedArray[] = [];
      const dur = video.duration || 5;
      for (let i = 0; i < 7; i++) {
        await new Promise<void>((resolve) => {
          const onSeek = () => {
            video.removeEventListener("seeked", onSeek);
            resolve();
          };
          video.addEventListener("seeked", onSeek);
          video.currentTime = (dur * (i + 0.5)) / 7;
          setTimeout(() => {
            video.removeEventListener("seeked", onSeek);
            resolve();
          }, 1500);
        });
        ctx.drawImage(video, 0, 0, w, h);
        const img = ctx.getImageData(0, 0, w, h);
        frames.push(toGrayscale(img.data, w, h));
      }
      video.currentTime = t0;

      const plate = medianPlate(frames, w * h);
      const s = suggestLaneEdges(plate, w, h);
      const found = [s.foulLeft, s.foulRight, s.deckLeft, s.deckRight].filter(
        Boolean,
      ).length;
      if (found === 0) {
        setDetectMsg("No lane edges found — drag the corners manually");
      } else {
        const base = lastCalPoints ?? [
          { x: w * 0.15, y: h * 0.88 },
          { x: w * 0.85, y: h * 0.88 },
          { x: w * 0.38, y: h * 0.18 },
          { x: w * 0.62, y: h * 0.18 },
        ];
        setLastCalPoints([
          s.foulLeft ?? base[0],
          s.foulRight ?? base[1],
          s.deckLeft ?? base[2],
          s.deckRight ?? base[3],
        ]);
        setCalibrationAttempt((n) => n + 1); // remount overlay with new spots
        setDetectMsg(
          found === 4
            ? "Found all 4 corners — check and adjust"
            : `Found ${found}/4 corners — drag the rest into place`,
        );
      }
    } catch {
      setDetectMsg("Detection failed — drag the corners manually");
    }
    setDetecting(false);
  }

  function handleCalibrated(cal: Calibration) {
    try {
      homographyRef.current = computeHomography(cal);
      setLastCalPoints([
        cal.foulLeft,
        cal.foulRight,
        cal.deckLeft,
        cal.deckRight,
      ]);
      // Winding order for the mask polygon: foul L → foul R → deck R → deck L
      laneQuadRef.current = [
        cal.foulLeft,
        cal.foulRight,
        cal.deckRight,
        cal.deckLeft,
      ];
      detectorRef.current?.setLaneMask(laneQuadRef.current);
      setCalibrationError(false);
      resetTracking();
      changePhase("live");
      restartFile(); // file mode: re-run from the start; no-op for camera
    } catch {
      homographyRef.current = null;
      setCalibrationError(true);
      setCalibrationAttempt((n) => n + 1);
      changePhase("calibrate");
    }
  }

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) beginFile(file);
          e.target.value = "";
        }}
      />
      {phase === "start" && (
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
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 rounded-xl border border-border px-6 py-2.5 text-sm font-semibold text-text-secondary active:scale-[0.97]"
          >
            <Upload size={15} /> Upload a video
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
      )}
      <div
        className={
          phase === "start" ? "hidden" : "relative mx-auto w-fit max-w-full"
        }
      >
        <video
          ref={videoRef}
          playsInline
          muted
          className="max-h-[62dvh] w-auto max-w-full"
          aria-label="Live lane camera"
        />
        {phase === "calibrate" && (
          <>
            {frameReady ? (
              <CalibrationOverlay
                key={calibrationAttempt}
                width={frameSize.w}
                height={frameSize.h}
                onDone={handleCalibrated}
                initial={lastCalPoints}
              />
            ) : (
              <div className="absolute inset-x-3 top-3 rounded-xl bg-black/50 px-3 py-2 text-center text-xs font-semibold text-white">
                Starting camera…
                {/* TEMP debug */}
                <div className="mt-1 font-normal text-white/70">
                  status: {status} · frames: {debug.frames} · lastError:{" "}
                  {debug.lastError ?? "none"}
                </div>
              </div>
            )}
            {calibrationError && (
              <div className="absolute inset-x-3 top-3 rounded-xl bg-red-500/80 px-3 py-2 text-center text-xs font-semibold text-white">
                Those points don&apos;t form a valid lane. Try again.
              </div>
            )}
            {isFileMode() && frameReady && (
              <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-1.5">
                {detectMsg && (
                  <div className="rounded-lg bg-black/70 px-2.5 py-1 text-center text-[10px] font-semibold text-white">
                    {detectMsg}
                  </div>
                )}
                <button
                  onClick={autoDetectCorners}
                  disabled={detecting}
                  className="whitespace-nowrap rounded-full bg-black/70 px-4 py-2 text-xs font-bold text-white active:scale-95 disabled:opacity-60"
                >
                  {detecting ? "Detecting…" : "✨ Auto-detect (beta)"}
                </button>
              </div>
            )}
          </>
        )}
        {phase === "live" && (
          <>
            <PathOverlay
              points={livePath}
              width={frameSize.w}
              height={frameSize.h}
            />
            <div className="absolute left-3 top-3 rounded-full bg-black/50 px-3 py-1 text-xs font-semibold text-white">
              {isFileMode() ? "Tracking video…" : "Tracking — bowl when ready"}
            </div>
            {fileEnded && (
              <div className="absolute inset-x-3 bottom-3 flex flex-col gap-2 rounded-xl bg-black/70 px-3 py-2.5">
                <span className="text-xs font-semibold text-white">
                  Video ended — no shot detected
                </span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => {
                      resetTracking();
                      restartFile();
                    }}
                    className="flex-1 rounded-lg bg-blue px-3 py-1.5 text-xs font-bold text-white active:scale-95"
                  >
                    Re-run
                  </button>
                  <button
                    onClick={() => {
                      resetTracking();
                      changePhase("calibrate");
                    }}
                    className="flex-1 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-white active:scale-95"
                  >
                    Corners
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-white active:scale-95"
                  >
                    New video
                  </button>
                </div>
              </div>
            )}
            <button
              onClick={() => {
                resetTracking();
                changePhase("calibrate");
              }}
              aria-label="Re-calibrate"
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white"
            >
              <RefreshCw size={16} />
            </button>
          </>
        )}
        {phase === "result" && result && (
          <>
            {replayBlob && !watching && <ReplayPlayer blob={replayBlob} />}
            <PathOverlay
              points={resultPath}
              width={frameSize.w}
              height={frameSize.h}
            />
            {watching ? (
              <button
                onClick={() => setWatching(false)}
                className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-black/70 px-4 py-2 text-xs font-bold text-white active:scale-95"
              >
                Back to result
              </button>
            ) : (
              <>
                {isFileMode() && (
                  <div className="absolute inset-x-2 top-2 flex justify-center gap-1.5">
                    <button
                      onClick={() => {
                        setWatching(true);
                        restartFile(); // rewatch the clip, no re-tracking
                      }}
                      className="whitespace-nowrap rounded-full bg-black/70 px-3 py-1.5 text-[11px] font-bold text-white active:scale-95"
                    >
                      ▶ Watch
                    </button>
                    <button
                      onClick={() => {
                        setResult(null);
                        setReplayBlob(null);
                        resetTracking();
                        changePhase("live");
                        restartFile();
                      }}
                      className="whitespace-nowrap rounded-full bg-black/70 px-3 py-1.5 text-[11px] font-bold text-white active:scale-95"
                    >
                      Re-run
                    </button>
                    <button
                      onClick={() => {
                        setResult(null);
                        setReplayBlob(null);
                        resetTracking();
                        changePhase("calibrate");
                      }}
                      className="whitespace-nowrap rounded-full bg-black/70 px-3 py-1.5 text-[11px] font-bold text-white active:scale-95"
                    >
                      Corners
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="whitespace-nowrap rounded-full bg-black/70 px-3 py-1.5 text-[11px] font-bold text-white active:scale-95"
                    >
                      New video
                    </button>
                  </div>
                )}
                <ShotResult
                  stats={result}
                  onNext={() => {
                    setResult(null);
                    setReplayBlob(null);
                    resetTracking();
                    changePhase("live");
                    playFile(); // file mode: resume for the next shot in the video
                  }}
                />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
