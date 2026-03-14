export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { GameWithSession, FrameRow } from "@/lib/queries";
import DeleteSessionButton from "@/components/DeleteSessionButton";
import FramePinDetail from "@/components/FramePinDetail";
import EditGameScore from "@/components/EditGameScore";
import BackButton from "@/components/BackButton";

export default async function GameDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: game } = (await supabase
    .from("games")
    .select("*, sessions(session_date, venue, event_label, user_id)")
    .eq("id", id)
    .single()) as {
    data:
      | (GameWithSession & {
          sessions: {
            user_id: string;
            session_date: string;
            venue: string | null;
            event_label: string | null;
          };
        })
      | null;
  };

  if (!game) notFound();

  const { data: frames } = (await supabase
    .from("frames")
    .select("*")
    .eq("game_id", id)
    .order("frame_number", { ascending: true })) as { data: FrameRow[] | null };

  const session = game.sessions;
  const isOwn = user?.id === session.user_id;

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <BackButton />
        <div className="flex-1">
          <h1 className="text-lg font-bold">
            Game {game.game_number} &mdash; {game.total_score}
          </h1>
          <p className="text-[10px] text-text-muted">
            {new Date(session.session_date).toLocaleDateString("en-SG", {
              weekday: "short",
              month: "short",
              day: "numeric",
              timeZone: "Asia/Singapore",
            })}
            {session.venue && ` \u2022 ${session.venue}`}
          </p>
        </div>
        {isOwn && (
          <EditGameScore
            gameId={game.id}
            sessionId={game.session_id}
            currentScore={game.total_score}
          />
        )}
      </div>

      {/* Stats */}
      <div className="mb-5 flex gap-2">
        <div className="glass flex-1 p-3 text-center">
          <div className="text-[10px] uppercase tracking-wide text-text-muted">
            Strikes
          </div>
          <div className="text-2xl font-extrabold text-green">
            {game.strike_count}
          </div>
        </div>
        <div className="glass flex-1 p-3 text-center">
          <div className="text-[10px] uppercase tracking-wide text-text-muted">
            Spares
          </div>
          <div className="text-2xl font-extrabold text-gold">
            {game.spare_count}
          </div>
        </div>
        <div className="glass flex-1 p-3 text-center">
          <div className="text-[10px] uppercase tracking-wide text-text-muted">
            Clean
          </div>
          <div className="text-2xl font-extrabold">
            {game.is_clean ? "Yes" : "No"}
          </div>
        </div>
      </div>

      {/* Frame breakdown */}
      {frames && frames.length > 0 ? (
        <>
          <div className="glass overflow-hidden rounded-lg">
            <table className="w-full border-collapse text-center text-[10px]">
              <thead>
                <tr>
                  {frames.map((f) => (
                    <th
                      key={f.frame_number}
                      className="border border-border px-0 py-[3px] font-normal text-text-muted"
                    >
                      {f.frame_number}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="h-[22px]">
                  {frames.map((f) => (
                    <td key={f.frame_number} className="border border-border">
                      <div className="flex justify-around px-[2px] text-[11px]">
                        <span
                          className={
                            f.is_strike
                              ? "font-bold text-green"
                              : "text-text-secondary"
                          }
                        >
                          {f.is_strike ? "X" : f.roll_1.toString()}
                        </span>
                        {f.frame_number < 10 ? (
                          !f.is_strike && (
                            <span
                              className={
                                f.is_spare
                                  ? "font-bold text-gold"
                                  : "text-text-secondary"
                              }
                            >
                              {f.is_spare ? "/" : (f.roll_2?.toString() ?? "")}
                            </span>
                          )
                        ) : (
                          <>
                            <span
                              className={
                                f.roll_2 === 10
                                  ? "font-bold text-green"
                                  : f.is_spare
                                    ? "font-bold text-gold"
                                    : "text-text-secondary"
                              }
                            >
                              {f.roll_2 === 10
                                ? "X"
                                : f.is_spare
                                  ? "/"
                                  : (f.roll_2?.toString() ?? "")}
                            </span>
                            {f.roll_3 !== null && (
                              <span
                                className={
                                  f.roll_3 === 10
                                    ? "font-bold text-green"
                                    : "text-text-secondary"
                                }
                              >
                                {f.roll_3 === 10 ? "X" : f.roll_3}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  ))}
                </tr>
                <tr className="h-[26px]">
                  {frames.map((f) => (
                    <td
                      key={f.frame_number}
                      className="border border-border text-[12px] font-bold"
                    >
                      {f.frame_score}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          {/* Pin leave detail */}
          <div className="mt-2">
            <FramePinDetail frames={frames} />
          </div>
        </>
      ) : (
        <div className="glass p-8 text-center text-sm text-text-muted">
          Quick entry — no frame breakdown available
        </div>
      )}

      {/* Delete */}
      {isOwn && (
        <div className="mt-6">
          <DeleteSessionButton sessionId={game.session_id} />
        </div>
      )}
    </div>
  );
}
