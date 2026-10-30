"use client";

import { useEffect, useState } from "react";
import { haptic } from "@/lib/haptics";

const THEMES = [
  { id: "classic", label: "Classic" },
  { id: "telemetry", label: "Telemetry" },
] as const;

type ThemeId = (typeof THEMES)[number]["id"];

const STORAGE_KEY = "spare-me-theme";

export default function ThemePicker() {
  const [theme, setTheme] = useState<ThemeId>("classic");

  useEffect(() => {
    if (document.documentElement.dataset.theme === "telemetry") {
      setTheme("telemetry");
    }
  }, []);

  function choose(id: ThemeId) {
    haptic();
    setTheme(id);
    if (id === "classic") {
      delete document.documentElement.dataset.theme;
      localStorage.removeItem(STORAGE_KEY);
    } else {
      document.documentElement.dataset.theme = id;
      localStorage.setItem(STORAGE_KEY, id);
    }
  }

  return (
    <div className="glass flex items-center justify-between gap-3 p-4">
      <span className="text-sm font-semibold">Theme</span>
      <div
        role="radiogroup"
        aria-label="Theme"
        className="flex rounded-lg bg-surface-light p-0.5"
      >
        {THEMES.map((t) => (
          <button
            key={t.id}
            role="radio"
            aria-checked={theme === t.id}
            onClick={() => choose(t.id)}
            className={`min-h-9 rounded-md px-3.5 text-xs font-semibold transition-colors duration-150 ${
              theme === t.id ? "bg-base text-text-primary" : "text-text-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
