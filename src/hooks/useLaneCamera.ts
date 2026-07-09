"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toGrayscale } from "@/lib/lane/ballDetector";

const TARGET_WIDTH = 320;

type CameraStatus = "idle" | "starting" | "live" | "denied" | "error";
type SourceMode = "camera" | "file";

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
  const statusRef = useRef<CameraStatus>("idle");
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const frameCountRef = useRef(0);
  const lastErrorRef = useRef<string | null>(null);
  const [debug, setDebug] = useState<{
    frames: number;
    lastError: string | null;
  }>({
    frames: 0,
    lastError: null,
  });

  const modeRef = useRef<SourceMode>("camera");
  const objectUrlRef = useRef<string | null>(null);
  const [fileEnded, setFileEnded] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const mimeTypeRef = useRef<string | null>(null);
  const prevSegmentChunksRef = useRef<Blob[]>([]);
  const currentSegmentChunksRef = useRef<Blob[]>([]);
  const rotationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startSegment = useCallback(() => {
    const stream = streamRef.current;
    const mimeType = mimeTypeRef.current;
    if (!stream || !mimeType) return;
    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    recorderRef.current = recorder;
    currentSegmentChunksRef.current = chunks;
    recorder.start(1000);
  }, []);

  const stop = useCallback((skipStatus = false) => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    modeRef.current = "camera";
    setFileEnded(false);
    wakeLockRef.current?.release().catch(() => undefined);
    wakeLockRef.current = null;
    if (rotationTimerRef.current !== null) {
      clearInterval(rotationTimerRef.current);
      rotationTimerRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.onstop = null;
      recorderRef.current.stop();
    }
    recorderRef.current = null;
    mimeTypeRef.current = null;
    prevSegmentChunksRef.current = [];
    currentSegmentChunksRef.current = [];
    if (!skipStatus) setStatus("idle");
  }, []);

  const getReplayBlob = useCallback((): Blob | null => {
    const chunks = [
      ...prevSegmentChunksRef.current,
      ...currentSegmentChunksRef.current,
    ];
    if (chunks.length === 0) return null;
    const type = mimeTypeRef.current ?? chunks[0].type;
    return new Blob(chunks, { type });
  }, []);

  const start = useCallback(async (): Promise<boolean> => {
    if (statusRef.current === "starting" || statusRef.current === "live")
      return false;
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
          video.addEventListener("loadedmetadata", () => resolve(), {
            once: true,
          });
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
          mimeTypeRef.current = mimeType;
          startSegment();
          rotationTimerRef.current = setInterval(() => {
            const recorder = recorderRef.current;
            prevSegmentChunksRef.current = currentSegmentChunksRef.current;
            if (recorder && recorder.state !== "inactive") {
              recorder.onstop = null;
              recorder.stop();
            }
            startSegment();
          }, 8000);
        }
      } catch {
        recorderRef.current = null;
        mimeTypeRef.current = null;
        prevSegmentChunksRef.current = [];
        currentSegmentChunksRef.current = [];
      }

      setStatus("live");
      const loop = () => {
        if (!streamRef.current) return;
        try {
          if (video.readyState < 2 || video.videoWidth === 0) {
            rafRef.current = requestAnimationFrame(loop);
            return;
          }
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
          onFrameRef.current(
            toGrayscale(img.data, canvas.width, canvas.height),
            performance.now(),
            canvas.width,
            canvas.height,
          );
        } catch (e) {
          lastErrorRef.current = e instanceof Error ? e.message : String(e);
        }
        frameCountRef.current += 1;
        if (frameCountRef.current % 30 === 0) {
          setDebug({
            frames: frameCountRef.current,
            lastError: lastErrorRef.current,
          });
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
      return true;
    } catch (e) {
      const denied = e instanceof DOMException && e.name === "NotAllowedError";
      stop(true);
      setStatus(denied ? "denied" : "error");
      return false;
    }
  }, [stop, startSegment]);

  // Test/tuning mode: run the same pipeline over an uploaded video file.
  // Timestamps come from the video's own clock, so speed stats stay correct
  // even if decoding runs slower than real time. No recorder, no wake lock.
  const startFile = useCallback(
    async (file: File): Promise<boolean> => {
      if (statusRef.current === "starting" || statusRef.current === "live")
        return false;
      setStatus("starting");
      try {
        const video = videoRef.current;
        if (!video) throw new Error("video element not mounted");
        modeRef.current = "file";
        setFileEnded(false);
        const url = URL.createObjectURL(file);
        objectUrlRef.current = url;
        video.srcObject = null;
        video.src = url;
        video.loop = false;
        await new Promise<void>((resolve, reject) => {
          video.onloadeddata = () => resolve();
          video.onerror = () => reject(new Error("could not load video"));
          video.load();
        });
        if (video.videoWidth === 0) throw new Error("video reported zero size");
        video.onended = () => setFileEnded(true);
        // Render the first frame so calibration has something to tap on.
        video.currentTime = 0;

        const canvas = document.createElement("canvas");
        const scale = TARGET_WIDTH / video.videoWidth;
        canvas.width = TARGET_WIDTH;
        canvas.height = Math.round(video.videoHeight * scale);
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) throw new Error("canvas 2d unavailable");

        setStatus("live");
        const loop = () => {
          if (modeRef.current !== "file") return;
          try {
            if (video.readyState >= 2 && video.videoWidth > 0) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
              onFrameRef.current(
                toGrayscale(img.data, canvas.width, canvas.height),
                video.currentTime * 1000,
                canvas.width,
                canvas.height,
              );
            }
          } catch (e) {
            lastErrorRef.current = e instanceof Error ? e.message : String(e);
          }
          frameCountRef.current += 1;
          if (frameCountRef.current % 30 === 0) {
            setDebug({
              frames: frameCountRef.current,
              lastError: lastErrorRef.current,
            });
          }
          rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);
        return true;
      } catch {
        stop(true);
        setStatus("error");
        return false;
      }
    },
    [stop],
  );

  const playFile = useCallback(() => {
    if (modeRef.current !== "file") return;
    setFileEnded(false);
    videoRef.current?.play().catch(() => undefined);
  }, []);

  const restartFile = useCallback(() => {
    if (modeRef.current !== "file") return;
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    setFileEnded(false);
    video.play().catch(() => undefined);
  }, []);

  const isFileMode = useCallback(() => modeRef.current === "file", []);

  useEffect(() => stop, [stop]);

  return {
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
  };
}
