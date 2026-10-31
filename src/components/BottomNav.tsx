"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useTransitionRouter } from "@/components/ViewTransitions";
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
  const router = useTransitionRouter();
  const { confirmLeave } = useUnsavedGuard();

  function handleNav(href: string) {
    if (pathname.startsWith(href)) return;
    if (!confirmLeave()) return;
    router.push(href);
  }

  // With a game in progress, go straight back into it instead of the resume prompt
  function openLog() {
    if (!hasSavedSession) return handleNav("/log");
    if (pathname.startsWith("/log")) {
      window.dispatchEvent(new Event("session-resume"));
      return;
    }
    router.push("/log?resume=1");
  }

  const isLogActive = pathname.startsWith("/log");

  // /player/[id] is part of the Ranked section
  function isNavActive(href: string) {
    if (href === "/leaderboard") {
      return (
        pathname.startsWith("/leaderboard") || pathname.startsWith("/player/")
      );
    }
    return pathname.startsWith(href);
  }

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
    <nav className="fixed bottom-0 left-0 right-0 z-50 [view-transition-name:app-nav] mx-auto max-w-[480px] overflow-visible lg:hidden [transform:translateZ(0)] [will-change:transform]">
      {/* Floating circle — above the notch */}
      <button
        onClick={openLog}
        aria-label="Log a session"
        className="absolute left-1/2 -top-3 z-20 -translate-x-1/2"
      >
        {hasSavedSession && (
          <>
            <span
              aria-hidden
              className="absolute -inset-[3px] animate-[spin_4s_linear_infinite] rounded-full opacity-70 blur-md bg-[conic-gradient(var(--color-strike),var(--color-spare),var(--color-strike))]"
            />
            <span
              aria-hidden
              className="absolute -inset-[3px] animate-[spin_4s_linear_infinite] rounded-full bg-[conic-gradient(var(--color-strike),var(--color-spare),var(--color-strike))]"
            />
          </>
        )}
        <div
          className={`relative flex h-[52px] w-[52px] items-center justify-center rounded-full bg-blue shadow-lg shadow-black/40 transition-transform duration-150 active:scale-95 ${isLogActive && !hasSavedSession ? "ring-2 ring-white/20" : ""}`}
        >
          {hasSavedSession ? (
            <svg
              width={24}
              height={24}
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
              className="animate-spin"
              style={{ animationDuration: "3s" }}
            >
              <circle cx="12" cy="12" r="10" fill="var(--color-base)" />
              <circle cx="10" cy="8" r="1.5" fill="var(--color-text-primary)" />
              <circle cx="14" cy="8" r="1.5" fill="var(--color-text-primary)" />
              <circle cx="12" cy="11.5" r="1.5" fill="var(--color-text-primary)" />
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
            d="M0 14 L200 14 C212 14,216 13,220 4 A30 30 0 0 1 260 4 C264 13,268 14,280 14 L480 14 L480 80 L0 80 Z"
            className="fill-surface/92 stroke-border"
            strokeWidth="1"
          />
        </svg>
      </div>

      {/* Nav items row — all 5 labels aligned */}
      <div className="relative z-[2] flex pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {leftItems.map((item) => {
          const isActive = isNavActive(item.href);
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
                className={`text-[11px] transition-colors duration-200 ${isActive ? "font-semibold text-blue" : "text-text-muted"}`}
              >
                {item.label}
              </span>
            </button>
          );
        })}

        {/* Center — "Log" label aligned with others, circle floats above */}
        <button
          onClick={openLog}
          className="flex flex-1 flex-col items-center gap-0.5 py-2.5"
        >
          {/* Invisible spacer matching the icon area height */}
          <div className="h-8" />
          <span
            className={`text-[11px] transition-colors duration-200 ${hasSavedSession || isLogActive ? "font-semibold text-text-primary" : "text-text-muted"}`}
          >
            {hasSavedSession ? "Ongoing" : "Log"}
          </span>
        </button>

        {rightItems.map((item) => {
          const isActive = isNavActive(item.href);
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
                className={`text-[11px] transition-colors duration-200 ${isActive ? "font-semibold text-blue" : "text-text-muted"}`}
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
