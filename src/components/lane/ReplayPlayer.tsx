"use client";

import { useEffect, useRef } from "react";

export default function ReplayPlayer({ blob }: { blob: Blob | null }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const video = videoRef.current;
    if (video) {
      video.src = url;
      video.play().catch(() => undefined);
    }
    return () => URL.revokeObjectURL(url);
  }, [blob]);

  if (!blob) return null;

  return (
    <video
      ref={videoRef}
      playsInline
      muted
      loop
      className="absolute inset-0 h-full w-full object-cover"
    />
  );
}
