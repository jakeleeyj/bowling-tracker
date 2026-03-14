"use client";

import { usePathname, useRouter } from "next/navigation";
import { Home, PlusCircle, BarChart3, Swords, User } from "lucide-react";
import { useUnsavedGuard } from "@/components/UnsavedGuard";

const navItems = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/stats", label: "Stats", icon: BarChart3 },
  { href: "/log", label: "Log", icon: PlusCircle, isCenter: true },
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

  return (
    <nav className="glass-strong fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-[480px] pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 sm:bottom-4 sm:left-4 sm:right-4 sm:rounded-2xl">
      <div className="flex">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <button
              key={item.href}
              onClick={() => handleNav(item.href)}
              className="group flex flex-1 flex-col items-center gap-0.5 py-2"
            >
              <div
                className={`flex items-center justify-center rounded-full transition-all duration-200 ${
                  item.isCenter
                    ? "h-10 w-10 -mt-3 bg-blue shadow-lg shadow-blue/30"
                    : isActive
                      ? "h-8 w-12 bg-blue/15 scale-100"
                      : "h-8 w-12 scale-90 active:scale-95 active:bg-white/5"
                }`}
              >
                <item.icon
                  size={item.isCenter ? 22 : 20}
                  className={`transition-colors duration-200 ${
                    item.isCenter
                      ? "text-white"
                      : isActive
                        ? "text-blue"
                        : "text-text-muted"
                  }`}
                  strokeWidth={item.isCenter ? 2.5 : isActive ? 2.5 : 1.8}
                />
              </div>
              <span
                className={`text-[10px] transition-colors duration-200 ${
                  isActive ? "font-semibold text-blue" : "text-text-muted"
                }`}
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
