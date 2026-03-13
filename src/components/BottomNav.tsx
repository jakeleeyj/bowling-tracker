"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home, PlusCircle, BarChart3, Trophy, User } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/log", label: "Log", icon: PlusCircle },
  { href: "/stats", label: "Stats", icon: BarChart3 },
  { href: "/leaderboard", label: "Board", icon: Trophy },
  { href: "/profile", label: "Profile", icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="glass-strong fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-[480px] pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 sm:bottom-4 sm:left-4 sm:right-4 sm:rounded-2xl">
      <div className="flex">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group flex flex-1 flex-col items-center gap-0.5 py-2"
            >
              <div
                className={`flex h-8 w-12 items-center justify-center rounded-full transition-all duration-200 ${
                  isActive
                    ? "bg-blue/15 scale-100"
                    : "scale-90 active:scale-95 active:bg-white/5"
                }`}
              >
                <item.icon
                  size={20}
                  className={`transition-colors duration-200 ${
                    isActive ? "text-blue" : "text-text-muted"
                  }`}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
              </div>
              <span
                className={`text-[10px] transition-colors duration-200 ${
                  isActive ? "font-semibold text-blue" : "text-text-muted"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
