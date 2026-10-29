"use server";

import { createClient } from "@/lib/supabase-server";
import type { SessionWithGamesFramesAndProfile } from "@/lib/queries";

const PAGE_SIZE = 10;

// Keyset pagination: sessions older than the last one already shown, so a
// session logged meanwhile can't shift the page and duplicate a card.
export async function loadMoreSessions(beforeCreatedAt: string) {
  const supabase = await createClient();

  const { data: sessions } = await supabase
    .from("sessions")
    .select("*, profiles(*), games(*, frames(*))")
    .lt("created_at", beforeCreatedAt)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);

  const typed = (sessions ?? []) as SessionWithGamesFramesAndProfile[];

  // Fetch LP deltas for these sessions
  const sessionIds = typed.map((s) => s.id);
  let lpChanges: Record<string, number> = {};
  if (sessionIds.length > 0) {
    const { data: deltas } = await supabase.rpc("get_session_lp_deltas", {
      p_session_ids: sessionIds,
    });
    lpChanges = (deltas ?? {}) as Record<string, number>;
  }

  return {
    sessions: typed,
    lpChanges,
    hasMore: typed.length === PAGE_SIZE,
  };
}
