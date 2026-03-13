"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import {
  LogOut,
  Smartphone,
  Star,
  Check,
  Settings,
  X,
  Trophy,
  Zap,
  Sparkles,
  Flame,
  Target,
  Crown,
  Award,
} from "lucide-react";
import type { SessionWithGames } from "@/lib/queries";
import { useToast } from "@/components/Toast";

interface HistorySession {
  id: string;
  session_date: string;
  created_at: string;
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

interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  check: (s: AchievementStats) => boolean;
}

interface AchievementStats {
  highGame: number;
  totalGames: number;
  cleanGames: number;
  maxConsecutiveStrikes: number;
  maxConsecutiveSpares: number;
  has200Game: boolean;
}

const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: "first-200",
    name: "200 Club",
    description: "Score 200+",
    icon: <Trophy size={20} />,
    color: "text-gold",
    bgColor: "bg-gold/10",
    check: (s) => s.has200Game,
  },
  {
    id: "turkey",
    name: "Turkey",
    description: "3 strikes in a row",
    icon: <Zap size={20} />,
    color: "text-green",
    bgColor: "bg-green/10",
    check: (s) => s.maxConsecutiveStrikes >= 3,
  },
  {
    id: "clean-game",
    name: "Clean Game",
    description: "No open frames",
    icon: <Sparkles size={20} />,
    color: "text-blue",
    bgColor: "bg-blue/10",
    check: (s) => s.cleanGames > 0,
  },
  {
    id: "six-pack",
    name: "Six Pack",
    description: "6 strikes in a row",
    icon: <Flame size={20} />,
    color: "text-red",
    bgColor: "bg-red/10",
    check: (s) => s.maxConsecutiveStrikes >= 6,
  },
  {
    id: "perfect",
    name: "Perfect Game",
    description: "Score 300",
    icon: <Crown size={20} />,
    color: "text-gold",
    bgColor: "bg-gold/10",
    check: (s) => s.highGame === 300,
  },
  {
    id: "spare-streak",
    name: "Spare Master",
    description: "5+ consecutive spares",
    icon: <Target size={20} />,
    color: "text-purple",
    bgColor: "bg-purple/10",
    check: (s) => s.maxConsecutiveSpares >= 5,
  },
  {
    id: "century",
    name: "Century Club",
    description: "100+ games logged",
    icon: <Award size={20} />,
    color: "text-pink",
    bgColor: "bg-pink/10",
    check: (s) => s.totalGames >= 100,
  },
];

export default function ProfilePage() {
  const supabase = createClient();
  const router = useRouter();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showInstall, setShowInstall] = useState(false);
  const [sessions, setSessions] = useState<HistorySession[]>([]);
  const [achievementStats, setAchievementStats] =
    useState<AchievementStats | null>(null);

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
        .order("created_at", { ascending: false })) as {
        data: SessionWithGames[] | null;
      };
      if (sessionData) setSessions(sessionData as unknown as HistorySession[]);

      // Fetch achievement stats
      const { data: games } = (await supabase
        .from("games")
        .select("id, total_score, is_clean")
        .eq("user_id", user.id)) as {
        data: { id: string; total_score: number; is_clean: boolean }[] | null;
      };

      const gameIds = games?.map((g) => g.id) ?? [];
      const { data: frames } = (await supabase
        .from("frames")
        .select("game_id, is_strike, spare_converted")
        .in("game_id", gameIds.length > 0 ? gameIds : ["none"])
        .order("frame_number", { ascending: true })) as {
        data:
          | {
              game_id: string;
              is_strike: boolean;
              spare_converted: boolean;
            }[]
          | null;
      };

      const totalGames = games?.length ?? 0;
      const highGame =
        totalGames > 0
          ? Math.max(...(games?.map((g) => g.total_score) ?? [0]))
          : 0;
      const cleanGames = games?.filter((g) => g.is_clean).length ?? 0;
      const has200Game = games?.some((g) => g.total_score >= 200) ?? false;

      // Group frames by game for streak calc
      const byGame: Record<
        string,
        { is_strike: boolean; spare_converted: boolean }[]
      > = {};
      frames?.forEach((f) => {
        if (!byGame[f.game_id]) byGame[f.game_id] = [];
        byGame[f.game_id].push(f);
      });

      let maxStrikes = 0,
        maxSpares = 0;
      for (const gFrames of Object.values(byGame)) {
        let cs = 0,
          cp = 0;
        for (const f of gFrames) {
          if (f.is_strike) {
            cs++;
            maxStrikes = Math.max(maxStrikes, cs);
          } else {
            cs = 0;
          }
          if (f.spare_converted) {
            cp++;
            maxSpares = Math.max(maxSpares, cp);
          } else if (!f.is_strike) {
            cp = 0;
          }
        }
      }

      setAchievementStats({
        highGame,
        totalGames,
        cleanGames,
        maxConsecutiveStrikes: maxStrikes,
        maxConsecutiveSpares: maxSpares,
        has200Game,
      });
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
    toast("Settings saved");
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const earned = achievementStats
    ? ACHIEVEMENTS.filter((a) => a.check(achievementStats))
    : [];
  const locked = achievementStats
    ? ACHIEVEMENTS.filter((a) => !a.check(achievementStats))
    : [];

  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-extrabold">Me</h1>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-light active:scale-90"
        >
          {showSettings ? (
            <X size={18} className="text-text-secondary" />
          ) : (
            <Settings size={18} className="text-text-secondary" />
          )}
        </button>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="animate-slide-down mb-5 flex flex-col gap-3">
          <div className="glass p-4">
            <div className="flex flex-col gap-3">
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
                <label className="mb-1 block text-xs text-text-muted">
                  Email
                </label>
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
            </div>
          </div>

          <button
            onClick={() => setShowInstall(!showInstall)}
            className="glass flex items-center gap-3 p-4 text-left"
          >
            <Smartphone size={20} className="text-blue" />
            <span className="text-sm font-semibold">Install as App</span>
          </button>

          {showInstall && (
            <div className="glass p-4 text-sm text-text-secondary">
              <p className="mb-3 font-semibold text-text-primary">
                Add to your home screen:
              </p>
              <div className="mb-3">
                <p className="mb-1 font-medium">iPhone / iPad (Safari)</p>
                <ol className="ml-4 list-decimal space-y-1 text-xs text-text-muted">
                  <li>
                    Tap{" "}
                    <span className="font-medium text-text-secondary">
                      Share
                    </span>{" "}
                    (square with arrow)
                  </li>
                  <li>
                    Tap{" "}
                    <span className="font-medium text-text-secondary">
                      Add to Home Screen
                    </span>
                  </li>
                </ol>
              </div>
              <div>
                <p className="mb-1 font-medium">Android (Chrome)</p>
                <ol className="ml-4 list-decimal space-y-1 text-xs text-text-muted">
                  <li>
                    Tap{" "}
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
      )}

      {/* Achievements */}
      <div className="mb-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold">Achievements</h2>
          {achievementStats && (
            <span className="text-[10px] text-text-muted">
              {earned.length}/{ACHIEVEMENTS.length}
            </span>
          )}
        </div>

        {/* Earned badges */}
        {earned.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {earned.map((a) => (
              <div
                key={a.id}
                className={`flex items-center gap-2 rounded-xl ${a.bgColor} px-3 py-2`}
              >
                <span className={a.color}>{a.icon}</span>
                <div>
                  <p className="text-[11px] font-bold">{a.name}</p>
                  <p className="text-[9px] text-text-muted">{a.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Locked badges */}
        {locked.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {locked.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-2 rounded-xl bg-surface-light/50 px-3 py-2 opacity-40"
              >
                <span className="text-text-muted">{a.icon}</span>
                <div>
                  <p className="text-[11px] font-bold">{a.name}</p>
                  <p className="text-[9px] text-text-muted">{a.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Game History */}
      <div>
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
                      <span className="ml-1.5 text-[10px] font-normal text-text-muted">
                        {new Date(session.created_at).toLocaleTimeString(
                          "en-US",
                          { hour: "numeric", minute: "2-digit" },
                        )}
                      </span>
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
