import { createClient } from "@/lib/supabase-browser";
import type { ShotStats } from "./shotStats";
import { thinPath } from "./pathThinning";

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export async function saveTrackedShot(
  stats: ShotStats,
  link?: { sessionId: string; gameNumber?: number; frameNumber?: number },
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "Not signed in" };

  const { error } = await supabase.from("tracked_shots").insert({
    user_id: auth.user.id,
    session_id: link?.sessionId ?? null,
    game_number: link?.gameNumber ?? null,
    frame_number: link?.frameNumber ?? null,
    speed_mph: round1(stats.speedMph),
    release_board: round1(stats.releaseBoard),
    arrows_board: round1(stats.arrowsBoard),
    breakpoint_board: round1(stats.breakpointBoard),
    entry_board: round1(stats.entryBoard),
    // Thin the path to ~60 points max to keep rows small
    path: thinPath(stats.path),
  });
  return { error: error ? error.message : null };
}
