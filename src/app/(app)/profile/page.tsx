"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { LogOut, Award, Smartphone, Star, Check } from "lucide-react";
import Link from "next/link";
import type { SessionWithGames } from "@/lib/queries";

interface HistorySession {
  id: string;
  session_date: string;
  venue: string | null;
  event_label: string | null;
  total_pins: number;
  games: {
    id: string;
    game_number: number;
    total_score: number;
    is_clean: boolean;
  }[];
}

export default function ProfilePage() {
  const supabase = createClient();
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showInstall, setShowInstall] = useState(false);
  const [sessions, setSessions] = useState<HistorySession[]>([]);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      setEmail(user.email ?? "");
      const { data: profile } = (await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .single()) as { data: { display_name: string } | null };

      if (profile) setDisplayName(profile.display_name);

      // Fetch history
      const { data: sessionData } = (await supabase
        .from("sessions")
        .select("*, games(id, game_number, total_score, is_clean)")
        .eq("user_id", user.id)
        .order("session_date", { ascending: false })) as {
        data: SessionWithGames[] | null;
      };

      if (sessionData) setSessions(sessionData as unknown as HistorySession[]);
    }
    load();
  }, [supabase]);

  async function handleSave() {
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("profiles")
      .update({ display_name: displayName })
      .eq("id", user.id);

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div>
      <h1 className="mb-6 text-xl font-extrabold">Me</h1>

      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-xs text-text-muted">
            Display Name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface-light px-4 py-3 text-sm text-text-primary outline-none focus:border-blue"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-text-muted">Email</label>
          <input
            type="email"
            value={email}
            disabled
            className="w-full rounded-lg border border-border bg-surface-light px-4 py-3 text-sm text-text-muted"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-gradient-to-r from-blue to-blue-dark py-3 text-sm font-bold shadow-lg shadow-blue/25 active:scale-[0.97] disabled:opacity-50"
        >
          {saved ? "Saved!" : saving ? "Saving..." : "Save Changes"}
        </button>

        <div className="flex gap-2">
          <Link
            href="/achievements"
            className="glass flex flex-1 items-center gap-3 p-4"
          >
            <Award size={20} className="text-gold" />
            <span className="text-sm font-semibold">Achievements</span>
          </Link>

          <button
            onClick={() => setShowInstall(!showInstall)}
            className="glass flex flex-1 items-center gap-3 p-4 text-left"
          >
            <Smartphone size={20} className="text-blue" />
            <span className="text-sm font-semibold">Install App</span>
          </button>
        </div>

        {showInstall && (
          <div className="glass p-4 text-sm text-text-secondary">
            <p className="mb-3 font-semibold text-text-primary">
              Add to your home screen:
            </p>
            <div className="mb-3">
              <p className="mb-1 font-medium">iPhone / iPad (Safari)</p>
              <ol className="ml-4 list-decimal space-y-1 text-xs text-text-muted">
                <li>
                  Tap the{" "}
                  <span className="font-medium text-text-secondary">Share</span>{" "}
                  button (square with arrow)
                </li>
                <li>
                  Scroll down and tap{" "}
                  <span className="font-medium text-text-secondary">
                    Add to Home Screen
                  </span>
                </li>
                <li>
                  Tap{" "}
                  <span className="font-medium text-text-secondary">Add</span>
                </li>
              </ol>
            </div>
            <div>
              <p className="mb-1 font-medium">Android (Chrome)</p>
              <ol className="ml-4 list-decimal space-y-1 text-xs text-text-muted">
                <li>
                  Tap the{" "}
                  <span className="font-medium text-text-secondary">
                    three dots
                  </span>{" "}
                  menu
                </li>
                <li>
                  Tap{" "}
                  <span className="font-medium text-text-secondary">
                    Add to Home screen
                  </span>
                </li>
                <li>
                  Tap{" "}
                  <span className="font-medium text-text-secondary">
                    Install
                  </span>
                </li>
              </ol>
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 rounded-lg border border-red/30 py-3 text-sm font-semibold text-red active:scale-[0.97]"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>

      {/* Game History */}
      <div className="mt-8">
        <h2 className="mb-3 text-sm font-bold">Game History</h2>

        {sessions.length === 0 && (
          <div className="glass p-8 text-center">
            <p className="text-sm text-text-muted">No sessions yet.</p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {sessions.map((session) => {
            const sessionGames = [...session.games].sort(
              (a, b) => a.game_number - b.game_number,
            );
            const avg =
              sessionGames.length > 0
                ? Math.round(
                    sessionGames.reduce((s, g) => s + g.total_score, 0) /
                      sessionGames.length,
                  )
                : 0;
            const highGame = Math.max(
              ...sessionGames.map((g) => g.total_score),
              0,
            );

            return (
              <div key={session.id} className="glass p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <p className="text-[13px] font-bold">
                      {new Date(session.session_date).toLocaleDateString(
                        "en-US",
                        { weekday: "short", month: "short", day: "numeric" },
                      )}
                    </p>
                    <p className="text-[10px] text-text-muted">
                      {session.venue && `${session.venue} \u2022 `}
                      {session.event_label && `${session.event_label} \u2022 `}
                      avg {avg}
                    </p>
                  </div>
                  <div className="text-lg font-extrabold">
                    {session.total_pins}
                  </div>
                </div>

                <div className="flex gap-1">
                  {sessionGames.map((game) => {
                    const isHigh = game.total_score === highGame;
                    const isClean = game.is_clean;

                    return (
                      <div
                        key={game.id}
                        className={`w-14 rounded-md bg-black/30 py-[5px] text-center ${isHigh ? "border border-gold/35" : isClean ? "border border-green/35" : "border border-transparent"}`}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span
                            className={`text-sm font-bold ${isHigh ? "text-gold" : isClean ? "text-green" : ""}`}
                          >
                            {game.total_score}
                          </span>
                          {isHigh && (
                            <Star
                              size={9}
                              className="shrink-0 fill-gold text-gold"
                            />
                          )}
                          {isClean && !isHigh && (
                            <Check
                              size={9}
                              className="shrink-0 text-green"
                              strokeWidth={3}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
