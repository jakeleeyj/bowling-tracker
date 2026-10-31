"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useTransitionRouter } from "@/components/ViewTransitions";
import {
  Home,
  Plus,
  BarChart3,
  Swords,
  User,
  CircleDot,
} from "lucide-react";
import { useUnsavedGuard } from "@/components/UnsavedGuard";

const navItems = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/stats", label: "Stats", icon: BarChart3 },
  { href: "/leaderboard", label: "Ranked", icon: Swords },
  { href: "/arsenal", label: "Arsenal", icon: CircleDot },
  { href: "/profile", label: "Me", icon: User },
];

export default function SideNav() {
  const pathname = usePathname();
  const router = useTransitionRouter();
  const { confirmLeave } = useUnsavedGuard();

  function handleNav(href: string) {
    if (pathname.startsWith(href)) return;
    if (!confirmLeave()) return;
    router.push(href);
  }

  function isNavActive(href: string) {
    if (href === "/leaderboard") {
      return (
        pathname.startsWith("/leaderboard") || pathname.startsWith("/player/")
      );
    }
    return pathname.startsWith(href);
  }

  const isLogActive = pathname.startsWith("/log");

  const [hasSavedSession, setHasSavedSession] = useState(false);
  useEffect(() => {
    const check = () =>
      setHasSavedSession(localStorage.getItem("spare-me-session") !== null);
    check();
    const handler = () => check();
    window.addEventListener("session-storage-change", handler);
    return () => window.removeEventListener("session-storage-change", handler);
  }, [pathname]);

  return (
    <nav className="hidden [view-transition-name:app-nav] lg:flex lg:shrink-0 lg:flex-col lg:sticky lg:top-0 lg:h-dvh w-[240px] z-50 bg-surface border-r border-border px-3 py-6">
      {/* App name */}
      <div className="px-3 mb-8">
        <span className="text-lg font-semibold text-text-primary tracking-tight">
          Spare Me?
        </span>
      </div>

      {/* Log CTA button */}
      <div className="relative mb-6">
        {hasSavedSession && (
          <span
            aria-hidden
            className="absolute -inset-[2px] animate-pulse rounded-[14px] opacity-80 blur-sm bg-[conic-gradient(var(--color-strike),var(--color-spare),var(--color-strike))]"
          />
        )}
        <button
          onClick={() => handleNav("/log")}
          aria-label={hasSavedSession ? "Continue session" : "Log a session"}
          className={`relative flex w-full items-center gap-3 rounded-xl bg-blue px-4 py-3 text-sm font-semibold text-white transition-all duration-150 active:scale-[0.98] ${isLogActive ? "ring-2 ring-white/20" : ""}`}
        >
          {hasSavedSession ? (
            <svg
              width={18}
              height={18}
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
              className="shrink-0 animate-spin"
              style={{ animationDuration: "3s" }}
            >
              <circle cx="12" cy="12" r="10" fill="var(--color-base)" />
              <circle cx="10" cy="8" r="1.5" fill="var(--color-text-primary)" />
              <circle cx="14" cy="8" r="1.5" fill="var(--color-text-primary)" />
              <circle cx="12" cy="11.5" r="1.5" fill="var(--color-text-primary)" />
            </svg>
          ) : (
            <Plus size={18} strokeWidth={2.5} className="shrink-0" />
          )}
          {hasSavedSession ? "Continue session" : "Log a session"}
        </button>
      </div>

      {/* Nav items */}
      <div className="flex flex-col gap-1">
        {navItems.map((item) => {
          const isActive = isNavActive(item.href);
          return (
            <button
              key={item.href}
              onClick={() => handleNav(item.href)}
              className={`flex items-center gap-3 w-full rounded-xl px-3 py-2.5 text-sm transition-all duration-150 ${
                isActive
                  ? "bg-blue/10 text-blue font-semibold"
                  : "text-text-muted hover:bg-white/[0.03] hover:text-text-primary"
              }`}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${
                  isActive ? "bg-blue/15" : ""
                }`}
              >
                <item.icon
                  size={18}
                  strokeWidth={isActive ? 2.5 : 1.8}
                  className="transition-colors duration-150"
                />
              </div>
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
