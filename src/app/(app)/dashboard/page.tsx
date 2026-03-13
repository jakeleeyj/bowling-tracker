export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import type {
  ProfileRow,
  SessionWithGamesFramesAndProfile,
} from "@/lib/queries";
import SessionCard from "@/components/SessionCard";

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

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get current user profile
  const { data: profile } = (await supabase
    .from("profiles")
    .select("*")
    .eq("id", user?.id ?? "")
    .single()) as { data: ProfileRow | null };

  // Get user's game stats
  const { data: userGames } = (await supabase
    .from("games")
    .select("total_score")
    .eq("user_id", user?.id ?? "")) as {
    data: { total_score: number }[] | null;
  };

  const totalGames = userGames?.length ?? 0;
  const avgScore =
    totalGames > 0
      ? Math.round(
          (userGames?.reduce((sum, g) => sum + g.total_score, 0) ?? 0) /
            totalGames,
        )
      : 0;
  const highScore =
    totalGames > 0
      ? Math.max(...(userGames?.map((g) => g.total_score) ?? [0]))
      : 0;

  // Get recent sessions with games and profiles
  const { data: sessions } = (await supabase
    .from("sessions")
    .select("*, profiles(*), games(*, frames(*))")
    .order("created_at", { ascending: false })
    .limit(10)) as { data: SessionWithGamesFramesAndProfile[] | null };

  const displayName = profile?.display_name ?? "Bowler";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-[13px] text-text-muted">Welcome back</p>
          <h1 className="text-xl font-extrabold">{displayName}</h1>
        </div>
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${getAvatarGradient(displayName)} text-base font-bold`}
        >
          {initial}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="mb-5 flex gap-2">
        <div className="glass flex-1 p-3 text-center">
          <div className="text-[10px] uppercase tracking-wide text-text-muted">
            Avg
          </div>
          <div className="my-1 text-2xl font-extrabold">{avgScore}</div>
        </div>
        <div className="glass flex-1 p-3 text-center">
          <div className="text-[10px] uppercase tracking-wide text-text-muted">
            High
          </div>
          <div className="my-1 text-2xl font-extrabold">{highScore}</div>
        </div>
        <div className="glass flex-1 p-3 text-center">
          <div className="text-[10px] uppercase tracking-wide text-text-muted">
            Games
          </div>
          <div className="my-1 text-2xl font-extrabold">{totalGames}</div>
          <div className="text-[10px] text-text-muted">all time</div>
        </div>
      </div>

      {/* CTA */}
      <Link
        href="/log"
        className="mb-5 block rounded-xl bg-gradient-to-r from-blue to-blue-dark py-4 text-center text-base font-bold shadow-lg shadow-blue/25 transition-all duration-150 active:scale-[0.97]"
      >
        Log a Session
      </Link>

      {/* Activity Feed */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold">Recent Activity</h2>
        <Link href="/history" className="text-xs text-blue">
          See all
        </Link>
      </div>

      {(!sessions || sessions.length === 0) && (
        <div className="glass p-8 text-center">
          <p className="text-sm text-text-muted">
            No games yet. Log your first session!
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {sessions?.map((session) => {
          const sessionProfile = session.profiles;
          const sessionGames = [...session.games].sort(
            (a, b) => a.game_number - b.game_number,
          );
          const isOwnSession = session.user_id === user?.id;
          const name = isOwnSession
            ? "You"
            : (sessionProfile?.display_name ?? "Unknown");
          const realName = sessionProfile?.display_name ?? "Unknown";
          const avg =
            sessionGames.length > 0
              ? Math.round(
                  sessionGames.reduce((s, g) => s + g.total_score, 0) /
                    sessionGames.length,
                )
              : 0;

          const sessionDate = new Date(session.session_date);
          const today = new Date();
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);

          let dateLabel = sessionDate.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });
          if (sessionDate.toDateString() === today.toDateString())
            dateLabel = "Today";
          if (sessionDate.toDateString() === yesterday.toDateString())
            dateLabel = "Yesterday";

          return (
            <SessionCard
              key={session.id}
              sessionId={session.id}
              name={name}
              realName={realName}
              dateLabel={dateLabel}
              avg={avg}
              totalPins={session.total_pins}
              venue={session.venue}
              eventLabel={session.event_label}
              games={sessionGames}
              avatarGradient={getAvatarGradient(realName)}
              isOwn={isOwnSession}
            />
          );
        })}
      </div>
    </div>
  );
}
