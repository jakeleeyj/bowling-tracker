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
    <nav className="glass-strong fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-[480px] px-1 py-2 sm:bottom-4 sm:left-4 sm:right-4 sm:rounded-2xl">
      <div className="flex">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-1 flex-col items-center gap-1 py-1"
            >
              <item.icon
                size={20}
                className={isActive ? "text-blue" : "text-text-muted"}
              />
              <span
                className={`text-[9px] ${isActive ? "font-semibold text-blue" : "text-text-muted"}`}
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
