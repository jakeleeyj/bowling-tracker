"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toGrayscale } from "@/lib/lane/ballDetector";

const TARGET_WIDTH = 320;

type CameraStatus = "idle" | "starting" | "live" | "denied" | "error";

// Narrow type for WakeLockSentinel (guards against TS lib absence)
interface WakeLockSentinel {
  release(): Promise<void>;
}

export function useLaneCamera(
  onFrame: (gray: Uint8ClampedArray, tMs: number, w: number, h: number) => void,
) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef(0);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;
  const [status, setStatus] = useState<CameraStatus>("idle");

  const recorderRef = useRef<MediaRecorder | null>(null);
  const recorderChunksRef = useRef<{ blob: Blob; t: number }[]>([]);

  const stop = useCallback((skipStatus = false) => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    wakeLockRef.current?.release().catch(() => undefined);
    wakeLockRef.current = null;
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    recorderRef.current = null;
    recorderChunksRef.current = [];
    if (!skipStatus) setStatus("idle");
  }, []);

  const getReplayBlob = useCallback((): Blob | null => {
    const chunks = recorderChunksRef.current;
    if (chunks.length === 0) return null;
    const type = chunks[0].blob.type;
    return new Blob(chunks.map((c) => c.blob), { type });
  }, []);

  const start = useCallback(async () => {
    setStatus("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          frameRate: { ideal: 60 },
          width: { ideal: 1280 },
        },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new Error("video element not mounted");
      video.srcObject = stream;
      await video.play();

      if (video.videoWidth === 0) {
        await new Promise<void>((resolve) => {
          video.addEventListener("loadedmetadata", () => resolve(), { once: true });
        });
      }

      if (video.videoWidth === 0) {
        throw new Error("camera reported zero size");
      }

      if ("wakeLock" in navigator) {
        wakeLockRef.current = await navigator.wakeLock
          .request("screen")
          .catch(() => null);
      }

      const canvas = document.createElement("canvas");
      const scale = TARGET_WIDTH / video.videoWidth;
      canvas.width = TARGET_WIDTH;
      canvas.height = Math.round(video.videoHeight * scale);
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw new Error("canvas 2d unavailable");

      try {
        const mimeType = MediaRecorder.isTypeSupported("video/mp4")
          ? "video/mp4"
          : MediaRecorder.isTypeSupported("video/webm")
            ? "video/webm"
            : null;
        if (mimeType) {
          const recorder = new MediaRecorder(stream, { mimeType });
          recorderRef.current = recorder;
          recorderChunksRef.current = [];
          recorder.ondataavailable = (e) => {
            if (e.data.size === 0) return;
            recorderChunksRef.current.push({ blob: e.data, t: performance.now() });
            const cutoff = performance.now() - 8000;
            while (
              recorderChunksRef.current.length > 1 &&
              recorderChunksRef.current[0].t < cutoff
            ) {
              recorderChunksRef.current.shift();
            }
          };
          recorder.start(1000);
        }
      } catch {
        recorderRef.current = null;
        recorderChunksRef.current = [];
      }

      setStatus("live");
      const loop = () => {
        if (!streamRef.current) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        onFrameRef.current(
          toGrayscale(img.data, canvas.width, canvas.height),
          performance.now(),
          canvas.width,
          canvas.height,
        );
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } catch (e) {
      const denied = e instanceof DOMException && e.name === "NotAllowedError";
      stop(true);
      setStatus(denied ? "denied" : "error");
    }
  }, [stop]);

  useEffect(() => stop, [stop]);

  return { videoRef, status, start, stop, getReplayBlob };
}
