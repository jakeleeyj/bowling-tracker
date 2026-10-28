export const revalidate = 300;

import { createClient } from "@/lib/supabase-server";
import {
  Trophy,
  Zap,
  Sparkles,
  Flame,
  Target,
  Crown,
  Award,
} from "lucide-react";
import { ACHIEVEMENTS, type AchievementStats } from "@/lib/achievements";

const ACHIEVEMENT_ICONS: Record<string, React.ReactNode> = {
  Trophy: <Trophy size={24} />,
  Zap: <Zap size={24} />,
  Sparkles: <Sparkles size={24} />,
  Flame: <Flame size={24} />,
  Target: <Target size={24} />,
  Crown: <Crown size={24} />,
  Award: <Award size={24} />,
};

export default async function AchievementsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: statsData } = await supabase.rpc(
    "get_player_achievement_stats",
    { p_user_id: user?.id ?? "" },
  );
  const stats = (statsData ?? {}) as unknown as AchievementStats;

  const earned = ACHIEVEMENTS.filter((a) => a.check(stats));
  const locked = ACHIEVEMENTS.filter((a) => !a.check(stats));

  return (
    <div>
      <h1 className="mb-2 text-xl font-extrabold">Achievements</h1>
      <p className="mb-5 text-sm text-text-muted tabular-nums">
        {earned.length}/{ACHIEVEMENTS.length} unlocked
      </p>

      {stats.totalGames === 0 && (
        <div className="glass mb-6 flex flex-col items-center px-6 py-10 text-center">
          <p className="text-sm font-semibold">No achievements yet</p>
          <p className="mt-1 text-xs text-text-muted">
            Log a game to start earning them
          </p>
        </div>
      )}

      {earned.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-sm font-bold">Earned</h2>
          <ul className="flex flex-col gap-2">
            {earned.map((a) => (
              <li key={a.id} className="glass flex items-center gap-4 p-4">
                <div className={`shrink-0 ${a.color}`}>
                  {ACHIEVEMENT_ICONS[a.iconName]}
                </div>
                <div>
                  <p className="text-sm font-bold">{a.name}</p>
                  <p className="text-[11px] text-text-muted">{a.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {locked.length > 0 && (
        <>
          <h2 className="mb-3 text-sm font-bold">Locked</h2>
          <ul className="flex flex-col gap-2">
            {locked.map((a) => (
              <li
                key={a.id}
                className="glass flex items-center gap-4 p-4 opacity-40"
              >
                <div className="shrink-0 text-text-muted">
                  {ACHIEVEMENT_ICONS[a.iconName]}
                </div>
                <div>
                  <p className="text-sm font-bold">{a.name}</p>
                  <p className="text-[11px] text-text-muted">{a.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
