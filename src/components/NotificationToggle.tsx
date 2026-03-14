"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff } from "lucide-react";

export default function NotificationToggle() {
  const [permission, setPermission] =
    useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!("Notification" in window)) return;
    setPermission(Notification.permission);

    // Check if already subscribed
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setSubscribed(!!sub);
        });
      });
    }
  }, []);

  async function handleToggle() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    setLoading(true);

    try {
      const reg = await navigator.serviceWorker.ready;

      if (subscribed) {
        // Unsubscribe
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await fetch("/api/push/subscribe", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          });
          await sub.unsubscribe();
        }
        setSubscribed(false);
      } else {
        // Subscribe
        const result = await Notification.requestPermission();
        setPermission(result);
        if (result !== "granted") {
          setLoading(false);
          return;
        }

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        });

        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscription: sub.toJSON() }),
        });

        setSubscribed(true);
      }
    } catch {
      // Permission denied or push not supported
    } finally {
      setLoading(false);
    }
  }

  // Don't render if push not supported
  if (typeof window !== "undefined" && !("PushManager" in window)) return null;

  const denied = permission === "denied";

  return (
    <button
      onClick={handleToggle}
      disabled={loading || denied}
      className={`glass flex items-center gap-3 p-4 text-left ${denied ? "opacity-40" : ""}`}
    >
      {subscribed ? (
        <Bell size={20} className="text-green" />
      ) : (
        <BellOff size={20} className="text-text-muted" />
      )}
      <div className="flex-1">
        <span className="text-sm font-semibold">
          {denied
            ? "Notifications Blocked"
            : subscribed
              ? "Notifications On"
              : "Enable Notifications"}
        </span>
        <p className="text-[10px] text-text-muted">
          {denied
            ? "Enable in browser settings"
            : subscribed
              ? "You'll be notified when friends bowl"
              : "Get notified when friends log games"}
        </p>
      </div>
    </button>
  );
}
