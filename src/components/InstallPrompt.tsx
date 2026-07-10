"use client";

import { useState, useEffect } from "react";
import { Smartphone, X, Share, MoreVertical } from "lucide-react";
import { isNativeApp } from "@/lib/platform";

const DISMISSED_KEY = "spare-me-install-dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

export default function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    // Skip inside the native app, when already installed, or when dismissed
    if (isNativeApp()) return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if (localStorage.getItem(DISMISSED_KEY)) return;

    setIsIos(
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window),
    );

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    const timer = setTimeout(() => setShow(true), 1500);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
    };
  }, []);

  async function handleInstall() {
    if (installEvent) {
      await installEvent.prompt();
      setShow(false);
      localStorage.setItem(DISMISSED_KEY, "1");
      return;
    }
    setExpanded(!expanded);
  }

  function handleDismiss() {
    setShow(false);
    localStorage.setItem(DISMISSED_KEY, "1");
  }

  if (!show) return null;

  return (
    <div className="glass animate-slide-down mb-4 p-3">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue/15">
          <Smartphone size={18} className="text-blue" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold">
            Add Spare Me to your phone
          </p>
          <p className="text-[11px] text-text-muted">
            Install it like an app — faster, full screen
          </p>
        </div>
        <button
          onClick={handleInstall}
          className="shrink-0 rounded-lg bg-blue px-3 py-1.5 text-[11px] font-bold text-white active:scale-95"
        >
          {installEvent ? "Install" : expanded ? "Hide" : "How?"}
        </button>
        <button
          onClick={handleDismiss}
          className="shrink-0 p-1 text-text-muted active:scale-90"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      </div>

      {expanded && (
        <div className="mt-3 border-t border-border pt-3 text-xs text-text-muted">
          {isIos ? (
            <ol className="ml-4 list-decimal space-y-1">
              <li className="flex-wrap">
                Tap <Share size={12} className="inline text-text-secondary" />{" "}
                <span className="font-medium text-text-secondary">Share</span>{" "}
                in Safari&apos;s toolbar
              </li>
              <li>
                Scroll down and tap{" "}
                <span className="font-medium text-text-secondary">
                  Add to Home Screen
                </span>
              </li>
            </ol>
          ) : (
            <ol className="ml-4 list-decimal space-y-1">
              <li>
                Tap the{" "}
                <MoreVertical
                  size={12}
                  className="inline text-text-secondary"
                />{" "}
                <span className="font-medium text-text-secondary">menu</span> in
                your browser
              </li>
              <li>
                Tap{" "}
                <span className="font-medium text-text-secondary">
                  Add to Home screen
                </span>{" "}
                or{" "}
                <span className="font-medium text-text-secondary">
                  Install app
                </span>
              </li>
            </ol>
          )}
        </div>
      )}
    </div>
  );
}
