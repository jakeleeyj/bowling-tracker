import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  BarChart3,
  Swords,
  Target,
  Trophy,
  WifiOff,
  Share2,
} from "lucide-react";

export const metadata = {
  title: "Spare Me? — Bowling score tracker with ranked seasons",
  description:
    "Log every frame, see your real stats, and climb ranked seasons. A bowling tracker for you and your crew — no ads, no paywall.",
};

const FEATURES = [
  {
    icon: Target,
    title: "Frame-by-frame logging",
    text: "Tap the pins you left standing — strikes, spares, splits and the 10th frame all score themselves.",
  },
  {
    icon: BarChart3,
    title: "Stats that tell the truth",
    text: "Average, high game, strike %, spare conversion, and the pins you keep missing. Filter by league, tournament, or casual play.",
  },
  {
    icon: Swords,
    title: "Ranked seasons",
    text: "An LP rating that climbs and falls with your performance. Ranks, divisions, and a leaderboard — like a competitive ladder, for bowling.",
  },
  {
    icon: Trophy,
    title: "Achievements",
    text: "Clean games, spare streaks, personal bests — earn badges as your game improves.",
  },
  {
    icon: Share2,
    title: "Share cards",
    text: "Drop a session scorecard straight into the group chat and settle the argument.",
  },
  {
    icon: WifiOff,
    title: "Works at the alley",
    text: "Spotty bowling-alley wifi? Sessions save offline and sync when you're back.",
  },
];

const SCREENS = [
  { src: "/marketing/dashboard.png", alt: "Dashboard with rank and stats" },
  { src: "/marketing/leaderboard.png", alt: "Ranked season leaderboard" },
  { src: "/marketing/scorecard.png", alt: "Frame-by-frame scorecard" },
];

function Logo() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 180 180"
      className="h-20 w-auto"
    >
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      <circle cx="90" cy="36" r="10" fill="#e2e8f0" />
      <circle cx="66" cy="68" r="10" fill="#e2e8f0" />
      <circle cx="114" cy="68" r="10" fill="#e2e8f0" />
      <circle cx="42" cy="100" r="10" fill="url(#lg)" />
      <circle cx="90" cy="100" r="10" fill="#e2e8f0" />
      <circle cx="138" cy="100" r="10" fill="#e2e8f0" />
      <circle cx="90" cy="148" r="8" fill="#f59e0b" />
    </svg>
  );
}

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <main className="glow-blue glow-purple min-h-dvh overflow-hidden">
      <div className="relative z-10 mx-auto max-w-5xl px-6 pb-16 pt-14">
        {/* Hero */}
        <div className="flex flex-col items-center text-center">
          <Logo />
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight sm:text-5xl">
            Spare Me<span className="text-gold">?</span>
          </h1>
          <p className="mt-3 max-w-md text-base text-text-secondary">
            Track scores. Chase spares. Climb the ranks. A bowling tracker for
            you and your crew — no ads, no paywall.
          </p>
          <div className="mt-7 flex items-center gap-3">
            <Link
              href="/signup"
              className="rounded-lg bg-gradient-to-r from-blue to-blue-dark px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue/25 active:scale-[0.97]"
            >
              Start Tracking — It&apos;s Free
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-border bg-surface-light px-6 py-3 text-sm font-semibold text-text-primary active:scale-[0.97]"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Screenshots */}
        <div className="mt-14 flex items-start justify-center gap-4 sm:gap-6">
          {SCREENS.map((s, i) => (
            <div
              key={s.src}
              className={`w-full max-w-[220px] overflow-hidden rounded-2xl border border-border-light shadow-2xl shadow-black/50 ${
                i === 1 ? "" : "mt-8 hidden sm:block"
              }`}
            >
              <Image
                src={s.src}
                alt={s.alt}
                width={370}
                height={800}
                priority={i === 1}
                className="w-full"
              />
            </div>
          ))}
        </div>

        {/* Features */}
        <div className="mt-16 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="glass p-5">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue/15">
                <f.icon size={20} className="text-blue" />
              </div>
              <h2 className="mb-1 text-sm font-bold">{f.title}</h2>
              <p className="text-[13px] leading-relaxed text-text-muted">
                {f.text}
              </p>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="glass-strong mt-14 p-8 text-center">
          <h2 className="text-xl font-extrabold">
            Your next game deserves a scorecard
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-text-muted">
            Everything is included for everyone. If Spare Me helps your game, a
            small tip keeps the servers rolling — but the lanes are open either
            way.
          </p>
          <Link
            href="/signup"
            className="mt-5 inline-block rounded-lg bg-gradient-to-r from-blue to-blue-dark px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue/25 active:scale-[0.97]"
          >
            Create Your Account
          </Link>
        </div>

        {/* Footer */}
        <footer className="mt-12 flex items-center justify-center gap-5 text-xs text-text-muted">
          <Link href="/privacy" className="hover:text-text-secondary">
            Privacy
          </Link>
          <Link href="/support" className="hover:text-text-secondary">
            Support the app
          </Link>
          <span>© 2026 Spare Me</span>
        </footer>
      </div>
    </main>
  );
}
