export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { GameWithSession, FrameRow } from "@/lib/queries";
import DeleteSessionButton from "@/components/DeleteSessionButton";
import FramePinDetail from "@/components/FramePinDetail";
import EditGameScore from "@/components/EditGameScore";
import BackButton from "@/components/BackButton";
import { isSplit } from "@/lib/bowling";

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
          <h1 className="text-lg font-semibold tabular-nums">
            Game {game.game_number}: {game.total_score}
          </h1>
          <p className="text-[11px] text-text-muted">
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
        <div className="glass flex-1 px-3 py-3.5 text-center">
          <div className="text-[11px] font-semibold text-text-muted">
            Strikes
          </div>
          <div className="mt-1.5 text-2xl leading-none font-extrabold tabular-nums text-strike">
            {game.strike_count}
          </div>
        </div>
        <div className="glass flex-1 px-3 py-3.5 text-center">
          <div className="text-[11px] font-semibold text-text-muted">
            Spares
          </div>
          <div className="mt-1.5 text-2xl leading-none font-extrabold tabular-nums text-spare">
            {game.spare_count}
          </div>
        </div>
        <div className="glass flex-1 px-3 py-3.5 text-center">
          <div className="text-[11px] font-semibold text-text-muted">
            Clean
          </div>
          <div className="mt-1.5 text-2xl leading-none font-extrabold tabular-nums">
            {game.is_clean ? "Yes" : "No"}
          </div>
        </div>
      </div>

      {/* Frame breakdown */}
      {frames && frames.length > 0 ? (
        <>
          <div className="glass overflow-hidden rounded-lg">
            <table className="w-full border-collapse text-center text-[11px] tabular-nums">
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
                              ? "font-semibold text-strike"
                              : "text-text-secondary"
                          }
                        >
                          {f.is_strike
                            ? "X"
                            : f.roll_1 === 0
                              ? "-"
                              : f.roll_1.toString()}
                        </span>
                        {f.frame_number < 10 ? (
                          !f.is_strike && (
                            <span
                              className={
                                f.is_spare
                                  ? "font-semibold text-spare"
                                  : "text-text-secondary"
                              }
                            >
                              {f.is_spare
                                ? "/"
                                : f.roll_2 === 0
                                  ? "-"
                                  : (f.roll_2?.toString() ?? "")}
                            </span>
                          )
                        ) : (
                          <>
                            <span
                              className={
                                f.roll_1 === 10 && f.roll_2 === 10
                                  ? "font-semibold text-strike"
                                  : f.is_spare && f.roll_1 !== 10
                                    ? "font-semibold text-spare"
                                    : "text-text-secondary"
                              }
                            >
                              {f.roll_1 === 10 && f.roll_2 === 10
                                ? "X"
                                : f.is_spare && f.roll_1 !== 10
                                  ? "/"
                                  : f.roll_2 === 0
                                    ? "-"
                                    : (f.roll_2?.toString() ?? "")}
                            </span>
                            {f.roll_3 !== null && (
                              <span
                                className={
                                  f.roll_3 === 10 &&
                                  !(
                                    f.roll_1 === 10 &&
                                    f.roll_2 !== null &&
                                    f.roll_2 !== 10
                                  )
                                    ? "font-semibold text-strike"
                                    : f.roll_1 === 10 &&
                                        f.roll_2 !== null &&
                                        f.roll_2 !== 10 &&
                                        f.roll_2 + f.roll_3 === 10 &&
                                        f.pins_remaining !== null &&
                                        isSplit(f.pins_remaining)
                                      ? "font-semibold text-red"
                                      : f.roll_1 === 10 &&
                                          f.roll_2 !== null &&
                                          f.roll_2 !== 10 &&
                                          f.roll_2 + f.roll_3 === 10
                                        ? "font-semibold text-spare"
                                        : "text-text-secondary"
                                }
                              >
                                {f.roll_3 === 10 &&
                                !(
                                  f.roll_1 === 10 &&
                                  f.roll_2 !== null &&
                                  f.roll_2 !== 10
                                )
                                  ? "X"
                                  : f.roll_1 === 10 &&
                                      f.roll_2 !== null &&
                                      f.roll_2 !== 10 &&
                                      f.roll_2 + f.roll_3 === 10
                                    ? "/"
                                    : f.roll_3 === 0
                                      ? "-"
                                      : f.roll_3}
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
                      className="border border-border text-xs font-semibold"
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
        <div className="glass flex flex-col items-center px-6 py-10 text-center">
          <p className="text-sm font-semibold">Quick entry</p>
          <p className="mt-1 text-xs text-text-muted">No frame breakdown.</p>
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
