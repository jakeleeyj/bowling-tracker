export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { GameWithSession, FrameRow } from "@/lib/queries";
import DeleteSessionButton from "@/components/DeleteSessionButton";

export default async function GameDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: game } = (await supabase
    .from("games")
    .select("*, sessions(session_date, venue, event_label)")
    .eq("id", id)
    .single()) as { data: GameWithSession | null };

  if (!game) notFound();

  const { data: frames } = (await supabase
    .from("frames")
    .select("*")
    .eq("game_id", id)
    .order("frame_number", { ascending: true })) as { data: FrameRow[] | null };

  const session = game.sessions;

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <Link href="/history" className="text-text-muted">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-base font-bold">
            Game {game.game_number} &mdash; {game.total_score}
          </h1>
          <p className="text-[10px] text-text-muted">
            {new Date(session.session_date).toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
            {session.venue && ` • ${session.venue}`}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-4 flex gap-2">
        <div className="glass flex-1 p-3 text-center">
          <div className="text-[10px] text-text-muted">Strikes</div>
          <div className="text-xl font-extrabold text-green">
            {game.strike_count}
          </div>
        </div>
        <div className="glass flex-1 p-3 text-center">
          <div className="text-[10px] text-text-muted">Spares</div>
          <div className="text-xl font-extrabold text-gold">
            {game.spare_count}
          </div>
        </div>
        <div className="glass flex-1 p-3 text-center">
          <div className="text-[10px] text-text-muted">Clean</div>
          <div className="text-xl font-extrabold">
            {game.is_clean ? "Yes" : "No"}
          </div>
        </div>
      </div>

      {/* Frame breakdown */}
      {frames && frames.length > 0 ? (
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
      ) : (
        <div className="glass p-4 text-center text-sm text-text-muted">
          Quick entry — no frame breakdown available
        </div>
      )}

      {/* Delete */}
      <div className="mt-6">
        <DeleteSessionButton sessionId={game.session_id} />
      </div>
    </div>
  );
}
