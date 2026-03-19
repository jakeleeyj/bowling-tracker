"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js");
    }

    // Recover from stale chunks after deploys — reload once to get fresh code
    function handleChunkError(event: ErrorEvent) {
      if (
        event.message?.includes("ChunkLoadError") ||
        event.message?.includes("Loading chunk")
      ) {
        const reloaded = sessionStorage.getItem("chunk-reload");
        if (!reloaded) {
          sessionStorage.setItem("chunk-reload", "1");
          window.location.reload();
        }
      }
    }

    window.addEventListener("error", handleChunkError);
    return () => window.removeEventListener("error", handleChunkError);
  }, []);
  return null;
}
