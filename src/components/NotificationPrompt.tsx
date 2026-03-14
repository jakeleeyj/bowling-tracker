"use client";

import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";

const DISMISSED_KEY = "spare-me-notif-dismissed";

export default function NotificationPrompt() {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Don't show if: not supported, already granted/denied, or previously dismissed
    if (!("Notification" in window) || !("PushManager" in window)) return;
    if (Notification.permission !== "default") return;
    if (localStorage.getItem(DISMISSED_KEY)) return;

    // Small delay so it doesn't flash on load
    const timer = setTimeout(() => setShow(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  async function handleEnable() {
    setLoading(true);
    try {
      const result = await Notification.requestPermission();
      if (result !== "granted") {
        setShow(false);
        localStorage.setItem(DISMISSED_KEY, "1");
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });

      setShow(false);
    } catch {
      setShow(false);
    } finally {
      setLoading(false);
    }
  }

  function handleDismiss() {
    setShow(false);
    localStorage.setItem(DISMISSED_KEY, "1");
  }

  if (!show) return null;

  return (
    <div className="glass animate-slide-down mb-4 flex items-center gap-3 p-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue/15">
        <Bell size={18} className="text-blue" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold">Stay in the loop</p>
        <p className="text-[11px] text-text-muted">
          Get notified when friends log games
        </p>
      </div>
      <button
        onClick={handleEnable}
        disabled={loading}
        className="shrink-0 rounded-lg bg-blue px-3 py-1.5 text-[11px] font-bold text-white active:scale-95 disabled:opacity-50"
      >
        {loading ? "..." : "Enable"}
      </button>
      <button
        onClick={handleDismiss}
        className="shrink-0 p-1 text-text-muted active:scale-90"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}
