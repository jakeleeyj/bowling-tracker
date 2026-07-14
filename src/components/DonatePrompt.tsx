"use client";

import { useState, useEffect } from "react";
import { Heart, X } from "lucide-react";
import { isNativeApp } from "@/lib/platform";

const SNOOZE_KEY = "spare-me-donate-snooze";
const VISITS_KEY = "spare-me-visit-count";
const MIN_VISITS = 5;
const SNOOZE_DAYS = 60;

export default function DonatePrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Store rules forbid external donation links inside the native app
    if (isNativeApp()) return;

    const visits = Number(localStorage.getItem(VISITS_KEY) ?? 0) + 1;
    localStorage.setItem(VISITS_KEY, String(visits));
    if (visits < MIN_VISITS) return;

    const snoozedAt = Number(localStorage.getItem(SNOOZE_KEY) ?? 0);
    if (Date.now() - snoozedAt < SNOOZE_DAYS * 86400000) return;

    const timer = setTimeout(() => setShow(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  function handleDismiss() {
    setShow(false);
    localStorage.setItem(SNOOZE_KEY, String(Date.now()));
  }

  if (!show) return null;

  return (
    <div className="glass animate-slide-down mb-4 flex items-center gap-3 p-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red/15">
        <Heart size={18} className="text-red" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold">Enjoying Spare Me?</p>
        <p className="text-[11px] text-text-muted">
          A small tip keeps the servers rolling
        </p>
      </div>
      <a
        href="https://ko-fi.com/jakelyj45285"
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleDismiss}
        className="shrink-0 rounded-lg bg-red px-3 py-1.5 text-[11px] font-bold text-white active:scale-95"
      >
        Tip
      </a>
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
