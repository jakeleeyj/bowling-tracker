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
        <h1 className="text-xl font-extrabold text-text-primary">My arsenal</h1>
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
                  title: "Analyze my style",
                  sub: "Speed, revs and release for your bowler profile",
                },
                {
                  href: "/arsenal/layout",
                  icon: <Ruler size={20} className="text-gold" />,
                  title: "Get a layout",
                  sub: "Dual Angle, VLS & 2LS from your saved style",
                },
                {
                  href: "/arsenal/new",
                  icon: <Plus size={20} className="text-purple" />,
                  title: "Add a ball",
                  sub: "Track specs & drilling for a ball you own",
                },
              ] as const
            ).map((action) => (
              <button
                key={action.href}
                onClick={() => router.push(action.href)}
                className="glass flex w-full items-center gap-3 p-4 text-left transition-[transform,background-color] duration-150 ease-out active:scale-[0.98] active:bg-white/5"
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
            <div className="glass flex flex-col items-center px-6 py-10 text-center">
              <p className="text-sm font-semibold text-text-primary">
                No balls yet
              </p>
              <p className="mt-1 text-xs text-text-muted">
                Save a layout to a ball to get a spec sheet for your pro shop.
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
                className="flex h-11 items-center justify-center gap-2 rounded-xl border border-dashed border-border-light text-sm text-text-muted transition-[transform,background-color] duration-150 active:scale-[0.97] active:bg-white/5"
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
