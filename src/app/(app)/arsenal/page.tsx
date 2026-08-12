"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { BowlingSpinner } from "@/components/Skeleton";
import ErrorCard from "@/components/ErrorCard";
import BackButton from "@/components/BackButton";
import BallCard from "@/components/arsenal/BallCard";
import { Sparkles, Plus } from "lucide-react";
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
          <button
            onClick={() => router.push("/arsenal/analyze")}
            className="mb-6 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue to-blue-dark py-3 text-sm font-bold text-white shadow-lg shadow-blue/25 transition-all duration-150 active:scale-[0.97]"
          >
            <Sparkles size={16} />
            Analyze My Style
          </button>

          {balls.length === 0 ? (
            <div className="glass rounded-xl p-6 text-center">
              <p className="mb-1 text-sm font-bold text-text-primary">
                No balls yet
              </p>
              <p className="text-xs leading-relaxed text-text-muted">
                Analyze your style to find your ideal drilling layout, then save
                it to your first ball. You&apos;ll get a spec sheet you can hand
                straight to a pro shop.
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
                onClick={() => router.push("/arsenal/analyze")}
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
