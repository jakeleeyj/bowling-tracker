"use server";

import { createClient } from "@/lib/supabase-server";
import type { SessionWithGamesFramesAndProfile } from "@/lib/queries";

const PAGE_SIZE = 10;

export async function loadMoreSessions(offset: number) {
  const supabase = await createClient();

  const { data: sessions } = await supabase
    .from("sessions")
    .select("*, profiles(*), games(*, frames(*))")
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

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
