"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import {
  LogOut,
  Smartphone,
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
import { useToast } from "@/components/Toast";
import ErrorCard from "@/components/ErrorCard";
import {
  calculateMMR,
  getRank,
  formatMMR,
  getEventWeight,
  CALIBRATION_GAMES,
} from "@/lib/ranking";
import SessionCard from "@/components/SessionCard";
import NotificationToggle from "@/components/NotificationToggle";
import {
  ACHIEVEMENTS,
  computeAchievementStats,
  type AchievementStats,
} from "@/lib/achievements";

interface HistoryFrame {
  frame_number: number;
  roll_1: number;
  roll_2: number | null;
  roll_3: number | null;
  is_strike: boolean;
  is_spare: boolean;
  frame_score: number;
  pins_remaining: number[] | null;
}

interface HistoryGame {
  id: string;
  game_number: number;
  total_score: number;
  is_clean: boolean;
  entry_type: string;
  strike_count: number;
  spare_count: number;
  frames: HistoryFrame[];
}

interface HistorySession {
  id: string;
  session_date: string;
  created_at: string;
  venue: string | null;
  event_label: string | null;
  total_pins: number;
  games: HistoryGame[];
}

const AVATAR_GRADIENTS = [
  "from-blue to-indigo-500",
  "from-purple to-fuchsia-500",
  "from-pink to-rose-500",
  "from-green to-emerald-500",
  "from-gold to-orange-500",
  "from-cyan-500 to-blue",
];

function getAvatarGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

const ACHIEVEMENT_ICONS: Record<string, React.ReactNode> = {
  Trophy: <Trophy size={14} />,
  Zap: <Zap size={14} />,
  Sparkles: <Sparkles size={14} />,
  Flame: <Flame size={14} />,
  Target: <Target size={14} />,
  Crown: <Crown size={14} />,
  Award: <Award size={14} />,
};

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
  const [mmr, setMmr] = useState(0);
  const [rank, setRank] = useState<ReturnType<typeof getRank> | null>(null);
  const [sessionMmrChanges, setSessionMmrChanges] = useState<
    Record<string, number>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function load() {
      try {
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

        // Fetch history with full frame data for SessionCard
        const { data: sessionData } = (await supabase
          .from("sessions")
          .select("*, games(*, frames(*))")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })) as {
          data: HistorySession[] | null;
        };
        if (sessionData) setSessions(sessionData);

        // Fetch achievement stats + MMR
        const { data: games } = (await supabase
          .from("games")
          .select(
            "id, total_score, is_clean, strike_count, spare_count, session_id, sessions(event_label)",
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })) as {
          data:
            | {
                id: string;
                total_score: number;
                is_clean: boolean;
                strike_count: number;
                spare_count: number;
                session_id: string;
                sessions: { event_label: string | null } | null;
              }[]
            | null;
        };

        // Calculate MMR (games already ordered newest-first)
        const scores = games?.map((g) => g.total_score) ?? [];
        const weights =
          games?.map((g) => getEventWeight(g.sessions?.event_label ?? null)) ??
          [];
        const userMmr = calculateMMR(scores, weights);
        setMmr(userMmr);
        setRank(getRank(userMmr));

        // Per-session MMR change
        const mmrMap: Record<string, number> = {};
        if (games && games.length > 0) {
          const sessionGameIndices: Record<string, number[]> = {};
          games.forEach((g, i) => {
            if (!sessionGameIndices[g.session_id])
              sessionGameIndices[g.session_id] = [];
            sessionGameIndices[g.session_id].push(i);
          });
          for (const [sid, indices] of Object.entries(sessionGameIndices)) {
            const scoresWithout = scores.filter((_, i) => !indices.includes(i));
            const weightsWithout = weights.filter(
              (_, i) => !indices.includes(i),
            );
            const mmrWithout =
              scoresWithout.length > 0
                ? calculateMMR(scoresWithout, weightsWithout)
                : 0;
            mmrMap[sid] = userMmr - mmrWithout;
          }
        }
        setSessionMmrChanges(mmrMap);

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

        setAchievementStats(
          computeAchievementStats(games ?? [], frames ?? [], gameIds),
        );
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
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

  if (loading) {
    return (
      <div>
        <div className="mb-5 flex items-center justify-between">
          <div className="h-6 w-12 animate-pulse rounded-lg bg-white/[0.06]" />
          <div className="h-9 w-9 animate-pulse rounded-full bg-white/[0.06]" />
        </div>
        <div className="glass mb-5 h-16 animate-pulse" />
        <div className="mb-5 flex flex-wrap gap-1.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-7 w-24 animate-pulse rounded-full bg-white/[0.06]"
            />
          ))}
        </div>
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass h-24 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className="mb-5 text-xl font-extrabold">Me</h1>
        <ErrorCard
          message="Failed to load profile"
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

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
                  className="w-full rounded-lg border border-border bg-surface-light px-4 py-3 text-base text-text-primary outline-none focus:border-blue"
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

          <NotificationToggle />

          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 rounded-lg border border-red/30 py-3 text-sm font-semibold text-red active:scale-[0.97]"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      )}

      {/* Rank Card */}
      {rank && (achievementStats?.totalGames ?? 0) > 0 && (
        <div
          className={`glass mb-5 flex items-center gap-3 border p-3 ${(achievementStats?.totalGames ?? 0) >= CALIBRATION_GAMES ? rank.borderColor : "border-border/30"}`}
        >
          <div className="flex h-10 w-10 items-center justify-center">
            <svg width={24} height={24} viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L3 7v5c0 5.25 3.83 10.15 9 11.25C17.17 22.15 21 17.25 21 12V7L12 2z"
                fill="currentColor"
                fillOpacity={0.15}
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinejoin="round"
                className={
                  (achievementStats?.totalGames ?? 0) >= CALIBRATION_GAMES
                    ? rank.color
                    : "text-text-muted"
                }
              />
              <path
                d="M12 7l3 5-3 5-3-5z"
                fill="currentColor"
                fillOpacity={0.4}
                stroke="currentColor"
                strokeWidth={0.75}
                className={
                  (achievementStats?.totalGames ?? 0) >= CALIBRATION_GAMES
                    ? rank.color
                    : "text-text-muted"
                }
              />
            </svg>
          </div>
          <div className="flex-1">
            {(achievementStats?.totalGames ?? 0) >= CALIBRATION_GAMES ? (
              <>
                <span className={`text-sm font-extrabold ${rank.color}`}>
                  {rank.name}
                  {rank.division ? ` ${rank.division}` : ""}
                </span>
                <p className="text-[10px] text-text-muted">
                  {formatMMR(mmr)} MMR
                </p>
              </>
            ) : (
              <>
                <span className="text-sm font-extrabold text-text-muted">
                  Calibrating
                </span>
                <p className="text-[10px] text-text-muted">
                  {CALIBRATION_GAMES - (achievementStats?.totalGames ?? 0)} more
                  game
                  {CALIBRATION_GAMES - (achievementStats?.totalGames ?? 0) !== 1
                    ? "s"
                    : ""}{" "}
                  to rank
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Achievements */}
      <div className="mb-5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-bold">Achievements</h2>
          {achievementStats && (
            <span className="text-[10px] text-text-muted">
              {earned.length}/{ACHIEVEMENTS.length}
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {/* Earned badges */}
          {earned.map((a) => (
            <div
              key={a.id}
              className={`flex items-center gap-1.5 rounded-full ${a.bgColor} px-2.5 py-1`}
              title={a.description}
            >
              <span className={a.color}>{ACHIEVEMENT_ICONS[a.iconName]}</span>
              <span className="text-[10px] font-semibold">{a.name}</span>
            </div>
          ))}
          {/* Locked badges */}
          {locked.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-1.5 rounded-full bg-surface-light/50 px-2.5 py-1 opacity-30"
              title={a.description}
            >
              <span className="text-text-muted">
                {ACHIEVEMENT_ICONS[a.iconName]}
              </span>
              <span className="text-[10px] font-semibold">{a.name}</span>
            </div>
          ))}
        </div>
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

            const createdAt = new Date(session.created_at);
            const dateLabel = createdAt.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            });

            return (
              <SessionCard
                key={session.id}
                sessionId={session.id}
                name="You"
                realName={displayName || "You"}
                dateLabel={dateLabel}
                avg={avg}
                totalPins={session.total_pins}
                venue={session.venue}
                eventLabel={session.event_label}
                games={sessionGames}
                avatarGradient={getAvatarGradient(displayName || "You")}
                isOwn
                mmrChange={
                  (achievementStats?.totalGames ?? 0) >= CALIBRATION_GAMES
                    ? sessionMmrChanges[session.id]
                    : undefined
                }
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
