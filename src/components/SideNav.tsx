"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Home, Plus, BarChart3, Swords, User } from "lucide-react";
import { useUnsavedGuard } from "@/components/UnsavedGuard";

const navItems = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/stats", label: "Stats", icon: BarChart3 },
  { href: "/leaderboard", label: "Ranked", icon: Swords },
  { href: "/profile", label: "Me", icon: User },
];

export default function SideNav() {
  const pathname = usePathname();
  const router = useRouter();
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
    <nav className="hidden lg:flex lg:shrink-0 lg:flex-col lg:sticky lg:top-0 lg:h-dvh w-[240px] z-50 bg-surface border-r border-border px-3 py-6">
      {/* App name */}
      <div className="px-3 mb-8">
        <span className="text-lg font-bold text-text-primary tracking-tight">
          Spare Me?
        </span>
      </div>

      {/* Log CTA button */}
      <button
        onClick={() => handleNav("/log")}
        aria-label={hasSavedSession ? "Continue session" : "Log a session"}
        className={`flex items-center gap-3 w-full rounded-xl px-4 py-3 mb-6 font-semibold text-sm text-white transition-all duration-150 active:scale-[0.98] ${
          hasSavedSession
            ? "bg-gradient-to-r from-blue to-emerald-600 shadow-[0_4px_20px_rgba(59,130,246,0.25),0_0_40px_rgba(16,185,129,0.1)]"
            : "bg-gradient-to-r from-blue to-blue-dark shadow-[0_4px_20px_rgba(59,130,246,0.3)]"
        } ${isLogActive ? "ring-2 ring-white/20" : ""}`}
      >
        {hasSavedSession ? (
          <svg
            width={18}
            height={18}
            viewBox="0 0 24 24"
            fill="none"
            className="animate-spin shrink-0"
            style={{ animationDuration: "3s" }}
          >
            <circle cx="12" cy="12" r="10" fill="white" />
            <circle cx="10" cy="8" r="1.5" fill="#10b981" />
            <circle cx="14" cy="8" r="1.5" fill="#10b981" />
            <circle cx="12" cy="11.5" r="1.5" fill="#10b981" />
          </svg>
        ) : (
          <Plus size={18} strokeWidth={2.5} className="shrink-0" />
        )}
        {hasSavedSession ? "Continue Session" : "Log a Session"}
      </button>

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
