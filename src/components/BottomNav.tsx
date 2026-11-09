"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useTransitionRouter } from "@/components/ViewTransitions";
import { Home, Plus, BarChart3, Swords, User } from "lucide-react";
import { LiquidGlass } from "quick-liquid/react";
import { useUnsavedGuard } from "@/components/UnsavedGuard";
import { logGlass, logGlassActive, navGlass } from "@/lib/glass";

const navItems = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/stats", label: "Stats", icon: BarChart3 },
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
    <nav className="fixed bottom-0 left-0 right-0 z-50 [view-transition-name:app-nav] mx-auto flex max-w-[480px] items-center gap-3 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden [transform:translateZ(0)] [will-change:transform]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[calc(100%+1rem)] bg-gradient-to-t from-base via-base/60 to-transparent"
      />
      <LiquidGlass
        config={navGlass}
        className="h-16 flex-1 rounded-full bg-base/55 shadow-lg shadow-black/40"
      >
        <div className="flex h-16 items-center px-1.5">
          {navItems.map((item) => {
            const isActive = isNavActive(item.href);
            return (
              <button
                key={item.href}
                onClick={() => handleNav(item.href)}
                aria-current={isActive ? "page" : undefined}
                className="flex h-[52px] flex-1 flex-col items-center justify-center gap-0.5 rounded-full transition-colors duration-200 active:bg-white/5"
              >
                <div
                  className={`flex h-7 w-12 items-center justify-center rounded-full transition-all duration-200 ${
                    isActive ? "bg-blue/15" : "scale-90"
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
      </LiquidGlass>

      <button
        onClick={openLog}
        aria-label={hasSavedSession ? "Resume your session" : "Log a session"}
        className="relative shrink-0 rounded-full transition-transform duration-150 active:scale-95"
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
        <LiquidGlass
          config={hasSavedSession ? logGlassActive : logGlass}
          className={`h-16 w-16 rounded-full shadow-lg shadow-black/40 ${hasSavedSession ? "bg-base/70" : "bg-blue"} ${isLogActive && !hasSavedSession ? "ring-2 ring-white/20" : ""}`}
        >
          <div className="flex h-16 w-16 items-center justify-center">
            {hasSavedSession ? (
              <svg
                width={26}
                height={26}
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden
                className="animate-spin"
                style={{ animationDuration: "3s" }}
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  fill="var(--color-text-primary)"
                />
                <circle cx="10" cy="8" r="1.5" fill="var(--color-base)" />
                <circle cx="14" cy="8" r="1.5" fill="var(--color-base)" />
                <circle cx="12" cy="11.5" r="1.5" fill="var(--color-base)" />
              </svg>
            ) : (
              <Plus
                size={28}
                className="text-[var(--color-base)]"
                strokeWidth={2.5}
              />
            )}
          </div>
        </LiquidGlass>
      </button>
    </nav>
  );
}
