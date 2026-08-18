"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { BowlingSpinner } from "@/components/Skeleton";
import ErrorCard from "@/components/ErrorCard";
import BackButton from "@/components/BackButton";
import BallCard from "@/components/arsenal/BallCard";
import { Sparkles, Plus, Ruler, ChevronRight } from "lucide-react";
import type { Ball } from "@/lib/database.types";

export default function ArsenalPage() {
  const supabase = createClient();
  const router = useRouter();
  const [balls, setBalls] = useState<Ball[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    const { data, error: dbError } = await supabase
      .from("balls")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (dbError) {
      setError(true);
    } else {
      setBalls(data ?? []);
    }
    setLoading(false);
  }, [supabase, router]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex min-h-[60dvh] items-center justify-center">
        <BowlingSpinner />
      </div>
    );
  }

  return (
    <div className="animate-fade-in px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <BackButton />
        <h1 className="text-xl font-extrabold text-text-primary">My Arsenal</h1>
      </div>

      {error && <ErrorCard onRetry={load} />}

      {!error && (
        <>
          <div className="mb-6 flex flex-col gap-3">
            {(
              [
                {
                  href: "/arsenal/analyze",
                  icon: <Sparkles size={20} className="text-blue" />,
                  title: "Analyze My Style",
                  sub: "Speed, revs & release → your bowler profile",
                },
                {
                  href: "/arsenal/layout",
                  icon: <Ruler size={20} className="text-gold" />,
                  title: "Get a Layout",
                  sub: "Dual Angle, VLS & 2LS from your saved style",
                },
                {
                  href: "/arsenal/new",
                  icon: <Plus size={20} className="text-purple" />,
                  title: "Add a Ball",
                  sub: "Track specs & drilling for a ball you own",
                },
              ] as const
            ).map((action) => (
              <button
                key={action.href}
                onClick={() => router.push(action.href)}
                className="glass flex w-full items-center gap-3 p-4 text-left transition-all duration-150 active:scale-[0.98]"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-light">
                  {action.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-text-primary">
                    {action.title}
                  </p>
                  <p className="truncate text-xs text-text-muted">
                    {action.sub}
                  </p>
                </div>
                <ChevronRight size={16} className="shrink-0 text-text-muted" />
              </button>
            ))}
          </div>

          {balls.length === 0 ? (
            <div className="glass p-6 text-center">
              <p className="mb-1 text-sm font-bold text-text-primary">
                No balls yet
              </p>
              <p className="text-xs leading-relaxed text-text-muted">
                Analyze your style, get a layout, and save it to your first ball
                — you&apos;ll get a spec sheet you can hand straight to a pro
                shop.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {balls.map((ball) => (
                <BallCard
                  key={ball.id}
                  ball={ball}
                  onClick={() => router.push(`/arsenal/${ball.id}`)}
                />
              ))}
              <button
                onClick={() => router.push("/arsenal/new")}
                className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border-light py-3 text-sm text-text-muted transition-all duration-150 active:scale-[0.98]"
              >
                <Plus size={16} />
                Add a ball
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
