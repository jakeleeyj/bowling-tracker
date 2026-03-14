"use client";

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

  return (
    <>
      {/* Floating circle — fixed to viewport so iOS doesn't clip it */}
      <button
        onClick={() => handleNav("/log")}
        aria-label="Log a session"
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+1.25rem)] left-1/2 z-[60] -translate-x-1/2"
      >
        <div
          className={`flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue to-blue-dark shadow-[0_4px_20px_rgba(59,130,246,0.4),0_0_40px_rgba(59,130,246,0.15)] transition-transform duration-150 active:scale-95 ${isLogActive ? "ring-2 ring-white/20" : ""}`}
        >
          <Plus size={26} className="text-white" strokeWidth={2.5} />
        </div>
      </button>

      <nav className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-[480px]">
        {/* SVG background with U-shaped notch */}
        <div className="absolute inset-0 -top-7 pointer-events-none">
          <svg
            viewBox="0 0 375 100"
            preserveAspectRatio="none"
            className="h-full w-full"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M0 28 L150 28 C158 28,160 28,162 30 C166 34,155 60,187.5 60 C220 60,209 34,213 30 C215 28,217 28,225 28 L375 28 L375 100 L0 100 Z"
              className="fill-surface-light"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="0.5"
            />
          </svg>
        </div>

        {/* Nav items row — 4 items with center gap */}
        <div className="relative z-[2] flex pb-[max(0.5rem,env(safe-area-inset-bottom))]">
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

          {/* Center spacer for the floating circle */}
          <div className="flex-1" />

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
    </>
  );
}
