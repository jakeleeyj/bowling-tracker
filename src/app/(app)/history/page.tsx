import { createClient } from "@/lib/supabase-server";
import { Star, Check } from "lucide-react";
import Link from "next/link";
import type { SessionWithGames } from "@/lib/queries";

export default async function HistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: sessions } = (await supabase
    .from("sessions")
    .select("*, games(*)")
    .eq("user_id", user?.id ?? "")
    .order("session_date", { ascending: false })) as {
    data: SessionWithGames[] | null;
  };

  return (
    <div>
      <h1 className="mb-6 text-xl font-extrabold">Game History</h1>

      {(!sessions || sessions.length === 0) && (
        <div className="glass p-8 text-center">
          <p className="text-sm text-text-muted">No sessions yet.</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {sessions?.map((session) => {
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
            <div key={session.id} className="glass p-4">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold">
                    {new Date(session.session_date).toLocaleDateString(
                      "en-US",
                      { weekday: "short", month: "short", day: "numeric" },
                    )}
                  </p>
                  <p className="text-[10px] text-text-muted">
                    {session.venue && `${session.venue} • `}
                    {session.event_label && `${session.event_label} • `}
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
                    <Link
                      key={game.id}
                      href={`/game/${game.id}`}
                      className={`flex-1 rounded-md bg-black/30 py-[5px] text-center transition-colors hover:bg-black/50 ${isHigh ? "border border-gold/35" : isClean ? "border border-green/35" : "border border-transparent"}`}
                    >
                      <div className="relative inline-block">
                        {isHigh && (
                          <Star
                            size={8}
                            className="absolute -right-2.5 -top-1 fill-gold text-gold"
                          />
                        )}
                        {isClean && !isHigh && (
                          <Check
                            size={8}
                            className="absolute -right-2.5 -top-1 text-green"
                            strokeWidth={3}
                          />
                        )}
                        <span
                          className={`text-sm font-bold ${isHigh ? "text-gold" : isClean ? "text-green" : ""}`}
                        >
                          {game.total_score}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
