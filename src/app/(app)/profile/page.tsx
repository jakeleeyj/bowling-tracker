"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { BowlingSpinner } from "@/components/Skeleton";
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
import { getRank, formatLP, CALIBRATION_GAMES } from "@/lib/ranking";
import type { PlayerLP } from "@/lib/queries";
import SessionCard from "@/components/SessionCard";
import NotificationToggle from "@/components/NotificationToggle";
import AvatarPicker from "@/components/AvatarPicker";
import Avatar from "@/components/Avatar";
import { ACHIEVEMENTS, type AchievementStats } from "@/lib/achievements";
import { getCurrentSeason } from "@/lib/seasons";
import { ChevronDown } from "lucide-react";

const SESSIONS_PER_PAGE = 20;

interface HistoryFrame {
  frame_number: number;
  roll_1: number;
  roll_2: number | null;
  roll_3: number | null;
  is_strike: boolean;
  is_spare: boolean;
  frame_score: number;
  pins_remaining: number[] | null;
  pins_remaining_roll2: number[] | null;
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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showInstall, setShowInstall] = useState(false);
  const [sessions, setSessions] = useState<HistorySession[]>([]);
  const [historyFilter, setHistoryFilter] = useState<"all" | "ytd" | "custom">(
    "all",
  );
  const [historyDateFrom, setHistoryDateFrom] = useState("");
  const [historyDateTo, setHistoryDateTo] = useState("");
  const [achievementStats, setAchievementStats] =
    useState<AchievementStats | null>(null);
  const [lp, setLp] = useState(0);
  const [rank, setRank] = useState<ReturnType<typeof getRank> | null>(null);
  const [statsAvg, setStatsAvg] = useState(0);
  const [statsHigh, setStatsHigh] = useState(0);
  const [statsTotalGames, setStatsTotalGames] = useState(0);
  const [sessionLpChanges, setSessionLpChanges] = useState<
    Record<string, number>
  >({});
  const [seasonResults, setSeasonResults] = useState<
    {
      season_number: number;
      season_name: string;
      final_lp: number;
      final_rank: string;
      final_division: string | null;
    }[]
  >([]);
  const [showAchievements, setShowAchievements] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreSessions, setHasMoreSessions] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        setEmail(user.email ?? "");

        // Parallel fetch: profile, sessions, LP, and achievement stats via RPCs
        const [
          profileResult,
          sessionResult,
          lpResult,
          achieveResult,
          seasonResult,
        ] = await Promise.all([
          supabase
            .from("profiles")
            .select("display_name, avatar_url")
            .eq("id", user.id)
            .single(),
          supabase
            .from("sessions")
            .select("*, games(*, frames(*))")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(SESSIONS_PER_PAGE),
          supabase.rpc("get_player_lp", { p_user_id: user.id }),
          supabase.rpc("get_player_achievement_stats", {
            p_user_id: user.id,
          }),
          supabase
            .from("season_results")
            .select(
              "season_number, season_name, final_lp, final_rank, final_division",
            )
            .eq("user_id", user.id)
            .order("season_number", { ascending: true }),
        ]);

        const profile = profileResult.data as {
          display_name: string;
          avatar_url: string | null;
        } | null;
        if (profile) {
          setDisplayName(profile.display_name);
          setAvatarUrl(profile.avatar_url);
        }

        const sessionData = sessionResult.data as HistorySession[] | null;
        if (sessionData) {
          setSessions(sessionData);
          setHasMoreSessions(sessionData.length === SESSIONS_PER_PAGE);
        }

        // LP and stats from Postgres
        const lpData = (lpResult.data ?? {}) as unknown as PlayerLP;
        const userLp = lpData.lp ?? 0;
        setLp(userLp);
        setRank(getRank(userLp));
        setStatsAvg(lpData.avg ?? 0);
        setStatsHigh(lpData.high ?? 0);
        setStatsTotalGames(lpData.total_games ?? 0);

        // Achievement stats from Postgres
        const achData = (achieveResult.data ??
          {}) as unknown as AchievementStats;
        setAchievementStats(achData);

        // Past season results
        const pastSeasons = (seasonResult.data ?? []) as {
          season_number: number;
          season_name: string;
          final_lp: number;
          final_rank: string;
          final_division: string | null;
        }[];
        setSeasonResults(pastSeasons);

        // Per-session LP deltas via Postgres
        const sessionIds = sessionData?.map((s) => s.id) ?? [];
        if (sessionIds.length > 0) {
          const { data: deltas } = await supabase.rpc("get_session_lp_deltas", {
            p_session_ids: sessionIds,
          });
          setSessionLpChanges((deltas ?? {}) as Record<string, number>);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [supabase]);

  async function handleSave() {
    const trimmed = displayName.trim();
    if (!trimmed) {
      toast("Name can't be empty", "error");
      return;
    }
    if (trimmed.length > 20) {
      toast("Name must be 20 characters or less", "error");
      return;
    }
    setSaving(true);
    setDisplayName(trimmed);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("profiles")
      .update({ display_name: trimmed })
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

  const loadingMoreRef = useRef(false);

  const loadMoreSessions = useCallback(async () => {
    if (loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoadingMore(false);
      loadingMoreRef.current = false;
      return;
    }

    const { data: moreSessions } = (await supabase
      .from("sessions")
      .select("*, games(*, frames(*))")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(sessions.length, sessions.length + SESSIONS_PER_PAGE - 1)) as {
      data: HistorySession[] | null;
    };

    if (moreSessions) {
      setSessions((prev) => [...prev, ...moreSessions]);
      setHasMoreSessions(moreSessions.length === SESSIONS_PER_PAGE);
    } else {
      setHasMoreSessions(false);
    }
    setLoadingMore(false);
    loadingMoreRef.current = false;
  }, [supabase, sessions.length]);

  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!hasMoreSessions) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMoreSessions();
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMoreSessions, loadMoreSessions]);

  const earned = achievementStats
    ? ACHIEVEMENTS.filter((a) => a.check(achievementStats))
    : [];
  const locked = achievementStats
    ? ACHIEVEMENTS.filter((a) => !a.check(achievementStats))
    : [];

  if (loading) {
    return (
      <div>
        <div className="flex flex-col items-center justify-center py-20">
          <BowlingSpinner />
          <p className="mt-3 text-sm text-text-muted">Loading profile...</p>
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
          aria-label={showSettings ? "Close settings" : "Open settings"}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-light transition-transform active:scale-90"
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
              <div className="flex justify-center">
                <AvatarPicker
                  name={displayName || "You"}
                  currentUrl={avatarUrl}
                  onAvatarChange={(url) => {
                    setAvatarUrl(url);
                    toast("Avatar updated");
                  }}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-text-muted">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={20}
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
                  className="w-full rounded-lg border border-border bg-surface-light px-4 py-3 text-base text-text-muted"
                />
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-gradient-to-r from-blue to-blue-dark py-3 text-sm font-bold text-white shadow-lg shadow-blue/25 active:scale-[0.97] disabled:opacity-50"
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
                <p className="text-[10px] text-text-muted">{formatLP(lp)} LP</p>
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

      {/* Quick Stats */}
      {statsTotalGames > 0 && (
        <div className="mb-5 flex gap-2">
          <div className="glass flex-1 p-3 text-center">
            <div className="text-[10px] uppercase tracking-wide text-text-muted">
              Avg
            </div>
            <div className="my-1 text-2xl font-extrabold">{statsAvg}</div>
          </div>
          <div className="glass flex-1 p-3 text-center">
            <div className="text-[10px] uppercase tracking-wide text-text-muted">
              High
            </div>
            <div className="my-1 text-2xl font-extrabold">{statsHigh}</div>
          </div>
          <div className="glass flex-1 p-3 text-center">
            <div className="text-[10px] uppercase tracking-wide text-text-muted">
              Games
            </div>
            <div className="my-1 text-2xl font-extrabold">
              {statsTotalGames}
            </div>
          </div>
        </div>
      )}

      {/* Season Medals */}
      <div className="mb-5">
        <h2 className="mb-2 text-sm font-bold">Rank History</h2>
        <div className="flex flex-wrap gap-1.5">
          {/* Current season — in progress */}
          {rank && statsTotalGames > 0 && (
            <div
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 ${
                statsTotalGames >= CALIBRATION_GAMES
                  ? rank.borderColor
                  : "border-border/30"
              }`}
            >
              <span className="rounded bg-blue/15 px-1.5 py-0.5 text-[9px] font-bold text-blue">
                {getCurrentSeason().shortName}
              </span>
              <span
                className={`text-xs font-bold ${
                  statsTotalGames >= CALIBRATION_GAMES
                    ? rank.color
                    : "text-text-muted"
                }`}
              >
                {statsTotalGames >= CALIBRATION_GAMES
                  ? `${rank.name}${rank.division ? ` ${rank.division}` : ""}`
                  : "Calibrating"}
              </span>
              <span className="text-[9px] text-text-muted">now</span>
            </div>
          )}
          {/* Past seasons */}
          {seasonResults.map((sr) => {
            const srRank = getRank(sr.final_lp);
            return (
              <div
                key={sr.season_number}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 ${srRank.borderColor}`}
              >
                <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] font-bold text-text-muted">
                  S{sr.season_number}
                </span>
                <span className={`text-xs font-bold ${srRank.color}`}>
                  {sr.final_rank}
                  {sr.final_division ? ` ${sr.final_division}` : ""}
                </span>
              </div>
            );
          })}
          {statsTotalGames === 0 && seasonResults.length === 0 && (
            <p className="text-xs text-text-muted">
              Play your first game to start ranking
            </p>
          )}
        </div>
      </div>

      {/* Achievements — collapsible */}
      <div className="mb-5">
        <button
          onClick={() => setShowAchievements(!showAchievements)}
          className="mb-2 flex w-full items-center justify-between"
        >
          <h2 className="text-sm font-bold">Achievements</h2>
          <div className="flex items-center gap-1.5">
            {achievementStats && (
              <span className="text-[10px] text-text-muted">
                {earned.length}/{ACHIEVEMENTS.length}
              </span>
            )}
            <ChevronDown
              size={14}
              className={`text-text-muted transition-transform ${
                showAchievements ? "rotate-180" : ""
              }`}
            />
          </div>
        </button>

        {showAchievements && (
          <div className="flex flex-wrap gap-1.5">
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
        )}
      </div>

      {/* Game History */}
      <div>
        <h2 className="mb-3 text-sm font-bold">Game History</h2>

        {/* Filter pills */}
        <div className="mb-3 flex gap-1.5">
          {(["all", "ytd", "custom"] as const).map((f) => (
            <button
              key={f}
              onClick={() => {
                setHistoryFilter(f);
                if (f === "custom" && !historyDateFrom) {
                  const to = new Date().toISOString().split("T")[0];
                  const from = new Date(Date.now() - 30 * 86400000)
                    .toISOString()
                    .split("T")[0];
                  setHistoryDateFrom(from);
                  setHistoryDateTo(to);
                }
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                historyFilter === f
                  ? "bg-blue text-white"
                  : "bg-surface-light text-text-muted active:bg-surface-light/80"
              }`}
            >
              {f === "all" ? "All" : f === "ytd" ? "YTD" : "Custom"}
            </button>
          ))}
        </div>

        {historyFilter === "custom" && (
          <div className="mb-3 flex items-center gap-2">
            <input
              type="date"
              value={historyDateFrom}
              onChange={(e) => setHistoryDateFrom(e.target.value)}
              className="flex-1 rounded-lg border border-border bg-surface-light px-3 py-2 text-sm text-text-primary outline-none focus:border-blue"
            />
            <span className="text-xs text-text-muted">to</span>
            <input
              type="date"
              value={historyDateTo}
              onChange={(e) => setHistoryDateTo(e.target.value)}
              className="flex-1 rounded-lg border border-border bg-surface-light px-3 py-2 text-sm text-text-primary outline-none focus:border-blue"
            />
          </div>
        )}

        {sessions.length === 0 && historyFilter === "all" && (
          <div className="glass p-8 text-center">
            <p className="text-sm text-text-muted">No sessions yet.</p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {(() => {
            const filtered = sessions.filter((session) => {
              if (historyFilter === "all") return true;
              const date =
                session.session_date ?? session.created_at.split("T")[0];
              if (historyFilter === "ytd") {
                const yearStart = new Date(new Date().getFullYear(), 0, 1)
                  .toISOString()
                  .split("T")[0];
                return date >= yearStart;
              }
              if (
                historyFilter === "custom" &&
                historyDateFrom &&
                historyDateTo
              ) {
                return date >= historyDateFrom && date <= historyDateTo;
              }
              return true;
            });
            if (filtered.length === 0 && historyFilter !== "all") {
              return (
                <div className="glass p-8 text-center">
                  <p className="text-sm text-text-muted">
                    No sessions in this range.
                  </p>
                </div>
              );
            }
            // Track calibration: walk oldest-first to count games chronologically
            const gamesBeforeSession: Record<string, number> = {};
            let running = 0;
            for (const s of [...filtered].reverse()) {
              gamesBeforeSession[s.id] = running;
              running += s.games.length;
            }

            return filtered.map((session) => {
              const sessionGames = [...session.games].sort(
                (a, b) => a.game_number - b.game_number,
              );
              const avg =
                sessionGames.length > 0
                  ? Math.floor(
                      sessionGames.reduce((s, g) => s + g.total_score, 0) /
                        sessionGames.length,
                    )
                  : 0;
              const isCalibrationSession =
                (gamesBeforeSession[session.id] ?? 0) < CALIBRATION_GAMES;

              const createdAt = new Date(session.created_at);
              const dateLabel = createdAt.toLocaleDateString("en-SG", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
                timeZone: "Asia/Singapore",
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
                  avatarUrl={avatarUrl}
                  isOwn
                  isCalibrationSession={isCalibrationSession}
                  lpChange={
                    (achievementStats?.totalGames ?? 0) >= CALIBRATION_GAMES
                      ? sessionLpChanges[session.id]
                      : undefined
                  }
                />
              );
            });
          })()}

          {hasMoreSessions && (
            <div ref={sentinelRef} className="flex justify-center py-4">
              {loadingMore && (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue border-t-transparent" />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
