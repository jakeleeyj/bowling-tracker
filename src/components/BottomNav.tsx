"use client";

import { usePathname, useRouter } from "next/navigation";
import { Home, Plus, BarChart3, Swords, User } from "lucide-react";
import { useUnsavedGuard } from "@/components/UnsavedGuard";

const sideItems = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/stats", label: "Stats", icon: BarChart3 },
  // center gap
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
  const left = sideItems.slice(0, 2);
  const right = sideItems.slice(2);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-[480px]">
      {/* SVG background with notch cutout */}
      <div className="absolute inset-0 -top-3.5 overflow-visible">
        <svg
          viewBox="0 0 480 80"
          preserveAspectRatio="none"
          className="h-full w-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0 14 L192 14 C206 14,210 13,214 4 A32 32 0 0 1 266 4 C270 13,274 14,288 14 L480 14 L480 80 L0 80 Z"
            fill="rgba(15,23,41,0.92)"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1"
            style={{ backdropFilter: "blur(20px)" }}
          />
        </svg>
      </div>

      {/* Center Log button — sits in the notch */}
      <button
        onClick={() => handleNav("/log")}
        className="absolute left-1/2 -translate-x-1/2 bottom-[calc(max(0.5rem,env(safe-area-inset-bottom))+16px)] z-10 flex flex-col items-center gap-0.5"
      >
        <div
          className={`flex h-[52px] w-[52px] items-center justify-center rounded-full bg-gradient-to-br from-blue to-blue-dark shadow-[0_4px_20px_rgba(59,130,246,0.4),0_0_40px_rgba(59,130,246,0.15)] transition-transform duration-150 active:scale-93 ${isLogActive ? "ring-2 ring-white/20" : ""}`}
        >
          <Plus size={26} className="text-white" strokeWidth={2.5} />
        </div>
        <span
          className={`text-[10px] font-semibold ${isLogActive ? "text-blue" : "text-text-muted"}`}
        >
          Log
        </span>
      </button>

      {/* Nav items row */}
      <div className="relative z-[2] flex pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {left.map((item) => {
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

        {/* Spacer for center button */}
        <div className="flex-1" />

        {right.map((item) => {
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
