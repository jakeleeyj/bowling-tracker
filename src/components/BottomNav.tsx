"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Home, Plus, BarChart3, Swords, User } from "lucide-react";
import { useUnsavedGuard } from "@/components/UnsavedGuard";

const leftItems = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/stats", label: "Stats", icon: BarChart3 },
];

const rightItems = [
  { href: "/leaderboard", label: "Ranked", icon: Swords },
  { href: "/profile", label: "Me", icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { confirmLeave } = useUnsavedGuard();

  function handleNav(href: string) {
    if (pathname.startsWith(href)) return;
    if (!confirmLeave()) return;
    router.push(href);
  }

  const isLogActive = pathname.startsWith("/log");

  const [hasSavedSession, setHasSavedSession] = useState(false);
  useEffect(() => {
    const check = () =>
      setHasSavedSession(localStorage.getItem("spare-me-session") !== null);
    check();
    // Listen for custom event dispatched by useSessionState on save/clear
    const handler = () => check();
    window.addEventListener("session-storage-change", handler);
    return () => window.removeEventListener("session-storage-change", handler);
  }, [pathname]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-[480px] overflow-visible">
      {/* Floating circle — above the notch */}
      <button
        onClick={() => handleNav("/log")}
        aria-label="Log a session"
        className="absolute left-1/2 -top-6 z-20 -translate-x-1/2"
      >
        <div
          className={`flex h-[52px] w-[52px] items-center justify-center rounded-full transition-transform duration-150 active:scale-95 ${
            hasSavedSession
              ? "bg-gradient-to-br from-blue to-emerald-600 shadow-[0_4px_20px_rgba(59,130,246,0.3),0_0_40px_rgba(16,185,129,0.1)]"
              : "bg-gradient-to-br from-blue to-blue-dark shadow-[0_4px_20px_rgba(59,130,246,0.4),0_0_40px_rgba(59,130,246,0.15)]"
          } ${isLogActive ? "ring-2 ring-white/20" : ""}`}
        >
          {hasSavedSession ? (
            <svg
              width={24}
              height={24}
              viewBox="0 0 24 24"
              fill="none"
              className="animate-spin"
              style={{ animationDuration: "3s" }}
            >
              <circle cx="12" cy="12" r="10" fill="white" />
              <circle
                cx="10"
                cy="8"
                r="1.5"
                fill="currentColor"
                className="text-green"
              />
              <circle
                cx="14"
                cy="8"
                r="1.5"
                fill="currentColor"
                className="text-green"
              />
              <circle
                cx="12"
                cy="11.5"
                r="1.5"
                fill="currentColor"
                className="text-green"
              />
            </svg>
          ) : (
            <Plus size={26} className="text-white" strokeWidth={2.5} />
          )}
        </div>
      </button>

      {/* SVG background with notch cutout */}
      <div className="absolute inset-0 -top-7 overflow-visible pointer-events-none">
        <svg
          viewBox="0 -20 480 100"
          preserveAspectRatio="xMidYMin slice"
          className="h-full w-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0 14 L192 14 C206 14,210 13,214 4 A32 32 0 0 1 266 4 C270 13,274 14,288 14 L480 14 L480 80 L0 80 Z"
            fill="rgba(15,23,41,0.92)"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1"
          />
        </svg>
      </div>

      {/* Nav items row — all 5 labels aligned */}
      <div className="relative z-[2] flex pt-1 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {leftItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <button
              key={item.href}
              onClick={() => handleNav(item.href)}
              className="flex flex-1 flex-col items-center gap-0.5 py-2.5"
            >
              <div
                className={`flex h-8 w-12 items-center justify-center rounded-full transition-all duration-200 ${
                  isActive
                    ? "bg-blue/15"
                    : "scale-90 active:scale-95 active:bg-white/5"
                }`}
              >
                <item.icon
                  size={20}
                  className={`transition-colors duration-200 ${isActive ? "text-blue" : "text-text-muted"}`}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
              </div>
              <span
                className={`text-[10px] transition-colors duration-200 ${isActive ? "font-semibold text-blue" : "text-text-muted"}`}
              >
                {item.label}
              </span>
            </button>
          );
        })}

        {/* Center — "Log" label aligned with others, circle floats above */}
        <button
          onClick={() => handleNav("/log")}
          className="flex flex-1 flex-col items-center gap-0.5 py-2.5"
        >
          {/* Invisible spacer matching the icon area height */}
          <div className="h-8" />
          <span
            className={`text-[10px] transition-colors duration-200 ${hasSavedSession ? "font-semibold bg-gradient-to-r from-blue to-emerald-600 bg-clip-text text-transparent" : isLogActive ? "font-semibold text-blue" : "text-text-muted"}`}
          >
            {hasSavedSession ? "Ongoing" : "Log"}
          </span>
        </button>

        {rightItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <button
              key={item.href}
              onClick={() => handleNav(item.href)}
              className="flex flex-1 flex-col items-center gap-0.5 py-2.5"
            >
              <div
                className={`flex h-8 w-12 items-center justify-center rounded-full transition-all duration-200 ${
                  isActive
                    ? "bg-blue/15"
                    : "scale-90 active:scale-95 active:bg-white/5"
                }`}
              >
                <item.icon
                  size={20}
                  className={`transition-colors duration-200 ${isActive ? "text-blue" : "text-text-muted"}`}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
              </div>
              <span
                className={`text-[10px] transition-colors duration-200 ${isActive ? "font-semibold text-blue" : "text-text-muted"}`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
